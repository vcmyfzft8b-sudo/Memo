create table if not exists public.lecture_practice_test_assets (
  lecture_id uuid primary key references public.lectures (id) on delete cascade,
  status text not null default 'queued' check (
    status in ('queued', 'generating', 'ready', 'failed')
  ),
  error_message text,
  model_metadata jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.practice_test_questions (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures (id) on delete cascade,
  idx integer not null,
  prompt text not null,
  answer_guide text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  source_locator text,
  source_unit_idx integer,
  concept_key text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists practice_test_questions_lecture_idx_unique
  on public.practice_test_questions (lecture_id, idx);

create table if not exists public.practice_test_attempts (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'in_progress' check (
    status in ('in_progress', 'submitted', 'graded', 'failed')
  ),
  question_count integer not null check (question_count between 1 and 30),
  total_score integer,
  max_score integer,
  percentage numeric(5, 2),
  graded_at timestamptz,
  model_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists practice_test_attempts_lecture_user_created_idx
  on public.practice_test_attempts (lecture_id, user_id, created_at asc);

create table if not exists public.practice_test_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.practice_test_attempts (id) on delete cascade,
  practice_test_question_id uuid not null references public.practice_test_questions (id) on delete cascade,
  idx integer not null,
  typed_answer text,
  photo_path text,
  photo_mime_type text,
  declared_unknown boolean not null default false,
  score integer check (score between 0 and 5),
  grading_rationale text,
  strengths text,
  missing_points text,
  expected_answer text,
  grading_confidence text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists practice_test_attempt_answers_attempt_idx_unique
  on public.practice_test_attempt_answers (attempt_id, idx);

alter table public.lecture_study_sessions
  drop constraint if exists lecture_study_sessions_active_study_view_check;

alter table public.lecture_study_sessions
  add constraint lecture_study_sessions_active_study_view_check
  check (active_study_view in ('flashcards', 'quiz', 'practice_test'));

alter table public.lecture_study_sessions
  add column if not exists practice_test_state jsonb;

drop trigger if exists lecture_practice_test_assets_set_updated_at on public.lecture_practice_test_assets;
create trigger lecture_practice_test_assets_set_updated_at
before update on public.lecture_practice_test_assets
for each row execute procedure public.set_updated_at();

drop trigger if exists practice_test_attempts_set_updated_at on public.practice_test_attempts;
create trigger practice_test_attempts_set_updated_at
before update on public.practice_test_attempts
for each row execute procedure public.set_updated_at();

drop trigger if exists practice_test_attempt_answers_set_updated_at on public.practice_test_attempt_answers;
create trigger practice_test_attempt_answers_set_updated_at
before update on public.practice_test_attempt_answers
for each row execute procedure public.set_updated_at();

alter table public.lecture_practice_test_assets enable row level security;
alter table public.practice_test_questions enable row level security;
alter table public.practice_test_attempts enable row level security;
alter table public.practice_test_attempt_answers enable row level security;

create policy "lecture_practice_test_assets_select_own"
  on public.lecture_practice_test_assets
  for select
  using (
    exists (
      select 1
      from public.lectures
      where lectures.id = lecture_practice_test_assets.lecture_id
        and lectures.user_id = auth.uid()
    )
  );

create policy "practice_test_questions_select_own"
  on public.practice_test_questions
  for select
  using (
    exists (
      select 1
      from public.lectures
      where lectures.id = practice_test_questions.lecture_id
        and lectures.user_id = auth.uid()
    )
  );

create policy "practice_test_attempts_select_own"
  on public.practice_test_attempts
  for select
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.lectures
      where lectures.id = practice_test_attempts.lecture_id
        and lectures.user_id = auth.uid()
    )
  );

create policy "practice_test_attempts_insert_own"
  on public.practice_test_attempts
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.lectures
      where lectures.id = practice_test_attempts.lecture_id
        and lectures.user_id = auth.uid()
    )
  );

create policy "practice_test_attempts_update_own"
  on public.practice_test_attempts
  for update
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.lectures
      where lectures.id = practice_test_attempts.lecture_id
        and lectures.user_id = auth.uid()
    )
  );

create policy "practice_test_attempt_answers_select_own"
  on public.practice_test_attempt_answers
  for select
  using (
    exists (
      select 1
      from public.practice_test_attempts
      join public.lectures on lectures.id = practice_test_attempts.lecture_id
      where practice_test_attempts.id = practice_test_attempt_answers.attempt_id
        and practice_test_attempts.user_id = auth.uid()
        and lectures.user_id = auth.uid()
    )
  );

create policy "practice_test_attempt_answers_insert_own"
  on public.practice_test_attempt_answers
  for insert
  with check (
    exists (
      select 1
      from public.practice_test_attempts
      join public.lectures on lectures.id = practice_test_attempts.lecture_id
      where practice_test_attempts.id = practice_test_attempt_answers.attempt_id
        and practice_test_attempts.user_id = auth.uid()
        and lectures.user_id = auth.uid()
    )
  );

create policy "practice_test_attempt_answers_update_own"
  on public.practice_test_attempt_answers
  for update
  using (
    exists (
      select 1
      from public.practice_test_attempts
      join public.lectures on lectures.id = practice_test_attempts.lecture_id
      where practice_test_attempts.id = practice_test_attempt_answers.attempt_id
        and practice_test_attempts.user_id = auth.uid()
        and lectures.user_id = auth.uid()
    )
  );
