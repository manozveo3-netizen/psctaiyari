-- Apply after secure-quiz.sql. Run the complete file as one transaction.
begin;
create table if not exists private.quiz_attempt_snapshots (
 attempt_id uuid primary key references public.attempts(id) on delete cascade,
 title text not null,
 deadline timestamptz not null,
 duration_minutes integer not null check (duration_minutes>0),
 negative_marking numeric not null,
 test_type text not null,
 is_demo boolean not null,
 questions jsonb not null
);
create table if not exists private.quiz_snapshot_questions (
 attempt_id uuid not null references private.quiz_attempt_snapshots(attempt_id) on delete cascade,
 question_id uuid not null references public.questions(id) on delete restrict,
 marks numeric not null check (marks>0),
 primary key(attempt_id,question_id)
);
create table if not exists private.quiz_snapshot_options (
 attempt_id uuid not null,
 question_id uuid not null,
 option_id uuid not null references public.question_options(id) on delete restrict,
 is_correct boolean not null,
 primary key(attempt_id,question_id,option_id),
 foreign key(attempt_id,question_id) references private.quiz_snapshot_questions(attempt_id,question_id) on delete cascade
);
alter table private.quiz_attempt_snapshots enable row level security;
alter table private.quiz_snapshot_questions enable row level security;
alter table private.quiz_snapshot_options enable row level security;
revoke all on private.quiz_attempt_snapshots,private.quiz_snapshot_questions,private.quiz_snapshot_options from public,anon,authenticated;

-- Internal only: answer keys never appear in the browser payload.
create or replace function private.capture_quiz_snapshot(p_attempt_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare a public.attempts; t public.tests; qs jsonb; internal_questions jsonb;
begin
 select * into a from public.attempts where id=p_attempt_id for update;
 if not found then raise exception 'Attempt not found';end if;
 if exists(select 1 from private.quiz_attempt_snapshots where attempt_id=a.id) then return;end if;
 select * into t from public.tests where id=a.test_id;
 if t.duration_minutes is null or t.duration_minutes<1 then raise exception 'Test duration must be a positive number of minutes';end if;
 select jsonb_agg(jsonb_build_object('id',q.id,'question_text',q.question_text,'marks',tq.marks,'question_options',
  (select jsonb_agg(jsonb_build_object('id',o.id,'option_key',o.option_key,'option_text',o.option_text,'is_correct',o.is_correct) order by o.option_key)
   from public.question_options o where o.question_id=q.id)) order by tq.position)
 into internal_questions from public.test_questions tq join public.questions q on q.id=tq.question_id
 where tq.test_id=t.id and q.active and q.verification_status='verified';
 if internal_questions is null then raise exception 'This test has no available questions';end if;
 select jsonb_agg(q || jsonb_build_object('question_options',
  (select jsonb_agg(o - 'is_correct' order by o->>'option_key') from jsonb_array_elements(q->'question_options') o)) order by ord)
 into qs from jsonb_array_elements(internal_questions) with ordinality as x(q,ord);
 insert into private.quiz_attempt_snapshots values(a.id,t.title,a.started_at+make_interval(mins=>t.duration_minutes),t.duration_minutes,t.negative_marking,t.test_type::text,t.is_demo,qs);
 insert into private.quiz_snapshot_questions(attempt_id,question_id,marks)
 select a.id,(q->>'id')::uuid,(q->>'marks')::numeric from jsonb_array_elements(qs) q;
 insert into private.quiz_snapshot_options(attempt_id,question_id,option_id,is_correct)
 select a.id,(q->>'id')::uuid,(o->>'id')::uuid,(o->>'is_correct')::boolean
 from jsonb_array_elements(internal_questions) q cross join lateral jsonb_array_elements(q->'question_options') o;
 if exists(select 1 from private.quiz_snapshot_questions sq left join private.quiz_snapshot_options o
  on o.attempt_id=sq.attempt_id and o.question_id=sq.question_id where sq.attempt_id=a.id
  group by sq.question_id having count(o.option_id)<2 or count(*) filter(where o.is_correct)<>1)
 then raise exception 'Each question needs options and exactly one correct answer';end if;
 update public.attempts set total_questions=jsonb_array_length(qs) where id=a.id;
end $$;
revoke all on function private.capture_quiz_snapshot(uuid) from public,anon,authenticated;

-- Existing in-progress attempts use current content at deployment time.
-- Historical content before this upgrade cannot be reconstructed.
do $$ declare a record;begin
 for a in select id from public.attempts where status='in_progress' loop
  perform private.capture_quiz_snapshot(a.id);
 end loop;
end $$;

create or replace function private.start_quiz(p_test_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t public.tests; a public.attempts; s private.quiz_attempt_snapshots; quota integer; used bigint; month_start timestamptz;
begin
 if auth.uid() is null then raise exception 'Login required';end if;
 -- Serialize starts across all tests for this user so quotas cannot race.
 perform pg_advisory_xact_lock(hashtextextended('quiz-user:'||auth.uid()::text,0));
 select * into a from public.attempts where user_id=auth.uid() and test_id=p_test_id and status='in_progress' order by started_at desc limit 1;
 if a.id is null then
  select * into t from public.tests where id=p_test_id;
  if not found or not private.quiz_access(t) then raise exception 'Test unavailable or subscription required';end if;
  if t.test_type='full_mock' and not t.is_demo and not private.is_staff() then
   select max(p.monthly_full_mock_limit) into quota from public.subscriptions sub join public.plans p on p.id=sub.plan_id
   where sub.user_id=auth.uid() and sub.status='active' and p.active and sub.starts_at<=now() and sub.expires_at>now()
    and exists(select 1 from public.plan_access pa where pa.plan_id=p.id and pa.exam_level_id=t.exam_level_id);
   month_start:=date_trunc('month',now() at time zone 'Asia/Kathmandu') at time zone 'Asia/Kathmandu';
   select count(*) into used from public.attempts atp join public.tests tst on tst.id=atp.test_id
    left join private.quiz_attempt_snapshots snap on snap.attempt_id=atp.id
    where atp.user_id=auth.uid() and atp.started_at>=month_start
     and coalesce(snap.test_type,tst.test_type::text)='full_mock' and not coalesce(snap.is_demo,tst.is_demo);
   if used>=coalesce(quota,0) then raise exception 'Monthly full mock limit reached. Try again next month or upgrade your plan.';end if;
  end if;
  insert into public.attempts(user_id,test_id,status) values(auth.uid(),t.id,'in_progress') returning * into a;
 end if;
 perform private.capture_quiz_snapshot(a.id);
 select * into s from private.quiz_attempt_snapshots where attempt_id=a.id;
 return jsonb_build_object('attempt_id',a.id,'title',s.title,'deadline',s.deadline,'questions',s.questions);
end $$;

create or replace function private.submit_quiz(p_attempt_id uuid,p_answers jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare a public.attempts; s private.quiz_attempt_snapshots; r record; oid uuid;
 c integer:=0;w integer:=0;n integer:=0;score numeric:=0;marks numeric:=0;ok boolean;
begin
 if auth.uid() is null then raise exception 'Login required';end if;
 select * into a from public.attempts where id=p_attempt_id and user_id=auth.uid() for update;
 if not found then raise exception 'Attempt not found';end if;
 if a.status='completed' then return a.id;end if;
 if a.status<>'in_progress' then raise exception 'Attempt cannot be submitted';end if;
 if p_answers is null or jsonb_typeof(p_answers)<>'object' or octet_length(p_answers::text)>100000 then raise exception 'Invalid answers';end if;
 select * into s from private.quiz_attempt_snapshots where attempt_id=a.id;
 if not found then raise exception 'Attempt snapshot missing. Please contact support.';end if;
 if now()>s.deadline+interval '30 seconds' then p_answers:='{}'::jsonb;end if;
 for r in select * from private.quiz_snapshot_questions where attempt_id=a.id loop
  n:=n+1;marks:=marks+r.marks;oid:=nullif(p_answers->>r.question_id::text,'')::uuid;ok:=false;
  if oid is not null then
   select is_correct into ok from private.quiz_snapshot_options where attempt_id=a.id and question_id=r.question_id and option_id=oid;
   if not found then raise exception 'Invalid option';end if;
   if ok then c:=c+1;score:=score+r.marks;else w:=w+1;score:=score-s.negative_marking;end if;
  end if;
  insert into public.attempt_answers(attempt_id,question_id,selected_option_id,is_correct) values(a.id,r.question_id,oid,ok);
 end loop;
 update public.attempts set completed_at=now(),total_questions=n,correct_answers=c,wrong_answers=w,skipped_answers=n-c-w,raw_score=score,
  percentage=case when marks>0 then greatest(0,least(100,round(score/marks*100,2))) else 0 end,
  time_taken_seconds=least(s.duration_minutes*60,greatest(0,extract(epoch from now()-a.started_at)::integer)),status='completed' where id=a.id;
 return a.id;
end $$;
revoke all on function private.start_quiz(uuid),private.submit_quiz(uuid,jsonb) from public,anon;
grant execute on function private.start_quiz(uuid),private.submit_quiz(uuid,jsonb) to authenticated;
commit;
