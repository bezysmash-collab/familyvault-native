-- ─────────────────────────────────────────────────────────────────────────────
-- Family Vault — Schema additions for iPhone app
-- Run this in Supabase SQL editor AFTER the base schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Device tokens ───────────────────────────────────────────────────────────
-- One row per device per user. Updated on every app launch via upsert.
create table public.device_tokens (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  token      text not null,
  platform   text not null default 'ios',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

alter table public.device_tokens enable row level security;

-- Users manage their own tokens; the Edge Function uses service_role (bypasses RLS)
create policy "Users can manage own device tokens"
  on public.device_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger device_tokens_updated_at
  before update on public.device_tokens
  for each row execute function update_updated_at();

-- ─── Notification preferences ────────────────────────────────────────────────
-- One row per user. Auto-created (all enabled) when a profile is inserted.
create table public.notification_preferences (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  new_post         boolean not null default true,
  reaction_on_post boolean not null default true,
  comment_on_post  boolean not null default true,
  task_assigned    boolean not null default true,
  task_completed   boolean not null default true,
  updated_at       timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "Users can manage own notification preferences"
  on public.notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function update_updated_at();

-- Auto-create default preferences row when a new profile is inserted
create or replace function public.create_default_notification_prefs()
returns trigger language plpgsql security definer as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created_notification_prefs
  after insert on public.profiles
  for each row execute function public.create_default_notification_prefs();

-- Back-fill for existing profiles (idempotent)
insert into public.notification_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;
