-- Ritim — Supabase setup. Paste into the Supabase SQL Editor and run once.

-- 1. Single-row blob store (the whole app database lives in `data`).
create table if not exists public.app_state (
  id   text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.app_state_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists app_state_touch on public.app_state;
create trigger app_state_touch before update on public.app_state
  for each row execute function public.app_state_touch();

-- 2. Public storage bucket for uploaded images/videos.
insert into storage.buckets (id, name, public)
values ('ritim', 'ritim', true)
on conflict (id) do update set public = true;

-- Public buckets are world-readable by URL. Uploads go through short-lived signed
-- URLs minted with the service-role key, which bypasses RLS — no extra policy needed.
