-- Apply together with the updated frontend. Existing attempts remain readable.
create or replace function private.quiz_access(t public.tests) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (private.is_staff() or (
 t.is_published and (t.available_from is null or t.available_from<=now())
 and (t.available_until is null or t.available_until>now()) and
 (t.is_demo or exists(select 1 from public.subscriptions s join public.plans p on p.id=s.plan_id
 where s.user_id=auth.uid() and s.status='active' and p.active and s.starts_at<=now() and s.expires_at>now()
 and exists(select 1 from public.plan_access pa where pa.plan_id=s.plan_id and pa.exam_level_id=t.exam_level_id)))))
$$;
create or replace function private.start_quiz(p_test_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t public.tests; a public.attempts; qs jsonb;
begin
 select * into t from public.tests where id=p_test_id;
 if not found or not private.quiz_access(t) then raise exception 'Test unavailable or subscription required';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_test_id::text,0));
 select * into a from public.attempts where user_id=auth.uid() and test_id=p_test_id and status='in_progress' order by started_at desc limit 1;
 select jsonb_agg(jsonb_build_object('id',q.id,'question_text',q.question_text,'marks',tq.marks,'question_options',
 (select jsonb_agg(jsonb_build_object('id',o.id,'option_key',o.option_key,'option_text',o.option_text) order by o.option_key) from public.question_options o where o.question_id=q.id)) order by tq.position)
 into qs from public.test_questions tq join public.questions q on q.id=tq.question_id where tq.test_id=t.id and q.active and q.verification_status='verified';
 if qs is null then raise exception 'This test has no available questions';end if;
 if a.id is null then insert into public.attempts(user_id,test_id,total_questions,status) values(auth.uid(),t.id,jsonb_array_length(qs),'in_progress') returning * into a;end if;
 return jsonb_build_object('attempt_id',a.id,'title',t.title,'deadline',a.started_at+make_interval(mins=>t.duration_minutes),'questions',qs);
end $$;
create or replace function private.submit_quiz(p_attempt_id uuid,p_answers jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare a public.attempts;t public.tests;r record;oid uuid;c integer:=0;w integer:=0;n integer:=0;score numeric:=0;marks numeric:=0;ok boolean;
begin
 if auth.uid() is null then raise exception 'Login required';end if;
 select * into a from public.attempts where id=p_attempt_id and user_id=auth.uid() for update;
 if not found then raise exception 'Attempt not found';end if;
 if a.status='completed' then return a.id;end if;
 if a.status<>'in_progress' then raise exception 'Attempt cannot be submitted';end if;
 if jsonb_typeof(p_answers)<>'object' or octet_length(p_answers::text)>100000 then raise exception 'Invalid answers';end if;
 select * into t from public.tests where id=a.test_id;
 -- A small network grace period allows automatic submissions at the deadline.
 if now()>a.started_at+make_interval(mins=>t.duration_minutes)+interval '30 seconds' then p_answers:='{}'::jsonb;end if;
 for r in select tq.question_id,tq.marks from public.test_questions tq where tq.test_id=t.id loop
 n:=n+1;marks:=marks+r.marks;oid:=nullif(p_answers->>r.question_id::text,'')::uuid;ok:=false;
 if oid is not null then
  select is_correct into ok from public.question_options where id=oid and question_id=r.question_id;
  if not found then raise exception 'Invalid option';end if;
  if ok then c:=c+1;score:=score+r.marks;else w:=w+1;score:=score+(-coalesce(t.negative_marking,0));end if;
 end if;
 insert into public.attempt_answers(attempt_id,question_id,selected_option_id,is_correct) values(a.id,r.question_id,oid,coalesce(ok,false));
 end loop;
 update public.attempts set completed_at=now(),total_questions=n,correct_answers=c,wrong_answers=w,skipped_answers=n-c-w,raw_score=score,
 percentage=case when marks>0 then greatest(0,least(100,round(score/marks*100,2))) else 0 end,
 time_taken_seconds=least(t.duration_minutes*60,greatest(0,extract(epoch from now()-a.started_at)::integer)),status='completed' where id=a.id;
 return a.id;
end $$;
revoke all on function private.quiz_access(public.tests),private.start_quiz(uuid),private.submit_quiz(uuid,jsonb) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.start_quiz(uuid),private.submit_quiz(uuid,jsonb) to authenticated;
create or replace function public.start_quiz(p_test_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.start_quiz(p_test_id)$$;
create or replace function public.submit_quiz(p_attempt_id uuid,p_answers jsonb) returns uuid language sql security invoker set search_path='' as $$select private.submit_quiz(p_attempt_id,p_answers)$$;
revoke all on function public.start_quiz(uuid),public.submit_quiz(uuid,jsonb) from public,anon;
grant execute on function public.start_quiz(uuid),public.submit_quiz(uuid,jsonb) to authenticated;
drop policy if exists "public verified question options" on public.question_options;
drop policy if exists "public verified questions" on public.questions;
drop policy if exists "users create own attempts" on public.attempts;
drop policy if exists "users update own attempts" on public.attempts;
drop policy if exists "users insert own answers" on public.attempt_answers;
drop policy if exists "users update own answers" on public.attempt_answers;
