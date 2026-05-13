create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mbti_type text,
  communication_style text,
  test_answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  mbti_type text,
  communication_style text,
  created_at timestamptz not null default now()
);

create table if not exists public.growth_records (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text,
  signals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
alter table public.chat_messages enable row level security;
alter table public.growth_records enable row level security;

drop policy if exists "Users can read their own profile" on public.user_profiles;
drop policy if exists "Users can insert their own profile" on public.user_profiles;
drop policy if exists "Users can update their own profile" on public.user_profiles;
drop policy if exists "Users can read their own chat messages" on public.chat_messages;
drop policy if exists "Users can insert their own chat messages" on public.chat_messages;
drop policy if exists "Users can read their own growth records" on public.growth_records;
drop policy if exists "Users can insert their own growth records" on public.growth_records;
create policy "Users can read their own profile"
on public.user_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own profile"
on public.user_profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own profile"
on public.user_profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can read their own chat messages"
on public.chat_messages for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own chat messages"
on public.chat_messages for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can read their own growth records"
on public.growth_records for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own growth records"
on public.growth_records for insert
to authenticated
with check ((select auth.uid()) = user_id);