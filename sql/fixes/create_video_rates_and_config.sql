-- Focused fix for missing tables seen in error logs
-- Creates public.video_earning_rates and public.app_config
-- Safe to run multiple times (IF NOT EXISTS guards)

create extension if not exists pgcrypto;

-- 1) video_earning_rates
create table if not exists public.video_earning_rates (
  id uuid primary key default gen_random_uuid(),
  vip_level public.vip_level_enum not null,
  rate_per_video numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.video_earning_rates enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'video_earning_rates' and policyname = 'video_rates_select_all'
  ) then
    create policy video_rates_select_all on public.video_earning_rates for select using (true);
  end if;
end $$;

-- 2) app_config
create table if not exists public.app_config (
  id uuid primary key default gen_random_uuid(),
  support_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'app_config' and policyname = 'app_config_select_all'
  ) then
    create policy app_config_select_all on public.app_config for select using (true);
  end if;
end $$;

-- Shared updated_at trigger function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Attach updated_at triggers (idempotent)
do $$ begin
  begin
    create trigger video_rates_set_updated_at
      before update on public.video_earning_rates
      for each row execute function public.set_updated_at();
  exception when duplicate_object then null;
  end;

  begin
    create trigger app_config_set_updated_at
      before update on public.app_config
      for each row execute function public.set_updated_at();
  exception when duplicate_object then null;
  end;
end $$;

-- Verification helpers
-- select * from public.video_earning_rates limit 1;
-- select * from public.app_config limit 1;
-- select * from pg_policies where schemaname='public' and tablename in ('video_earning_rates','app_config');