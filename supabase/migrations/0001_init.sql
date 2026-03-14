create extension if not exists vector;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.lectures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  source_type text not null default 'audio',
  storage_path text,
  duration_seconds integer,
  status text not null default 'uploading' check (
    status in ('uploading', 'queued', 'transcribing', 'generating_notes', 'ready', 'failed')
  ),
  language_hint text default 'sl',
  error_message text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures (id) on delete cascade,
  idx integer not null,
  start_ms integer not null,
  end_ms integer not null,
  speaker_label text,
  text text not null,
  embedding vector(1536),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists transcript_segments_lecture_idx_unique
  on public.transcript_segments (lecture_id, idx);

create table if not exists public.lecture_artifacts (
  lecture_id uuid primary key references public.lectures (id) on delete cascade,
  summary text not null,
  key_topics text[] not null default '{}',
  structured_notes_md text not null,
  model_metadata jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists lectures_set_updated_at on public.lectures;

create trigger lectures_set_updated_at
before update on public.lectures
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.lectures enable row level security;
alter table public.transcript_segments enable row level security;
alter table public.lecture_artifacts enable row level security;
alter table public.chat_messages enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id);

create policy "lectures_select_own"
  on public.lectures
  for select
  using (auth.uid() = user_id);

create policy "lectures_insert_own"
  on public.lectures
  for insert
  with check (auth.uid() = user_id);

create policy "lectures_update_own"
  on public.lectures
  for update
  using (auth.uid() = user_id);

create policy "transcript_segments_select_own"
  on public.transcript_segments
  for select
  using (
    exists (
      select 1
      from public.lectures
      where lectures.id = transcript_segments.lecture_id
        and lectures.user_id = auth.uid()
    )
  );

create policy "lecture_artifacts_select_own"
  on public.lecture_artifacts
  for select
  using (
    exists (
      select 1
      from public.lectures
      where lectures.id = lecture_artifacts.lecture_id
        and lectures.user_id = auth.uid()
    )
  );

create policy "chat_messages_select_own"
  on public.chat_messages
  for select
  using (auth.uid() = user_id);

create policy "chat_messages_insert_own"
  on public.chat_messages
  for insert
  with check (auth.uid() = user_id);

create or replace function public.match_transcript_segments(
  query_embedding vector(1536),
  filter_lecture_id uuid,
  match_count integer default 6
)
returns table (
  id uuid,
  lecture_id uuid,
  idx integer,
  start_ms integer,
  end_ms integer,
  speaker_label text,
  text text,
  similarity double precision
)
language sql
stable
as $$
  select
    transcript_segments.id,
    transcript_segments.lecture_id,
    transcript_segments.idx,
    transcript_segments.start_ms,
    transcript_segments.end_ms,
    transcript_segments.speaker_label,
    transcript_segments.text,
    1 - (transcript_segments.embedding <=> query_embedding) as similarity
  from public.transcript_segments
  where transcript_segments.lecture_id = filter_lecture_id
    and transcript_segments.embedding is not null
  order by transcript_segments.embedding <=> query_embedding
  limit match_count;
$$;

insert into storage.buckets (id, name, public)
values ('lecture-audio', 'lecture-audio', false)
on conflict (id) do nothing;
