-- ─────────────────────────────────────────────────────────────────────────────
-- Family Vault — Important Dates & Reminders
-- Run in Supabase SQL Editor after schema-additions.sql
-- ─────────────────────────────────────────────────────────────────────────────

create table public.important_dates (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  date        date not null,
  emoji       text not null default '📅',
  description text,
  reminder_1  timestamptz,
  reminder_2  timestamptz,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.important_dates enable row level security;

-- All authenticated family members can view and manage dates
create policy "Authenticated users can manage important dates"
  on public.important_dates for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create trigger important_dates_updated_at
  before update on public.important_dates
  for each row execute function update_updated_at();
