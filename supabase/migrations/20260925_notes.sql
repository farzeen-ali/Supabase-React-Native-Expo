-- Run this in the Supabase SQL editor for the linked project.
-- Every policy requires auth.uid() = user_id. The client never trusts a caller-supplied owner.

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists notes_owner_active_idx
  on public.notes (user_id, updated_at desc)
  where deleted_at is null;

alter table public.notes enable row level security;

create policy "notes_select_own"
  on public.notes
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "notes_insert_own"
  on public.notes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "notes_update_own"
  on public.notes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notes_delete_own"
  on public.notes
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.notes to authenticated;

alter publication supabase_realtime add table public.notes;
