-- Missing tables and RLS policies based on #problems_and_diagnostics
-- Safe to run multiple times; uses IF NOT EXISTS guards

-- Extensions for UUID generation
create extension if not exists pgcrypto;

-- 1) videos
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  video_url text not null,
  thumbnail_url text,
  duration integer not null default 0,
  reward_per_watch numeric(12,2) not null default 0,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.videos enable row level security;

-- Read for everyone (anon and authenticated)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'videos' and policyname = 'videos_select_all'
  ) then
    create policy videos_select_all on public.videos for select using (true);
  end if;
end $$;

-- Allow authenticated users to write (temporary; tighten later with admin flag)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'videos' and policyname = 'videos_write_authenticated'
  ) then
    create policy videos_write_authenticated on public.videos
      for insert with check (auth.role() = 'authenticated');
    create policy videos_update_authenticated on public.videos
      for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
    create policy videos_delete_authenticated on public.videos
      for delete using (auth.role() = 'authenticated');
  end if;
end $$;

-- 2) video_earning_rates
-- Enum vip_level_enum must exist already (it does in types)
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

-- 3) app_config (simple key/value style for app-wide settings)
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

-- 4) user_plans
-- Note: The UI queries user_plans by auth user id (supabase.auth.getUser().id)
-- To avoid friction, we store auth uid directly here.
-- If you prefer linking to internal users.id, adapt code to resolve internal id first.
create table if not exists public.user_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan_id uuid not null,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional FKs if tables exist
do $$ begin
  -- membership_plans fk
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'membership_plans') then
    begin
      alter table public.user_plans
        add constraint user_plans_plan_id_fkey foreign key (plan_id)
        references public.membership_plans (id) on delete cascade;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

alter table public.user_plans enable row level security;

-- Owner-based access: only the owning auth uid can read/write
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_plans' and policyname = 'user_plans_select_own'
  ) then
    create policy user_plans_select_own on public.user_plans for select using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_plans' and policyname = 'user_plans_insert_own'
  ) then
    create policy user_plans_insert_own on public.user_plans for insert with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_plans' and policyname = 'user_plans_update_own'
  ) then
    create policy user_plans_update_own on public.user_plans for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

-- 5) simple updated_at triggers (shared function)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$ begin
  -- videos trigger
  begin
    create trigger videos_set_updated_at
      before update on public.videos
      for each row execute function public.set_updated_at();
  exception when duplicate_object then null;
  end;

  -- video_earning_rates trigger
  begin
    create trigger video_rates_set_updated_at
      before update on public.video_earning_rates
      for each row execute function public.set_updated_at();
  exception when duplicate_object then null;
  end;

  -- app_config trigger
  begin
    create trigger app_config_set_updated_at
      before update on public.app_config
      for each row execute function public.set_updated_at();
  exception when duplicate_object then null;
  end;

  -- user_plans trigger
  begin
    create trigger user_plans_set_updated_at
      before update on public.user_plans
      for each row execute function public.set_updated_at();
  exception when duplicate_object then null;
  end;
end $$;

-- Indexes for common queries
create index if not exists idx_videos_active on public.videos (is_active);
create index if not exists idx_videos_created_at on public.videos (created_at desc);
create index if not exists idx_user_plans_user_id on public.user_plans (user_id);
create index if not exists idx_user_plans_active on public.user_plans (is_active);

-- Verification helpers (optional): quick selects
-- select * from public.videos limit 1;
-- select * from public.video_earning_rates limit 1;
-- select * from public.app_config limit 1;
-- select * from public.user_plans limit 1;