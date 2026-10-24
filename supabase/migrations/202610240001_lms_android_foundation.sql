-- PSC Taiyari Android LMS foundation. Apply with the Supabase CLI or SQL Editor.
-- Never run this file with a browser/service-role key.  The mobile app uses only
-- VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student','reviewer','admin')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(), title_ne text not null, description text,
  is_free boolean not null default false, status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.course_units (
  id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade,
  title_ne text not null, syllabus_code text, sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(), unit_id uuid not null references public.course_units(id) on delete cascade,
  title_ne text not null, content_markdown text, objectives jsonb not null default '[]'::jsonb,
  estimated_minutes integer, sort_order integer not null default 0, is_preview boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(), lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null, resource_type text not null check (resource_type in ('note','pdf','image','video','link')),
  storage_path text, external_url text, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);
create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade, status text not null default 'active' check (status in ('active','cancelled','expired')),
  expires_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,course_id)
);
create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade, lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress','completed')), last_resource_id uuid references public.lesson_resources(id) on delete set null,
  last_position_seconds integer not null default 0 check (last_position_seconds >= 0), completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(user_id,lesson_id)
);
create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(), course_id uuid references public.courses(id) on delete set null,
  title text not null, duration_minutes integer not null default 30 check (duration_minutes > 0),
  is_published boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(), question_text text not null, explanation text, marks numeric not null default 1 check (marks > 0),
  status text not null default 'draft' check (status in ('draft','published','archived')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(), question_id uuid not null references public.questions(id) on delete cascade,
  option_key text not null, option_text text not null, is_correct boolean not null default false,
  created_at timestamptz not null default now(), unique(question_id,option_key)
);
create table if not exists public.test_questions (
  test_id uuid not null references public.tests(id) on delete cascade, question_id uuid not null references public.questions(id) on delete cascade,
  sort_order integer not null default 0, primary key(test_id,question_id)
);
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade, status text not null default 'in_progress' check (status in ('in_progress','completed')),
  total_questions integer not null default 0, correct_answers integer not null default 0, wrong_answers integer not null default 0, skipped_answers integer not null default 0,
  raw_score numeric not null default 0, percentage numeric not null default 0, saved_answers jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(), completed_at timestamptz, updated_at timestamptz not null default now()
);
create table if not exists public.attempt_answers (
  attempt_id uuid not null references public.attempts(id) on delete cascade, question_id uuid not null references public.questions(id) on delete cascade,
  selected_option_id uuid references public.question_options(id) on delete set null, is_correct boolean, created_at timestamptz not null default now(), primary key(attempt_id,question_id)
);
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','expired','cancelled')), starts_at timestamptz not null default now(), expires_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists course_units_course_order_idx on public.course_units(course_id,sort_order);
create index if not exists lessons_unit_order_idx on public.lessons(unit_id,sort_order);
create index if not exists lesson_progress_user_updated_idx on public.lesson_progress(user_id,updated_at desc);
create index if not exists attempts_user_started_idx on public.attempts(user_id,started_at desc);
create index if not exists enrollments_user_course_idx on public.course_enrollments(user_id,course_id);

create or replace function private.is_staff() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and role in ('admin','reviewer'));
$$;
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin');
$$;
revoke all on function private.is_staff() from public, anon, authenticated;
revoke all on function private.is_admin() from public, anon, authenticated;

-- The trigger is server-side, so signup never trusts mutable user_metadata for roles.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','')) on conflict(id) do nothing; return new; end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Lock down every exposed table before granting the least privilege needed by the app.
do $$ declare t text; begin
 foreach t in array array['profiles','courses','course_units','lessons','lesson_resources','course_enrollments','lesson_progress','tests','questions','question_options','test_questions','attempts','attempt_answers','subscriptions'] loop
   execute format('alter table public.%I enable row level security',t);
   execute format('revoke all on table public.%I from anon, authenticated',t);
   execute format('grant select on table public.%I to authenticated',t);
 end loop;
end $$;

create policy "profile own select" on public.profiles for select to authenticated using ((select auth.uid())=id or (select private.is_staff()));
create policy "profile own update" on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id and role='student');
create policy "published courses read" on public.courses for select to authenticated using (status='published' or (select private.is_staff()));
create policy "published units read" on public.course_units for select to authenticated using (status='published' or (select private.is_staff()));
create policy "published lessons read" on public.lessons for select to authenticated using (status='published' or (select private.is_staff()));
create policy "lesson resources read" on public.lesson_resources for select to authenticated using (exists(select 1 from public.lessons l where l.id=lesson_id and (l.status='published' or (select private.is_staff()))));
create policy "own enrollment read" on public.course_enrollments for select to authenticated using ((select auth.uid())=user_id or (select private.is_staff()));
create policy "own progress read" on public.lesson_progress for select to authenticated using ((select auth.uid())=user_id or (select private.is_staff()));
create policy "own progress write" on public.lesson_progress for insert to authenticated with check ((select auth.uid())=user_id);
create policy "own progress update" on public.lesson_progress for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "published tests read" on public.tests for select to authenticated using (is_published or (select private.is_staff()));
create policy "published questions read" on public.questions for select to authenticated using ((status='published' and exists(select 1 from public.test_questions tq join public.tests t on t.id=tq.test_id where tq.question_id=id and t.is_published)) or (select private.is_staff()));
create policy "options only via published question" on public.question_options for select to authenticated using (exists(select 1 from public.questions q where q.id=question_id and q.status='published') or (select private.is_staff()));
create policy "test mappings read" on public.test_questions for select to authenticated using (exists(select 1 from public.tests t where t.id=test_id and (t.is_published or (select private.is_staff()))));
create policy "own attempts read" on public.attempts for select to authenticated using ((select auth.uid())=user_id or (select private.is_staff()));
create policy "own answers read" on public.attempt_answers for select to authenticated using (exists(select 1 from public.attempts a where a.id=attempt_id and ((select auth.uid())=a.user_id or (select private.is_staff()))));
create policy "own subscriptions read" on public.subscriptions for select to authenticated using ((select auth.uid())=user_id or (select private.is_staff()));

-- Content authoring is staff-only; answers/results remain server-authoritative through RPCs.
do $$ declare t text; begin foreach t in array array['courses','course_units','lessons','lesson_resources','tests','questions','question_options','test_questions'] loop
 execute format('create policy "staff manage %s" on public.%I for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()))',t,t); end loop; end $$;

-- Private learning files: only staff upload, authenticated students can read published material paths.
insert into storage.buckets(id,name,public) values ('learning-materials','learning-materials',false) on conflict(id) do nothing;
create policy "learning materials authenticated read" on storage.objects for select to authenticated using (bucket_id='learning-materials');
create policy "learning materials staff insert" on storage.objects for insert to authenticated with check (bucket_id='learning-materials' and (select private.is_staff()));
create policy "learning materials staff update" on storage.objects for update to authenticated using (bucket_id='learning-materials' and (select private.is_staff())) with check (bucket_id='learning-materials' and (select private.is_staff()));
create policy "learning materials staff delete" on storage.objects for delete to authenticated using (bucket_id='learning-materials' and (select private.is_staff()));
