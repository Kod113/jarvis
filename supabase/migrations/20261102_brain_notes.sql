-- Second brain: copia delle note del database Notion "Second brain / Note", cercabile dalla sezione Mente.
-- Notion è la fonte: la funzione `brain` (azione sync) aggiorna questa tabella. Solo il proprietario la legge (RLS).
create table public.brain_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  notion_page_id text not null,
  notion_url text,
  title text not null default '',
  body text not null default '',
  area text,
  source text,
  has_images boolean not null default false,
  archived boolean not null default false,
  edited_at date,
  notion_edited_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, notion_page_id)
);
alter table public.brain_notes enable row level security;
create policy brain_notes_select_own on public.brain_notes for select to authenticated
  using (user_id = (select auth.uid()));
create index brain_notes_user_idx on public.brain_notes (user_id);
