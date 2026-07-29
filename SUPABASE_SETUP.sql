-- DragonFly Lotus V6 — Supabase Cloud Mirror
-- Run this entire script once in Supabase Dashboard → SQL Editor.

create table if not exists public.dragonfly_cloud_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  device_id text,
  updated_at timestamptz not null default now()
);

alter table public.dragonfly_cloud_state enable row level security;

drop policy if exists "Users can read their DragonFly cloud row"
  on public.dragonfly_cloud_state;
create policy "Users can read their DragonFly cloud row"
  on public.dragonfly_cloud_state
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their DragonFly cloud row"
  on public.dragonfly_cloud_state;
create policy "Users can insert their DragonFly cloud row"
  on public.dragonfly_cloud_state
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their DragonFly cloud row"
  on public.dragonfly_cloud_state;
create policy "Users can update their DragonFly cloud row"
  on public.dragonfly_cloud_state
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.dragonfly_cloud_state to authenticated;

-- Enable realtime updates for the table.
do $$
begin
  alter publication supabase_realtime add table public.dragonfly_cloud_state;
exception
  when duplicate_object then null;
end $$;
