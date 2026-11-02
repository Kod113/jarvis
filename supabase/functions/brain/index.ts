// Second brain ↔ Notion, nei due sensi.
// - Note: il database Notion "Second brain / Note" è copiato nella tabella brain_notes (ricerca istantanea nella Mente).
//   Da Jarvis si possono modificare titolo, area e testo (saveNote): la modifica va subito su Notion, toccando solo le righe cambiate
//   (le righe uguali, le immagini e la formattazione restano come sono su Notion). Si possono anche creare note nuove.
// - Pensieri: i pensieri della Mente (captures con status 'archived') sono allineati col database Notion "Pensieri" dentro Second brain
//   (creato in automatico). Modifiche, nuovi pensieri e cancellazioni passano da una parte all'altra (azione thoughts, inclusa in sync).
// - Nuvola (toBrain): un pensiero diventa una nota del second brain (con le sue foto) ed esce dai Pensieri.
// verify_jwt = false. Accesso: JWT del proprietario (dall'app) oppure header x-ingest-token (GitHub Actions).
// Segreto: NOTION_TOKEN (stessa integrazione delle spese). La pagina "Second brain" va collegata all'integrazione.
// Azioni (body.action): status · sync (default: pensieri + note) · thoughts · saveNote · toBrain.
import { admin, env } from '../_shared/google.ts';

const OWNER_EMAIL = 'davsorm@gmail.com';
const BRAIN_PAGE = '40c9756b457b81c0a091f88739fbafa1';
const NOTES_DB = 'd18d183791664b8293adc6406e0ac28a';
const THOUGHTS_TITLE = 'Pensieri';
const NOTION_VERSION = '2022-06-28';
const TIME_BUDGET_MS = 100_000;

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, x-ingest-token',
  'access-control-allow-methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const todayRome = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());

// deno-lint-ignore no-explicit-any
type Any = any;
class UserError extends Error {}

async function notion(path: string, method = 'GET', body?: unknown, attempt = 0): Promise<Any> {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: { authorization: `Bearer ${env('NOTION_TOKEN')}`, 'notion-version': NOTION_VERSION, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if ((res.status === 429 || res.status === 409 || res.status >= 502) && attempt < 4) { await sleep(1000 * (attempt + 1)); return notion(path, method, body, attempt + 1); }
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

async function queryAll(dbId: string, extra: Any = {}): Promise<Any[]> {
  const pages: Any[] = [];
  let cursor: string | undefined;
  do {
    const r = await notion(`/databases/${dbId}/query`, 'POST', { page_size: 100, ...extra, ...(cursor ? { start_cursor: cursor } : {}) });
    pages.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return pages;
}

// Testo di un rich_text: i link restano visibili (se il testo non è già l'URL, lo aggiunge tra parentesi).
const rich = (rt: Any[] = []) => rt.map((x: Any) => {
  const t = x.plain_text || '';
  const href = x.href || x.text?.link?.url;
  return href && !t.includes(href) && !href.startsWith('/') ? `${t} (${href})` : t;
}).join('');

// Testo → rich_text di Notion: gli URL diventano link, pezzi da max 2000 caratteri (limite di Notion).
const URL_RE = /(https?:\/\/[^\s<>"')\]]+)/g;
function richText(text: string): Any[] {
  const out: Any[] = [];
  text.split(URL_RE).forEach((part, i) => {
    if (!part) return;
    for (let k = 0; k < part.length; k += 2000) {
      const content = part.slice(k, k + 2000);
      out.push({ type: 'text', text: i % 2 ? { content, link: { url: part } } : { content } });
    }
  });
  return out.slice(0, 100);
}

// Una riga di un blocco (la stessa resa usata per il testo delle note); null = blocco senza testo (immagine, file…).
function blockLine(b: Any, num: number): string | null {
  const v = b[b.type] || {};
  switch (b.type) {
    case 'paragraph': return rich(v.rich_text);
    case 'heading_1': case 'heading_2': case 'heading_3': return rich(v.rich_text).toUpperCase();
    case 'bulleted_list_item': return '• ' + rich(v.rich_text);
    case 'numbered_list_item': return `${num}. ` + rich(v.rich_text);
    case 'to_do': return (v.checked ? '[x] ' : '[ ] ') + rich(v.rich_text);
    case 'toggle': case 'quote': case 'callout': case 'code': return rich(v.rich_text);
    case 'divider': return '---';
    case 'bookmark': case 'embed': case 'link_preview': return v.url || '';
    case 'table_row': return (v.cells || []).map((c: Any[]) => rich(c)).join(' | ');
    case 'child_page': return v.title || '';
    default: return null;
  }
}
const isMedia = (t: string) => ['image', 'file', 'pdf', 'video'].includes(t);

// Blocchi Notion → testo semplice leggibile (una riga per blocco). Le liste a spunta diventano "[ ]" / "[x]".
async function blocksToText(blockId: string, depth = 0, list?: Any[]): Promise<{ text: string; images: boolean }> {
  const lines: string[] = [];
  let images = false;
  let n = 0;
  const pad = '  '.repeat(depth);
  for (const b of list || await children(blockId)) {
    n = b.type === 'numbered_list_item' ? n + 1 : 0;
    if (isMedia(b.type)) images = true;
    const line = blockLine(b, n);
    if (line !== null) lines.push(pad + line);
    if (b.has_children && depth < 2 && b.type !== 'child_page' && b.type !== 'child_database') {
      const sub = await blocksToText(b.id, b.type === 'table' ? depth : depth + 1);
      if (sub.text) lines.push(sub.text);
      images = images || sub.images;
    }
  }
  return { text: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim(), images };
}

// Riga scritta in Jarvis → blocco Notion.
function lineToBlock(line: string): Any {
  const t = line.replace(/\s+$/, '');
  if (/^\s*-{3,}\s*$/.test(t)) return { type: 'divider', divider: {} };
  let m = t.match(/^\s*\[( |x)\]\s?(.*)$/i);
  if (m) return { type: 'to_do', to_do: { rich_text: richText(m[2]), checked: m[1].toLowerCase() === 'x' } };
  m = t.match(/^\s*[•\-*]\s+(.*)$/);
  if (m) return { type: 'bulleted_list_item', bulleted_list_item: { rich_text: richText(m[1]) } };
  m = t.match(/^\s*\d+[.)]\s+(.*)$/);
  if (m) return { type: 'numbered_list_item', numbered_list_item: { rich_text: richText(m[1]) } };
  return { type: 'paragraph', paragraph: { rich_text: richText(t) } };
}
const textToBlocks = (text: string) => (text || '').replace(/\r/g, '').split('\n').map(lineToBlock);

// Aggiorna un blocco esistente col testo nuovo mantenendone il tipo (titolo, citazione, colore…). false = serve sostituirlo.
const TEXT_TYPES = ['paragraph', 'heading_1', 'heading_2', 'heading_3', 'quote', 'callout', 'toggle', 'code'];
function updatePayload(b: Any, line: string): Any | null {
  const nb = lineToBlock(line);
  if (b.type === nb.type && nb.type !== 'divider') return { [b.type]: nb[nb.type] };
  if (TEXT_TYPES.includes(b.type) && nb.type === 'paragraph') return { [b.type]: { rich_text: nb.paragraph.rich_text } };
  return null;
}

async function appendBlocks(parent: string, blocks: Any[], after?: string | null): Promise<string | null> {
  let anchor = after || null;
  for (let i = 0; i < blocks.length; i += 100) {
    const r = await notion(`/blocks/${parent}/children`, 'PATCH', { children: blocks.slice(i, i + 100), ...(anchor ? { after: anchor } : {}) });
    const ids = (r.results || []).map((x: Any) => x.id);
    // Con "after" Notion restituisce i blocchi del genitore: l'ultimo dei nuovi è quello subito dopo l'ancora + quantità.
    if (anchor) {
      const k = ids.indexOf(anchor);
      anchor = k >= 0 ? ids[k + Math.min(100, blocks.length - i)] || ids[ids.length - 1] : ids[ids.length - 1];
    } else anchor = ids[ids.length - 1] || null;
  }
  return anchor;
}

// Testo modificato in Jarvis → Notion, cambiando solo le righe diverse (confronto riga per riga, LCS).
// Immagini, file e blocchi senza testo non si toccano mai. Sottopagine, tabelle ed elementi annidati: solo da Notion.
async function patchBody(pageId: string, newText: string) {
  const top = await children(pageId);
  type L = { text: string; block: Any; locked: boolean };
  const old: L[] = [];
  let n = 0;
  for (const b of top) {
    n = b.type === 'numbered_list_item' ? n + 1 : 0;
    const own = blockLine(b, n);
    const nested = b.has_children && b.type !== 'child_page' && b.type !== 'child_database';
    const locked = nested || !(TEXT_TYPES.includes(b.type) || ['bulleted_list_item', 'numbered_list_item', 'to_do', 'divider'].includes(b.type));
    if (own !== null) old.push({ text: own.replace(/\s+$/, ''), block: b, locked });
    if (nested) {
      const sub = await blocksToText(b.id, b.type === 'table' ? 0 : 1);
      for (const t of sub.text ? sub.text.split('\n') : []) old.push({ text: t.replace(/\s+$/, ''), block: b, locked: true });
    }
  }
  const neu = (newText || '').replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, ''));
  while (neu.length && !neu[neu.length - 1]) neu.pop();
  while (neu.length && !neu[0]) neu.shift();

  // LCS
  const N = old.length, M = neu.length;
  const dp: Int32Array[] = Array.from({ length: N + 1 }, () => new Int32Array(M + 1));
  for (let i = N - 1; i >= 0; i--) for (let j = M - 1; j >= 0; j--) dp[i][j] = old[i].text === neu[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  type Run = { dels: L[]; ins: string[] };
  const steps: Array<{ keep: L } | { run: Run }> = [];
  let run: Run = { dels: [], ins: [] };
  let i = 0, j = 0;
  while (i < N || j < M) {
    if (i < N && j < M && old[i].text === neu[j]) {
      if (run.dels.length || run.ins.length) steps.push({ run }); run = { dels: [], ins: [] };
      steps.push({ keep: old[i] }); i++; j++;
    } else if (j < M && (i >= N || dp[i][j + 1] >= dp[i + 1][j])) { run.ins.push(neu[j]); j++; }
    else { run.dels.push(old[i]); i++; }
  }
  if (run.dels.length || run.ins.length) steps.push({ run });

  // Controllo prima di scrivere: niente modifiche a parti che Jarvis non sa riscrivere.
  for (const s of steps) if ('run' in s && s.run.dels.some((d) => d.locked)) {
    throw new UserError('Hai modificato una parte (tabella, sottopagina o elenco annidato) che si può cambiare solo su Notion.');
  }
  // Notion non permette di inserire in cima alla pagina: in quel caso si riscrive il primo blocco di testo
  // con la prima riga nuova e il suo vecchio testo torna subito dopo (le altre righe restano intatte).
  let anchor: string | null = null;
  let changed = 0;
  const moved = new Map<string, string>(); // primo blocco riscritto: il suo vecchio testo ora sta in un blocco nuovo
  const consumed = new Set<string>();      // blocchi riusati per il testo nuovo: non vanno cancellati
  const firstTop = top[0];
  let current: L[] = [];
  const insertLines = async (lines: string[]) => {
    if (!lines.length) return;
    changed++;
    if (anchor) { anchor = await appendBlocks(pageId, lines.map(lineToBlock), anchor); return; }
    if (!firstTop) { anchor = await appendBlocks(pageId, lines.map(lineToBlock)); return; }
    const f = old.find((o) => o.block.id === firstTop.id);
    const p = f && !f.locked && !consumed.has(firstTop.id) ? updatePayload(firstTop, lines[0]) : null;
    if (p && f) {
      await notion(`/blocks/${firstTop.id}`, 'PATCH', p);
      const inRun = current.includes(f);
      const rest = inRun ? lines.slice(1) : [...lines.slice(1), f.text];
      anchor = rest.length ? await appendBlocks(pageId, rest.map(lineToBlock), firstTop.id) : firstTop.id;
      if (inRun) consumed.add(firstTop.id); else if (anchor) moved.set(firstTop.id, anchor);
      return;
    }
    // Primo blocco non riscrivibile (es. un'immagine): le righe nuove vanno subito dopo.
    anchor = await appendBlocks(pageId, lines.map(lineToBlock), firstTop.id);
  };
  const remove = async (d: L) => {
    if (consumed.has(d.block.id)) return;
    consumed.add(d.block.id);
    await notion(`/blocks/${d.block.id}`, 'DELETE'); changed++;
  };
  for (const s of steps) {
    if ('keep' in s) { anchor = moved.get(s.keep.block.id) || s.keep.block.id; continue; }
    const { dels, ins } = s.run;
    current = dels;
    const pairs = Math.min(dels.length, ins.length);
    for (let k = 0; k < pairs; k++) {
      const p = consumed.has(dels[k].block.id) ? null : updatePayload(dels[k].block, ins[k]);
      if (p) { await notion(`/blocks/${dels[k].block.id}`, 'PATCH', p); anchor = dels[k].block.id; consumed.add(anchor); changed++; }
      else { await insertLines([ins[k]]); await remove(dels[k]); }
    }
    await insertLines(ins.slice(pairs));
    for (const d of dels.slice(pairs)) await remove(d);
  }
  return changed;
}

const title = (p: Any) => rich(Object.values(p || {}).find((x: Any) => x?.type === 'title')?.title || []).trim();
const titleKey = (p: Any) => Object.keys(p || {}).find((k) => p[k]?.type === 'title') || 'Nome';

type Ctx = { db: ReturnType<typeof admin>; userId: string; started: number };

// Pagina del database Note → riga di brain_notes.
async function pageRow(ctx: Ctx, p: Any) {
  const pr = p.properties || {};
  const { text, images } = await blocksToText(p.id);
  return {
    user_id: ctx.userId,
    notion_page_id: p.id,
    notion_url: p.url,
    title: title(pr) || '(senza titolo)',
    body: text,
    area: pr.Area?.select?.name || null,
    source: pr.Fonte?.select?.name || null,
    has_images: images || !!pr['Ha immagini']?.checkbox,
    archived: !!pr.Archiviata?.checkbox,
    edited_at: pr.Modificata?.date?.start?.slice(0, 10) || p.last_edited_time.slice(0, 10),
    notion_edited_at: p.last_edited_time,
    updated_at: new Date().toISOString()
  };
}
async function storeRow(ctx: Ctx, row: Any) {
  const { data, error } = await ctx.db.from('brain_notes').upsert(row, { onConflict: 'user_id,notion_page_id' })
    .select('id, title, body, area, has_images, archived, edited_at, notion_url').single();
  if (error) throw error;
  return data;
}

async function sync(ctx: Ctx, full = false) {
  // Tutte le pagine del database (solo metadati): servono anche per sapere quali sono state cancellate.
  const pages = await queryAll(NOTES_DB, { sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }] });
  const { data: known } = await ctx.db.from('brain_notes').select('id, notion_page_id, notion_edited_at').eq('user_id', ctx.userId);
  const byPage = new Map((known || []).map((r: Any) => [r.notion_page_id, r]));
  const seen = new Set<string>();
  let updated = 0, remaining = 0;

  for (const p of pages) {
    seen.add(p.id);
    const k = byPage.get(p.id);
    if (!full && k && k.notion_edited_at && new Date(k.notion_edited_at).getTime() >= new Date(p.last_edited_time).getTime()) continue;
    if (Date.now() - ctx.started > TIME_BUDGET_MS) { remaining++; continue; }
    const { error } = await ctx.db.from('brain_notes').upsert(await pageRow(ctx, p), { onConflict: 'user_id,notion_page_id' });
    if (error) throw error;
    updated++;
  }
  // Pagine eliminate (o spostate fuori dal database) su Notion: spariscono anche da Jarvis.
  const gone = (known || []).filter((r: Any) => !seen.has(r.notion_page_id)).map((r: Any) => r.id);
  if (gone.length && !remaining) await ctx.db.from('brain_notes').delete().in('id', gone);
  return { ok: true, total: pages.length, updated, removed: remaining ? 0 : gone.length, remaining };
}

// ------------------------------------------------------------ Note: modifica e creazione da Jarvis
async function saveNote(ctx: Ctx, b: Any) {
  const newTitle = String(b.title || '').trim().slice(0, 300) || '(senza titolo)';
  const area = String(b.area || '').trim().slice(0, 100) || null;
  const body = typeof b.body === 'string' ? b.body : null;
  const notesDb = await notion(`/databases/${NOTES_DB}`);
  const tk = titleKey(notesDb.properties);
  const props: Any = { [tk]: { title: richText(newTitle) } };
  if (notesDb.properties.Area?.type === 'select') props.Area = { select: area ? { name: area.replace(/,/g, ' ') } : null };
  if (notesDb.properties.Modificata?.type === 'date') props.Modificata = { date: { start: todayRome() } };

  if (!b.id) {
    if (notesDb.properties.Fonte?.type === 'select') props.Fonte = { select: { name: 'Jarvis' } };
    const blocks = body ? textToBlocks(body.trim()) : [];
    const page = await notion('/pages', 'POST', { parent: { database_id: NOTES_DB }, properties: props, children: blocks.slice(0, 100) });
    if (blocks.length > 100) await appendBlocks(page.id, blocks.slice(100));
    return { ok: true, note: await storeRow(ctx, await pageRow(ctx, page)) };
  }
  const { data: n } = await ctx.db.from('brain_notes').select('*').eq('id', b.id).eq('user_id', ctx.userId).maybeSingle();
  if (!n) throw new UserError('Nota non trovata: aggiorna la Mente e riprova.');
  if (body !== null && body.trim() !== (n.body || '').trim()) await patchBody(n.notion_page_id, body);
  const page = await notion(`/pages/${n.notion_page_id}`, 'PATCH', { properties: props });
  return { ok: true, note: await storeRow(ctx, await pageRow(ctx, page)) };
}

// ------------------------------------------------------------ Pensieri ↔ database Notion "Pensieri"
async function thoughtsDb(): Promise<string> {
  for (const b of await children(BRAIN_PAGE)) {
    if (b.type === 'child_database' && (b.child_database?.title || '').trim().toLowerCase() === THOUGHTS_TITLE.toLowerCase()) return b.id;
  }
  const db = await notion('/databases', 'POST', {
    parent: { type: 'page_id', page_id: BRAIN_PAGE }, is_inline: true,
    title: [{ type: 'text', text: { content: THOUGHTS_TITLE } }],
    properties: { Pensiero: { title: {} }, Data: { date: {} }, 'Jarvis ID': { rich_text: {} } }
  });
  return db.id;
}
const norm = (s: string) => (s || '').replace(/\s+/g, ' ').trim();
const thoughtProps = (text: string, created?: string, id?: string) => ({
  Pensiero: { title: richText(text.slice(0, 1990)) },
  ...(created ? { Data: { date: { start: created.slice(0, 10) } } } : {}),
  ...(id ? { 'Jarvis ID': { rich_text: [{ type: 'text', text: { content: id } }] } } : {})
});

async function syncThoughts(ctx: Ctx) {
  const { data: caps, error } = await ctx.db.from('captures')
    .select('id, body, status, kind, notion_page_id, notion_body, created_at')
    .eq('user_id', ctx.userId).neq('kind', 'task').or('status.eq.archived,notion_page_id.not.is.null');
  if (error) throw error;
  const dbId = await thoughtsDb();
  const pages = await queryAll(dbId);
  const pageIds = new Set(pages.map((p: Any) => p.id));
  const byPage = new Map((caps || []).filter((c: Any) => c.notion_page_id).map((c: Any) => [c.notion_page_id, c]));
  const byId = new Map((caps || []).map((c: Any) => [c.id, c]));
  const seen = new Set<string>();
  const r = { pushed: 0, pulled: 0, created: 0, imported: 0, removed: 0 };

  for (const p of pages) {
    const pr = p.properties || {};
    const ntext = title(pr);
    const jid = rich(pr['Jarvis ID']?.rich_text || []).trim();
    const c: Any = byPage.get(p.id) || (jid ? byId.get(jid) : null);
    // Doppione (due sincronizzazioni partite insieme): resta solo la riga già collegata al pensiero.
    if (c && !byPage.get(p.id) && c.notion_page_id && c.notion_page_id !== p.id && pageIds.has(c.notion_page_id)) {
      await notion(`/pages/${p.id}`, 'PATCH', { archived: true }); continue;
    }
    if (c) seen.add(c.id);
    if (!c) {
      if (jid) { await notion(`/pages/${p.id}`, 'PATCH', { archived: true }); continue; } // pensiero non più in Jarvis
      if (!ntext) continue; // riga vuota appena aggiunta su Notion: la prendo quando c'è il testo
      const { data: ins, error: e } = await ctx.db.from('captures').insert({
        user_id: ctx.userId, body: ntext, kind: 'idea', status: 'archived', source: 'notion', notion_page_id: p.id, notion_body: ntext,
        created_at: pr.Data?.date?.start ? new Date(pr.Data.date.start).toISOString() : p.created_time
      }).select('id').single();
      if (e) throw e;
      await notion(`/pages/${p.id}`, 'PATCH', { properties: thoughtProps(ntext, undefined, ins.id) });
      r.imported++;
      continue;
    }
    if (c.status !== 'archived') {
      // Uscito dalla Mente in Jarvis (spuntato, da smistare, to-do, second brain): esce anche dai Pensieri di Notion.
      await notion(`/pages/${p.id}`, 'PATCH', { archived: true });
      await ctx.db.from('captures').update({ notion_page_id: null }).eq('id', c.id);
      r.removed++;
      continue;
    }
    if (c.notion_page_id !== p.id) await ctx.db.from('captures').update({ notion_page_id: p.id }).eq('id', c.id);
    if (norm(c.body) !== norm(c.notion_body ?? c.body) || c.notion_body == null) {
      // Modificato in Jarvis (vince Jarvis se cambiato da entrambe le parti).
      if (norm(ntext) !== norm(c.body)) { await notion(`/pages/${p.id}`, 'PATCH', { properties: thoughtProps(c.body) }); r.pushed++; }
      await ctx.db.from('captures').update({ notion_body: c.body }).eq('id', c.id);
    } else if (ntext && norm(ntext) !== norm(c.notion_body)) {
      await ctx.db.from('captures').update({ body: ntext, notion_body: ntext }).eq('id', c.id);
      r.pulled++;
    }
  }
  for (const c of caps || []) {
    if (seen.has(c.id)) continue;
    if (c.status === 'archived' && !c.notion_page_id) {
      const page = await notion('/pages', 'POST', { parent: { database_id: dbId }, properties: thoughtProps(c.body || 'Foto', c.created_at, c.id) });
      await ctx.db.from('captures').update({ notion_page_id: page.id, notion_body: c.body }).eq('id', c.id);
      r.created++;
    } else if (c.notion_page_id) {
      // Riga cancellata su Notion: il pensiero esce dalla Mente (non si cancella, va tra i "fatti").
      await ctx.db.from('captures').update(c.status === 'archived' ? { status: 'done', notion_page_id: null } : { notion_page_id: null }).eq('id', c.id);
      if (c.status === 'archived') r.removed++;
    }
  }
  return { ok: true, ...r };
}

// ------------------------------------------------------------ Nuvola: pensiero → nota del second brain
async function uploadImage(ctx: Ctx, path: string): Promise<Any | null> {
  try {
    const { data, error } = await ctx.db.storage.from('media').download(path);
    if (error || !data) return null;
    const name = path.split('/').pop() || 'foto.jpg';
    const fu = await notion('/file_uploads', 'POST', { filename: name, content_type: 'image/jpeg' });
    const form = new FormData();
    form.append('file', new Blob([await data.arrayBuffer()], { type: 'image/jpeg' }), name);
    const res = await fetch(`https://api.notion.com/v1/file_uploads/${fu.id}/send`, {
      method: 'POST', headers: { authorization: `Bearer ${env('NOTION_TOKEN')}`, 'notion-version': NOTION_VERSION }, body: form
    });
    if (!res.ok) { console.warn('upload', res.status, await res.text()); return null; }
    return { type: 'image', image: { type: 'file_upload', file_upload: { id: fu.id } } };
  } catch (e) { console.warn('upload', e); return null; }
}

async function toBrain(ctx: Ctx, b: Any) {
  const { data: c } = await ctx.db.from('captures').select('*').eq('id', b.captureId).eq('user_id', ctx.userId).maybeSingle();
  if (!c) throw new UserError('Pensiero non trovato.');
  if (c.status === 'brain' && c.brain_note_id) {
    const { data: n } = await ctx.db.from('brain_notes').select('id, title, body, area, has_images, archived, edited_at, notion_url').eq('id', c.brain_note_id).maybeSingle();
    if (n) return { ok: true, note: n };
  }
  const text = String(b.text ?? c.body ?? '').trim() || 'Foto';
  const first = text.split('\n')[0].trim();
  const noteTitle = first.length <= 90 ? first : first.slice(0, 90).replace(/\s+\S*$/, '') + '…';
  const bodyText = noteTitle === text ? '' : text;
  const notesDb = await notion(`/databases/${NOTES_DB}`);
  const props: Any = { [titleKey(notesDb.properties)]: { title: richText(noteTitle) } };
  if (notesDb.properties.Fonte?.type === 'select') props.Fonte = { select: { name: 'Jarvis' } };
  if (notesDb.properties.Modificata?.type === 'date') props.Modificata = { date: { start: todayRome() } };
  if (b.area && notesDb.properties.Area?.type === 'select') props.Area = { select: { name: String(b.area).slice(0, 100) } };
  const images: Any[] = [];
  for (const path of c.images || []) { const blk = await uploadImage(ctx, path); if (blk) images.push(blk); }
  if (images.length && notesDb.properties['Ha immagini']?.type === 'checkbox') props['Ha immagini'] = { checkbox: true };
  const blocks = [...(bodyText ? textToBlocks(bodyText) : []), ...images];
  const page = await notion('/pages', 'POST', { parent: { database_id: NOTES_DB }, properties: props, children: blocks.slice(0, 100) });
  if (blocks.length > 100) await appendBlocks(page.id, blocks.slice(100));
  const note = await storeRow(ctx, await pageRow(ctx, page));
  if (c.notion_page_id) { try { await notion(`/pages/${c.notion_page_id}`, 'PATCH', { archived: true }); } catch (e) { console.warn(e); } }
  const lostImages = (c.images || []).length - images.length;
  const { error } = await ctx.db.from('captures').update({ status: 'brain', brain_note_id: note.id, notion_page_id: null }).eq('id', c.id);
  if (error) throw error;
  return { ok: true, note, lostImages };
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
    switch (body.action) {
      case 'status': {
        const { count } = await db.from('brain_notes').select('*', { count: 'exact', head: true }).eq('user_id', userId);
        return json({ status: 'ok', notes: count || 0 });
      }
      case 'saveNote': return json(await saveNote(ctx, body));
      case 'toBrain': return json(await toBrain(ctx, body));
      case 'thoughts': return json(await syncThoughts(ctx));
      default: {
        let thoughts: Any;
        try { thoughts = await syncThoughts(ctx); } catch (e) { console.error('thoughts', e); thoughts = { error: (e as Error).message }; }
        return json({ ...(await sync(ctx, !!body.full)), thoughts });
      }
    }
  } catch (e) {
    const err = e as Any;
    console.error(e);
    if (e instanceof UserError) return json({ status: 'error', error: err.message, hint: err.message }, 400);
    const hint = err.status === 404 || err.code === 'object_not_found' ? 'Collega la pagina "Second brain" all\'integrazione Jarvis su Notion (••• → Connessioni)' : undefined;
    return json({ status: 'error', error: err.message, hint }, err.status === 401 ? 401 : 500);
  }
});
