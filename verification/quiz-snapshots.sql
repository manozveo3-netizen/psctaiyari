-- Run after deployment/quiz-snapshot-hardening.sql. Fixtures roll back.
begin;
do $$
declare u uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); lvl uuid:=gen_random_uuid(); subj uuid:=gen_random_uuid();
 q uuid:=gen_random_uuid(); hidden uuid:=gen_random_uuid(); good uuid:=gen_random_uuid(); bad uuid:=gen_random_uuid();
 demo uuid:=gen_random_uuid(); paid uuid:=gen_random_uuid(); paid2 uuid:=gen_random_uuid(); plan uuid:=gen_random_uuid();
 payload jsonb; again jsonb; aid uuid; result_id uuid; original_deadline text;
begin
 insert into auth.users(id,email,raw_user_meta_data) values(u,u::text||'@example.com','{"full_name":"Regression student"}'),(other_user,other_user::text||'@example.com','{"full_name":"Other regression student"}');
 insert into public.exam_levels(id,code,name_ne,name_en,rank_order) values(lvl,lvl::text,'Regression','Regression',999);
 insert into public.subjects(id,code,name_ne) values(subj,subj::text,'Regression');
 insert into public.questions(id,exam_level_id,subject_id,question_text,verification_status,active)
 values(q,lvl,subj,'Visible question','verified',true),(hidden,lvl,subj,'Hidden question','draft',false);
 insert into public.question_options(id,question_id,option_key,option_text,is_correct)
 values(good,q,'A','Correct',true),(bad,q,'B','Wrong',false);
 insert into public.tests(id,title,test_type,exam_level_id,duration_minutes,is_demo,is_published)
 values(demo,'Snapshot demo','demo',lvl,15,true,true),(paid,'Paid one','full_mock',lvl,15,false,true),(paid2,'Paid two','full_mock',lvl,15,false,true);
 insert into public.test_questions(test_id,question_id,position,marks) values(demo,q,1,2),(demo,hidden,2,5),(paid,q,1,1),(paid2,q,1,1);
 insert into public.plans(id,code,name,price_npr,monthly_full_mock_limit) values(plan,plan::text,'Regression',1,1);
 insert into public.plan_access values(plan,lvl);
 insert into public.subscriptions(user_id,plan_id,starts_at,expires_at) values(u,plan,now()-interval '1 day',now()+interval '30 days');
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 payload:=public.start_quiz(demo);aid:=(payload->>'attempt_id')::uuid;original_deadline:=payload->>'deadline';
 assert jsonb_array_length(payload->'questions')=1,'Only active verified questions delivered';
 assert payload::text not like '%is_correct%','Correct answer keys must remain private';
 update public.questions set question_text='Changed text',active=false where id=q;
 update public.question_options set is_correct=not is_correct,option_text='Changed option' where question_id=q;
 update public.tests set duration_minutes=1,negative_marking=10,is_published=false where id=demo;
 delete from public.test_questions where test_id=demo;
 again:=public.start_quiz(demo);
 assert again=payload,'Resume must retain original questions and deadline even when unpublished';
 assert again->>'deadline'=original_deadline,'Deadline frozen';
 begin
  perform set_config('request.jwt.claim.sub',other_user::text,true);
  perform public.submit_quiz(aid,'{}');
  raise exception 'Cross-user submission unexpectedly succeeded';
 exception when others then
  if sqlerrm<>'Attempt not found' then raise;end if;
 end;
 perform set_config('request.jwt.claim.sub',u::text,true);
 begin
  perform public.submit_quiz(aid,null);
  raise exception 'NULL answers unexpectedly accepted';
 exception when others then if sqlerrm<>'Invalid answers' then raise;end if;end;
 result_id:=public.submit_quiz(aid,jsonb_build_object(q::text,good));
 assert result_id=aid,'Submission returns own attempt';
 assert (select total_questions=1 and correct_answers=1 and raw_score=2 and percentage=100 from public.attempts where id=aid),'Only delivered questions scored using frozen marks and answer key';
 assert public.submit_quiz(aid,'{}')=aid,'Submission retry is idempotent';
 assert (select count(*)=1 from public.attempt_answers where attempt_id=aid),'No duplicate answers on retry';
 assert not has_table_privilege('authenticated','private.quiz_snapshot_options','SELECT'),'Students cannot read answer snapshots';
 assert not has_table_privilege('anon','private.quiz_attempt_snapshots','SELECT'),'Anonymous cannot read snapshots';
 assert not has_function_privilege('authenticated','private.capture_quiz_snapshot(uuid)','EXECUTE'),'Capture helper not client callable';
 begin
  delete from public.question_options where id=good;
  raise exception 'Snapshot option deletion unexpectedly succeeded';
 exception when foreign_key_violation then null;end;
 update public.questions set active=true where id=q;
 update public.question_options set is_correct=(id=good) where question_id=q;
 payload:=public.start_quiz(paid);aid:=(payload->>'attempt_id')::uuid;
 assert public.start_quiz(paid)=payload,'Resume at quota does not spend another slot';
 begin
  perform public.start_quiz(paid2);
  raise exception 'Monthly limit unexpectedly bypassed';
 exception when others then
  if sqlerrm not like 'Monthly full mock limit reached%' then raise;end if;
 end;
 -- Type changes must not erase prior quota usage.
 update public.tests set test_type='topic',is_demo=true where id=paid;
 begin
  perform public.start_quiz(paid2);
  raise exception 'Changing test type unexpectedly bypassed quota';
 exception when others then if sqlerrm not like 'Monthly full mock limit reached%' then raise;end if;end;
 update private.quiz_attempt_snapshots set deadline=now()-interval '31 seconds' where attempt_id=aid;
 perform public.submit_quiz(aid,jsonb_build_object(q::text,good));
 assert (select skipped_answers=1 and correct_answers=0 from public.attempts where id=aid),'Late answers not accepted';
 -- Past-month attempts do not consume this month's limit.
 update public.attempts set started_at=(date_trunc('month',now() at time zone 'Asia/Kathmandu') at time zone 'Asia/Kathmandu')-interval '1 second' where id=aid;
 payload:=public.start_quiz(paid2);
 assert payload->>'attempt_id' is not null,'Previous calendar month usage excluded';
end $$;
rollback;
