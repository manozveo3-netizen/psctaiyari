create or replace function public.import_question_set(p_rows jsonb,p_test jsonb default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r jsonb; qid uuid; tid uuid; first_level uuid; pos integer:=0; total numeric:=0; k integer; opts jsonb; mk numeric;
begin
 if auth.uid() is null or not private.is_staff() then raise exception 'Staff access required'; end if;
 if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) not between 1 and 500 then raise exception 'Import 1 to 500 questions'; end if;
 if p_test is not null then
  if coalesce(trim(p_test->>'title'),'')='' or coalesce((p_test->>'duration_minutes')::integer,0)<1 then raise exception 'Invalid test title/duration'; end if;
  first_level:=(p_rows->0->>'exam_level_id')::uuid;
  insert into public.tests(title,test_type,exam_level_id,duration_minutes,is_demo,is_published,created_by)
  values(trim(p_test->>'title'),'demo',first_level,(p_test->>'duration_minutes')::integer,true,false,auth.uid()) returning id into tid;
 end if;
 for r in select value from jsonb_array_elements(p_rows) loop
  pos:=pos+1; opts:=r->'options';mk:=coalesce((r->>'marks')::numeric,1);
  if coalesce(trim(r->>'question_text'),'')='' or jsonb_typeof(opts)<>'array' or jsonb_array_length(opts)<>4
   or coalesce(r->>'correct_option','') not in ('A','B','C','D')
   or coalesce(r->>'difficulty','') not in ('easy','medium','hard') or mk<=0 or mk>100 then raise exception 'Invalid question at row %',pos; end if;
  for k in 0..3 loop if coalesce(trim(opts->>k),'')='' then raise exception 'Empty option at row %',pos;end if;end loop;
  if not exists(select 1 from public.exam_levels where id=(r->>'exam_level_id')::uuid and active)
    or not exists(select 1 from public.subjects where id=(r->>'subject_id')::uuid and active) then raise exception 'Invalid active level/subject at row %',pos;end if;
  if tid is not null and (r->>'exam_level_id')::uuid<>first_level then raise exception 'A test set must use one exam level';end if;
  if r->>'topic_id' is not null and not exists(select 1 from public.topics where id=(r->>'topic_id')::uuid and subject_id=(r->>'subject_id')::uuid and active) then raise exception 'Invalid topic at row %',pos;end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended((r->>'exam_level_id')||(r->>'subject_id')||lower(trim(r->>'question_text')),0));
  if exists(select 1 from public.questions where exam_level_id=(r->>'exam_level_id')::uuid and subject_id=(r->>'subject_id')::uuid and lower(trim(question_text))=lower(trim(r->>'question_text'))) then raise exception 'Duplicate existing question at row %',pos;end if;
  insert into public.questions(exam_level_id,subject_id,topic_id,question_text,difficulty,explanation,source_name,source_url,verification_status,is_human_verified,created_by,verified_by)
  values((r->>'exam_level_id')::uuid,(r->>'subject_id')::uuid,(r->>'topic_id')::uuid,trim(r->>'question_text'),(r->>'difficulty')::public.difficulty_level,r->>'explanation',r->>'source_name',r->>'source_url','verified',true,auth.uid(),auth.uid()) returning id into qid;
  for k in 0..3 loop
   insert into public.question_options(question_id,option_key,option_text,is_correct,sort_order)
   values(qid,substr('ABCD',k+1,1),opts->>k,substr('ABCD',k+1,1)=r->>'correct_option',k+1);
  end loop;
  if tid is not null then insert into public.test_questions(test_id,question_id,position,marks) values(tid,qid,pos,mk);end if;
  total:=total+mk;
 end loop;
 if tid is not null then update public.tests set total_questions=pos,total_marks=total where id=tid;end if;
 return jsonb_build_object('count',pos,'test_id',tid);
end $$;
revoke all on function public.import_question_set(jsonb,jsonb) from public,anon;
grant execute on function public.import_question_set(jsonb,jsonb) to authenticated;

create or replace function public.assign_test_questions(p_test_id uuid,p_question_ids uuid[])
returns integer language plpgsql security invoker set search_path='' as $$
declare t public.tests; n integer; total numeric;
begin
 if auth.uid() is null or not private.is_staff() then raise exception 'Staff access required';end if;
 select * into t from public.tests where id=p_test_id for update;
 if not found then raise exception 'Test not found';end if;
 if t.is_published then raise exception 'Unpublish the test before editing questions';end if;
 if coalesce(cardinality(p_question_ids),0) not between 1 and 500 then raise exception 'Choose 1 to 500 questions';end if;
 if exists(select 1 from unnest(p_question_ids) qid group by qid having count(*)>1) then raise exception 'Duplicate question IDs';end if;
 select count(*) into n from public.questions where id=any(p_question_ids) and active and verification_status='verified' and (t.exam_level_id is null or exam_level_id=t.exam_level_id);
 if n<>cardinality(p_question_ids) then raise exception 'Choose verified active questions matching the exam level';end if;
 delete from public.test_questions where test_id=p_test_id;
 insert into public.test_questions(test_id,question_id,position,marks)
 select p_test_id,qid,ordinality,1 from unnest(p_question_ids) with ordinality as x(qid,ordinality);
 update public.tests set total_questions=n,total_marks=n where id=p_test_id;
 return n;
end $$;
revoke all on function public.assign_test_questions(uuid,uuid[]) from public,anon;
grant execute on function public.assign_test_questions(uuid,uuid[]) to authenticated;
