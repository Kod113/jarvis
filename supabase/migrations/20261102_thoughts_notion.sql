-- Pensieri della Mente ↔ database Notion "Pensieri" (dentro Second brain), modificabili dai due lati.
-- notion_body = testo all'ultima sincronizzazione: se cambia body → ha modificato Jarvis; se cambia su Notion → ha modificato Notion.
alter table public.captures add column if not exists notion_page_id text;
alter table public.captures add column if not exists notion_body text;
create index if not exists captures_notion_page_idx on public.captures (notion_page_id) where notion_page_id is not null;
-- Pensiero mandato nel second brain con la nuvola: status 'brain', brain_note_id = la nota creata.
alter table public.captures add column if not exists brain_note_id uuid references public.brain_notes(id) on delete set null;
create index if not exists captures_brain_note_idx on public.captures (brain_note_id) where brain_note_id is not null;
