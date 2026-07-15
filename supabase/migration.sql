-- Eunoia mood tracker: mood_entries table + RLS
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)

create table if not exists public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  mood smallint not null check (mood between 1 and 5),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create index if not exists mood_entries_user_date_idx
  on public.mood_entries (user_id, entry_date desc);

-- Keep updated_at current on every edit
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists mood_entries_set_updated_at on public.mood_entries;
create trigger mood_entries_set_updated_at
  before update on public.mood_entries
  for each row
  execute function public.set_updated_at();

alter table public.mood_entries enable row level security;

drop policy if exists "select own mood entries" on public.mood_entries;
create policy "select own mood entries"
  on public.mood_entries for select
  using (auth.uid() = user_id);

drop policy if exists "insert own mood entries" on public.mood_entries;
create policy "insert own mood entries"
  on public.mood_entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own mood entries" on public.mood_entries;
create policy "update own mood entries"
  on public.mood_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own mood entries" on public.mood_entries;
create policy "delete own mood entries"
  on public.mood_entries for delete
  using (auth.uid() = user_id);
