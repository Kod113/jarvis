// Second brain: copia le note del database Notion "Second brain / Note" nella tabella brain_notes,
// così la sezione Mente di Jarvis le cerca e le legge all'istante (anche offline dalla cache del browser).
// verify_jwt = false. Accesso: JWT del proprietario (dall'app) oppure header x-ingest-token (GitHub Actions).
// Segreto: NOTION_TOKEN (stessa integrazione delle spese). La pagina "Second brain" va condivisa con l'integrazione.
// Azioni (body.action): status · sync (default). Sync incrementale: rilegge solo le pagine modificate su Notion.
import { admin, env } from '../_shared/google.ts';

const OWNER_EMAIL = 'davsorm@gmail.com';
const NOTES_DB = 'd18d183791664b8293adc6406e0ac28a';
const NOTION_VERSION = '2022-06-28';
const TIME_BUDGET_MS = 100_000;

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

// Testo di un rich_text: i link restano visibili (se il testo non è già l'URL, lo aggiunge tra parentesi).
const rich = (rt: Any[] = []) => rt.map((x: Any) => {
  const t = x.plain_text || '';
  const href = x.href || x.text?.link?.url;
  return href && !t.includes(href) && !href.startsWith('/') ? `${t} (${href})` : t;
}).join('');

// Blocchi Notion → testo semplice leggibile (una riga per blocco). Le liste a spunta diventano "[ ]" / "[x]".
async function blocksToText(blockId: string, depth = 0): Promise<{ text: string; images: boolean }> {
  const lines: string[] = [];
  let images = false;
  let n = 0;
  const pad = '  '.repeat(depth);
  for (const b of await children(blockId)) {
    const v = b[b.type] || {};
    let line: string | null = null;
    switch (b.type) {
      case 'paragraph': line = rich(v.rich_text); break;
      case 'heading_1': case 'heading_2': case 'heading_3': line = rich(v.rich_text).toUpperCase(); break;
      case 'bulleted_list_item': line = '• ' + rich(v.rich_text); break;
      case 'numbered_list_item': line = `${++n}. ` + rich(v.rich_text); break;
      case 'to_do': line = (v.checked ? '[x] ' : '[ ] ') + rich(v.rich_text); break;
      case 'toggle': case 'quote': case 'callout': line = rich(v.rich_text); break;
      case 'code': line = rich(v.rich_text); break;
      case 'divider': line = '---'; break;
      case 'bookmark': case 'embed': case 'link_preview': line = v.url || ''; break;
      case 'image': case 'file': case 'pdf': case 'video': images = true; line = null; break;
      case 'table_row': line = (v.cells || []).map((c: Any[]) => rich(c)).join(' | '); break;
      case 'child_page': line = v.title || ''; break;
      default: line = null;
    }
    if (b.type !== 'numbered_list_item') n = 0;
    if (line !== null) lines.push(pad + line);
    if (b.has_children && depth < 2 && b.type !== 'child_page' && b.type !== 'child_database') {
      const sub = await blocksToText(b.id, b.type === 'table' ? depth : depth + 1);
      if (sub.text) lines.push(sub.text);
      images = images || sub.images;
    }
  }
  return { text: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim(), images };
}

const prop = (p: Any, name: string) => p?.[name];
const title = (p: Any) => rich(Object.values(p).find((x: Any) => x.type === 'title')?.title || []).trim();

type Ctx = { db: ReturnType<typeof admin>; userId: string; started: number };

async function sync(ctx: Ctx, full = false) {
  // Tutte le pagine del database (solo metadati): servono anche per sapere quali sono state cancellate.
  const pages: Any[] = [];
  let cursor: string | undefined;
  do {
    const r = await notion(`/databases/${NOTES_DB}/query`, 'POST', { page_size: 100, sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }], ...(cursor ? { start_cursor: cursor } : {}) });
    pages.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);

  const { data: known } = await ctx.db.from('brain_notes').select('id, notion_page_id, notion_edited_at').eq('user_id', ctx.userId);
  const byPage = new Map((known || []).map((r: Any) => [r.notion_page_id, r]));
  const seen = new Set<string>();
  let updated = 0, remaining = 0;

  for (const p of pages) {
    seen.add(p.id);
    const k = byPage.get(p.id);
    if (!full && k && k.notion_edited_at && new Date(k.notion_edited_at).getTime() >= new Date(p.last_edited_time).getTime()) continue;
    if (Date.now() - ctx.started > TIME_BUDGET_MS) { remaining++; continue; }
    const pr = p.properties || {};
    const { text, images } = await blocksToText(p.id);
    const row = {
      user_id: ctx.userId,
      notion_page_id: p.id,
      notion_url: p.url,
      title: title(pr) || '(senza titolo)',
      body: text,
      area: prop(pr, 'Area')?.select?.name || null,
      source: prop(pr, 'Fonte')?.select?.name || null,
      has_images: images || !!prop(pr, 'Ha immagini')?.checkbox,
      archived: !!prop(pr, 'Archiviata')?.checkbox,
      edited_at: prop(pr, 'Modificata')?.date?.start?.slice(0, 10) || p.last_edited_time.slice(0, 10),
      notion_edited_at: p.last_edited_time,
      updated_at: new Date().toISOString()
    };
    const { error } = await ctx.db.from('brain_notes').upsert(row, { onConflict: 'user_id,notion_page_id' });
    if (error) throw error;
    updated++;
  }
  // Pagine eliminate (o spostate fuori dal database) su Notion: spariscono anche da Jarvis.
  const gone = (known || []).filter((r: Any) => !seen.has(r.notion_page_id)).map((r: Any) => r.id);
  if (gone.length && !remaining) await ctx.db.from('brain_notes').delete().in('id', gone);
  return { ok: true, total: pages.length, updated, removed: remaining ? 0 : gone.length, remaining };
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
      const { count } = await db.from('brain_notes').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      return json({ status: 'ok', notes: count || 0 });
    }
    return json(await sync(ctx, !!body.full));
  } catch (e) {
    const err = e as Any;
    console.error(e);
    const hint = err.status === 404 || err.code === 'object_not_found' ? 'Collega la pagina "Second brain" all\'integrazione Jarvis su Notion (••• → Connessioni)' : undefined;
    return json({ status: 'error', error: err.message, hint }, err.status === 401 ? 401 : 500);
  }
});
