-- EchoMind MVP memory schema for Supabase PostgreSQL.
-- Run this in Supabase SQL Editor. Designed for small private beta usage.

create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  anonymous_user_id text unique,
  mbti text,
  communication_style text,
  communication_style_description text,
  cognitive_stack jsonb not null default '[]'::jsonb,
  test_answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_owner_check check (user_id is not null or anonymous_user_id is not null)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_user_id text,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  topic_tag text,
  emotion_tag text,
  created_at timestamptz not null default now(),
  constraint chat_messages_owner_check check (user_id is not null or anonymous_user_id is not null)
);

create table if not exists public.conversation_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_user_id text,
  summary text not null,
  topic_tag text,
  emotion_tag text,
  created_at timestamptz not null default now(),
  constraint conversation_summaries_owner_check check (user_id is not null or anonymous_user_id is not null)
);

create table if not exists public.user_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_user_id text,
  memory text not null,
  memory_type text not null check (memory_type in ('preference', 'pain_point', 'relationship', 'goal', 'growth')),
  importance integer not null default 3 check (importance between 1 and 5),
  -- Kept as text so it can reference either an older bigint chat_messages.id
  -- or a newer uuid chat_messages.id during lightweight beta migrations.
  source_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_memories_owner_check check (user_id is not null or anonymous_user_id is not null)
);

-- Compatibility for databases that already had earlier beta tables.
-- Supabase projects created before this schema may have chat_messages.id as bigint.
alter table public.user_memories
  drop constraint if exists user_memories_source_message_id_fkey;

alter table public.user_memories
  alter column source_message_id type text using source_message_id::text;

-- Optional growth display table. Kept because the current product already has a growth page.
create table if not exists public.growth_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_user_id text,
  title text not null,
  summary text,
  signals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint growth_records_owner_check check (user_id is not null or anonymous_user_id is not null)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_user_memories_updated_at on public.user_memories;
create trigger set_user_memories_updated_at
before update on public.user_memories
for each row execute function public.set_updated_at();

create index if not exists idx_chat_messages_user_created on public.chat_messages(user_id, created_at desc);
create index if not exists idx_chat_messages_anon_created on public.chat_messages(anonymous_user_id, created_at desc);
create index if not exists idx_chat_messages_topic on public.chat_messages(user_id, topic_tag, created_at desc);
create index if not exists idx_conversation_summaries_topic on public.conversation_summaries(user_id, topic_tag, created_at desc);
create index if not exists idx_user_memories_type_importance on public.user_memories(user_id, memory_type, importance desc, created_at desc);
create index if not exists idx_growth_records_user_created on public.growth_records(user_id, created_at desc);

alter table public.user_profiles enable row level security;
alter table public.chat_messages enable row level security;
alter table public.conversation_summaries enable row level security;
alter table public.user_memories enable row level security;
alter table public.growth_records enable row level security;

drop policy if exists "Users can read their own profile" on public.user_profiles;
drop policy if exists "Users can insert their own profile" on public.user_profiles;
drop policy if exists "Users can update their own profile" on public.user_profiles;
drop policy if exists "Users can read their own chat messages" on public.chat_messages;
drop policy if exists "Users can insert their own chat messages" on public.chat_messages;
drop policy if exists "Users can read their own summaries" on public.conversation_summaries;
drop policy if exists "Users can insert their own summaries" on public.conversation_summaries;
drop policy if exists "Users can read their own memories" on public.user_memories;
drop policy if exists "Users can insert their own memories" on public.user_memories;
drop policy if exists "Users can update their own memories" on public.user_memories;
drop policy if exists "Users can read their own growth records" on public.growth_records;
drop policy if exists "Users can insert their own growth records" on public.growth_records;

create policy "Users can read their own profile"
on public.user_profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own profile"
on public.user_profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own profile"
on public.user_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can read their own chat messages"
on public.chat_messages for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own chat messages"
on public.chat_messages for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can read their own summaries"
on public.conversation_summaries for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own summaries"
on public.conversation_summaries for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can read their own memories"
on public.user_memories for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own memories"
on public.user_memories for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own memories"
on public.user_memories for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can read their own growth records"
on public.growth_records for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own growth records"
on public.growth_records for insert to authenticated
with check ((select auth.uid()) = user_id);

-- Temporary anonymous_user_id approach:
-- Generate a UUID in the browser or backend and store it as anonymous_user_id.
-- For direct browser access, prefer authenticated users because RLS cannot verify anonymous ownership safely.
-- For no-login experiments, write anonymous rows through a backend endpoint using SUPABASE_SERVICE_ROLE_KEY.
