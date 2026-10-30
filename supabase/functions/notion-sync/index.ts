// Sincronizza le spese tra Jarvis (Supabase) e i database mensili di Notion (Soldi / Budgeting / <anno> / <Mese>).
// Mese finanziario: dal 27 al 26, chiamato con il mese in cui finisce (es. "Novembre 2026" = 27 ott – 26 nov).
// verify_jwt = false. Accesso: JWT del proprietario (dall'app) oppure header x-ingest-token (GitHub Actions).
// Segreto: NOTION_TOKEN = token di un'integrazione interna Notion con accesso alla pagina "Budgeting".
// Azioni (body.action): status · sync (default) · archive { pageId }.
import { admin, env } from '../_shared/google.ts';

const OWNER_EMAIL = 'davsorm@gmail.com';
const BUDGETING_ID = '91d155375a2c4515870b57efc3256b72';
const NOTION_VERSION = '2022-06-28';
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const DEFAULT_CATEGORIES = ['Cibo', 'Spesa', 'Benza', 'Auto', 'Shopping', 'Abbonamenti', 'Salute', 'Esperienze', 'Fun', 'Cinema', 'Formazione',
  'Università', 'Regali', 'Home', 'Lavanderia', 'Burocrazie', 'Svapo', 'Yugi', 'Giorgia', 'Investimenti', 'Entrate'];
const TIME_BUDGET_MS = 110_000;

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, x-ingest-token',
  'access-control-allow-methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// deno-lint-ignore no-explicit-any
type Any = any;

async function notion(path: string, method = 'GET', body?: unknown, attempt = 0): Promise<Any> {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: { authorization: `Bearer ${env('NOTION_TOKEN')}`, 'notion-version': NOTION_VERSION, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 429 && attempt < 4) { await sleep(1000 * (attempt + 1)); return notion(path, method, body, attempt + 1); }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.message || `Notion ${res.status}`), { status: res.status, code: data?.code });
  return data;
}

async function children(blockId: string): Promise<Any[]> {
  const out: Any[] = [];
  let cursor: string | undefined;
  do {
    const r = await notion(`/blocks/${blockId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`);
    out.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return out;
}

const pad = (n: number) => String(n).padStart(2, '0');
const romeDate = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
function financialKey(d: Date) {
  const [y, m, day] = d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' }).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + (day >= 27 ? 1 : 0), 1));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`;
}
const prevKey = (key: string) => { const [y, m] = key.split('-').map(Number); const d = new Date(Date.UTC(y, m - 2, 1)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`; };
const keyTitle = (key: string) => { const [y, m] = key.split('-').map(Number); return { month: MESI[m - 1], year: String(y), full: `${MESI[m - 1]} ${y}` }; };
const monthIndex = (title: string) => MESI.findIndex((m) => title.trim().toLowerCase().startsWith(m.toLowerCase()));

// Proprietà del database (nomi variabili tra i mesi: si cercano per tipo).
const schemaCache = new Map<string, Any>();
async function schemaOf(dbId: string) {
  if (schemaCache.has(dbId)) return schemaCache.get(dbId);
  const db = await notion(`/databases/${dbId}`);
  const props = Object.entries(db.properties) as [string, Any][];
  const find = (type: string) => props.find(([, p]) => p.type === type)?.[0];
  const s = { title: find('title'), date: find('date'), number: find('number'), cats: find('multi_select') || find('select'), catsType: find('multi_select') ? 'multi_select' : 'select', raw: db.properties };
  schemaCache.set(dbId, s);
  return s;
}

type Ctx = { db: ReturnType<typeof admin>; userId: string; started: number };

// Trova i database mensili sotto Budgeting e li registra in notion_months.
async function discover(ctx: Ctx) {
  const found: { month_key: string; title: string; page_id: string; database_id: string }[] = [];
  for (const yb of await children(BUDGETING_ID)) {
    if (yb.type !== 'child_page' || !/^\d{4}$/.test(yb.child_page.title.trim())) continue;
    const year = yb.child_page.title.trim();
    for (const mb of await children(yb.id)) {
      if (mb.type !== 'child_page') continue;
      const mi = monthIndex(mb.child_page.title);
      if (mi < 0) continue;
      // Il database può essere direttamente nella pagina del mese o un livello sotto.
      let dbBlock: Any = null;
      const level1 = await children(mb.id);
      dbBlock = level1.find((b) => b.type === 'child_database');
      if (!dbBlock) for (const b of level1.filter((x) => x.type === 'child_page')) { dbBlock = (await children(b.id)).find((x) => x.type === 'child_database'); if (dbBlock) break; }
      if (!dbBlock) continue;
      found.push({ month_key: `${year}-${pad(mi + 1)}`, title: `${MESI[mi]} ${year}`, page_id: mb.id, database_id: dbBlock.id });
    }
  }
  if (found.length) await ctx.db.from('notion_months').upsert(found.map((f) => ({ ...f, user_id: ctx.userId })), { onConflict: 'user_id,month_key', ignoreDuplicates: true });
  return found.length;
}

async function monthRow(ctx: Ctx, key: string) {
  const { data } = await ctx.db.from('notion_months').select('*').eq('user_id', ctx.userId).eq('month_key', key).maybeSingle();
  return data;
}

// Crea (se manca) la pagina del mese e il suo database, con lo stesso schema dei mesi precedenti.
async function ensureMonth(ctx: Ctx, key: string) {
  const existing = await monthRow(ctx, key);
  if (existing) return existing;
  const t = keyTitle(key);
  let yearPage = (await children(BUDGETING_ID)).find((b) => b.type === 'child_page' && b.child_page.title.trim() === t.year);
  if (!yearPage) {
    const p = await notion('/pages', 'POST', { parent: { page_id: BUDGETING_ID }, properties: { title: { title: [{ text: { content: t.year } }] } } });
    yearPage = { id: p.id };
  }
  let monthPage = (await children(yearPage.id)).find((b) => b.type === 'child_page' && monthIndex(b.child_page.title) === MESI.indexOf(t.month));
  if (!monthPage) {
    const p = await notion('/pages', 'POST', { parent: { page_id: yearPage.id }, properties: { title: { title: [{ text: { content: t.month } }] } } });
    monthPage = { id: p.id };
  }
  let dbBlock = (await children(monthPage.id)).find((b) => b.type === 'child_database');
  if (!dbBlock) {
    // Opzioni delle categorie copiate dall'ultimo mese conosciuto.
    const { data: last } = await ctx.db.from('notion_months').select('database_id').eq('user_id', ctx.userId).lt('month_key', key).order('month_key', { ascending: false }).limit(1).maybeSingle();
    let options = DEFAULT_CATEGORIES.map((name) => ({ name }));
    if (last) {
      try { const s = await schemaOf(last.database_id); const o = s.raw[s.cats]?.[s.catsType]?.options; if (o?.length) options = o.map((x: Any) => ({ name: x.name, color: x.color })); } catch { /* default */ }
    }
    const created = await notion('/databases', 'POST', {
      parent: { type: 'page_id', page_id: monthPage.id },
      is_inline: true,
      title: [{ type: 'text', text: { content: t.full } }],
      properties: {
        Motivo: { title: {} },
        Date: { date: {} },
        euro: { number: { format: 'euro' } },
        Category: { multi_select: { options } }
      }
    });
    dbBlock = { id: created.id };
  }
  const row = { user_id: ctx.userId, month_key: key, title: t.full, page_id: monthPage.id, database_id: dbBlock.id };
  await ctx.db.from('notion_months').upsert(row, { onConflict: 'user_id,month_key' });
  return row;
}

// Invia a Notion le spese inserite in Jarvis non ancora inviate.
async function push(ctx: Ctx) {
  const { data: rows } = await ctx.db.from('expenses').select('*').eq('user_id', ctx.userId).eq('source', 'jarvis').is('notion_page_id', null).order('spent_at').limit(200);
  let n = 0;
  for (const e of rows || []) {
    if (Date.now() - ctx.started > TIME_BUDGET_MS) break;
    const m = await ensureMonth(ctx, e.month_key || financialKey(new Date(e.spent_at)));
    const s = await schemaOf(m.database_id);
    const props: Any = {};
    if (s.title) props[s.title] = { title: [{ text: { content: e.description } }] };
    if (s.date) props[s.date] = { date: { start: romeDate(e.spent_at) } };
    if (s.number) props[s.number] = { number: (e.direction === 'in' ? 1 : -1) * Number(e.amount) };
    if (s.cats) props[s.cats] = s.catsType === 'multi_select' ? { multi_select: [{ name: e.category }] } : { select: { name: e.category } };
    const page = await notion('/pages', 'POST', { parent: { database_id: m.database_id }, properties: props });
    await ctx.db.from('expenses').update({ notion_page_id: page.id, sent_to_notion_at: new Date().toISOString(), month_key: m.month_key }).eq('id', e.id);
    n++;
  }
  return n;
}

const plain = (rt: Any[]) => (rt || []).map((x: Any) => x.plain_text).join('').trim();

// Importa (o aggiorna) le righe di un mese da Notion. Notion è la fonte per le righe già sincronizzate.
async function importMonth(ctx: Ctx, m: { month_key: string; database_id: string }) {
  const s = await schemaOf(m.database_id);
  const pages: Any[] = [];
  let cursor: string | undefined;
  do {
    const r = await notion(`/databases/${m.database_id}/query`, 'POST', { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) });
    pages.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);

  const parsed = pages.map((p) => {
    const pr = p.properties;
    const num = s.number ? pr[s.number]?.number : null;
    const catVal = s.cats ? (s.catsType === 'multi_select' ? pr[s.cats]?.multi_select?.[0]?.name : pr[s.cats]?.select?.name) : null;
    const date = s.date ? pr[s.date]?.date?.start : null;
    return { id: p.id, title: s.title ? plain(pr[s.title]?.title) : '', num, cat: catVal || 'Da categorizzare', date: date || p.created_time };
  }).filter((x) => typeof x.num === 'number' && x.num !== 0);
  const hasNegatives = parsed.some((x) => x.num < 0);

  const { data: existing } = await ctx.db.from('expenses').select('id, notion_page_id, source').eq('user_id', ctx.userId).eq('month_key', m.month_key).not('notion_page_id', 'is', null);
  const known = new Map((existing || []).map((r: Any) => [r.notion_page_id, r]));
  const seen = new Set<string>();
  const inserts: Any[] = [];
  for (const x of parsed) {
    seen.add(x.id);
    const direction = hasNegatives ? (x.num > 0 ? 'in' : 'out') : (x.cat === 'Entrate' ? 'in' : 'out');
    const fields = {
      description: x.title || '(senza nome)',
      amount: Math.abs(x.num),
      category: x.cat,
      direction,
      spent_at: x.date.length === 10 ? `${x.date}T12:00:00Z` : x.date,
      month_key: m.month_key
    };
    const k = known.get(x.id);
    if (k) await ctx.db.from('expenses').update(fields).eq('id', k.id);
    else inserts.push({ ...fields, user_id: ctx.userId, notion_page_id: x.id, source: 'notion', method: 'notion', sent_to_notion_at: new Date().toISOString() });
  }
  for (let i = 0; i < inserts.length; i += 200) {
    const { error } = await ctx.db.from('expenses').insert(inserts.slice(i, i + 200));
    if (error) throw error;
  }
  // Righe cancellate su Notion: le togliamo anche da Jarvis.
  const gone = (existing || []).filter((r: Any) => !seen.has(r.notion_page_id)).map((r: Any) => r.id);
  if (gone.length) await ctx.db.from('expenses').delete().in('id', gone);
  await ctx.db.from('notion_months').update({ imported_at: new Date().toISOString() }).eq('user_id', ctx.userId).eq('month_key', m.month_key);
  return { added: inserts.length, removed: gone.length };
}

async function sync(ctx: Ctx) {
  const current = financialKey(new Date());
  const { count } = await ctx.db.from('notion_months').select('*', { count: 'exact', head: true }).eq('user_id', ctx.userId);
  if (!count) await discover(ctx);
  await ensureMonth(ctx, current);
  const pushed = await push(ctx);
  let imported = 0;
  // Sempre: mese in corso e precedente (righe aggiunte su Notion, es. da Trade Republic).
  for (const key of [current, prevKey(current)]) {
    const m = await monthRow(ctx, key);
    if (m) { const r = await importMonth(ctx, m); imported += r.added; }
  }
  // Storico: i mesi mai importati, finché c'è tempo.
  const { data: todo } = await ctx.db.from('notion_months').select('*').eq('user_id', ctx.userId).is('imported_at', null).order('month_key', { ascending: false });
  let remaining = (todo || []).length;
  for (const m of todo || []) {
    if (Date.now() - ctx.started > TIME_BUDGET_MS) break;
    const r = await importMonth(ctx, m);
    imported += r.added;
    remaining--;
  }
  return { ok: true, current, pushed, imported, remaining };
}

function safeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const started = Date.now();
  try {
    const db = admin();
    let userId: string | null = null;
    const ingest = req.headers.get('x-ingest-token') || '';
    if (ingest && safeEqual(ingest, env('JARVIS_INGEST_TOKEN'))) {
      const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 50 });
      userId = data.users.find((u) => (u.email || '').toLowerCase() === OWNER_EMAIL)?.id || null;
    } else {
      const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      const { data: { user } } = await db.auth.getUser(jwt);
      if (user && (user.email || '').toLowerCase() === OWNER_EMAIL) userId = user.id;
    }
    if (!userId) return json({ error: 'Non autenticato' }, 401);
    const body = await req.json().catch(() => ({}));
    if (!env('NOTION_TOKEN')) return json({ status: 'not_configured' });
    const ctx: Ctx = { db, userId, started };

    if (body.action === 'status') {
      const { data } = await db.from('notion_months').select('month_key, title, imported_at').eq('user_id', userId).order('month_key', { ascending: false });
      return json({ status: 'ok', months: data || [] });
    }
    if (body.action === 'archive' && body.pageId) {
      await notion(`/pages/${body.pageId}`, 'PATCH', { archived: true });
      return json({ ok: true });
    }
    return json(await sync(ctx));
  } catch (e) {
    const err = e as Any;
    console.error(e);
    const hint = err.status === 404 || err.code === 'object_not_found' ? 'Condividi la pagina "Budgeting" con l\'integrazione Jarvis su Notion' : undefined;
    return json({ status: 'error', error: err.message, hint }, err.status === 401 ? 401 : 500);
  }
});
