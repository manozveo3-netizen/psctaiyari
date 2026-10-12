-- Run AFTER nextlayers_mocktest_schema_validated.sql
-- Enables admin/reviewer content management and secure payment approval.

grant select on public.profiles, public.payments, public.subscriptions, public.question_reports to authenticated;
grant insert, update, delete on public.exam_categories, public.exam_levels, public.subjects, public.exam_level_subjects, public.topics, public.questions, public.question_options, public.tests, public.test_questions, public.current_affairs to authenticated;
grant update on public.payments, public.question_reports to authenticated;

-- Staff catalog/content policies
DO $$ DECLARE t text; BEGIN
FOREACH t IN ARRAY ARRAY['exam_categories','exam_levels','subjects','exam_level_subjects','topics','questions','question_options','tests','test_questions','current_affairs'] LOOP
  EXECUTE format('drop policy if exists "staff insert %s" on public.%I', t, t);
  EXECUTE format('drop policy if exists "staff update %s" on public.%I', t, t);
  EXECUTE format('drop policy if exists "staff delete %s" on public.%I', t, t);
  EXECUTE format('create policy "staff insert %s" on public.%I for insert to authenticated with check ((select private.is_staff()))', t, t);
  EXECUTE format('create policy "staff update %s" on public.%I for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()))', t, t);
  EXECUTE format('create policy "staff delete %s" on public.%I for delete to authenticated using ((select private.is_staff()))', t, t);
END LOOP; END $$;

-- Staff can see drafts/unpublished content
create policy "staff all questions read" on public.questions for select to authenticated using ((select private.is_staff()));
create policy "staff all options read" on public.question_options for select to authenticated using ((select private.is_staff()));
create policy "staff all tests read" on public.tests for select to authenticated using ((select private.is_staff()));
create policy "staff all test questions read" on public.test_questions for select to authenticated using ((select private.is_staff()));
create policy "staff all current affairs read" on public.current_affairs for select to authenticated using ((select private.is_staff()));

-- Admin payment updates are done via SECURITY DEFINER RPC, not arbitrary browser update.
create or replace function public.approve_payment(p_payment_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare p public.payments; d int; sub_id uuid;
begin
  if not private.is_admin() then raise exception 'Admin access required'; end if;
  select * into p from public.payments where id=p_payment_id for update;
  if p.id is null then raise exception 'Payment not found'; end if;
  if p.status <> 'pending' then raise exception 'Payment already processed'; end if;
  select duration_days into d from public.plans where id=p.plan_id;
  update public.payments set status='approved',verified_at=now(),verified_by=auth.uid(),rejection_reason=null where id=p.id;
  insert into public.subscriptions(user_id,plan_id,payment_id,starts_at,expires_at,status)
  values(p.user_id,p.plan_id,p.id,now(),now()+make_interval(days=>d),'active') returning id into sub_id;
  return sub_id;
end $$;

create or replace function public.reject_payment(p_payment_id uuid,p_reason text default 'Rejected by admin')
returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.is_admin() then raise exception 'Admin access required'; end if;
  update public.payments set status='rejected',verified_at=now(),verified_by=auth.uid(),rejection_reason=p_reason where id=p_payment_id and status='pending';
  if not found then raise exception 'Pending payment not found'; end if;
end $$;

revoke all on function public.approve_payment(uuid) from public,anon;
revoke all on function public.reject_payment(uuid,text) from public,anon;
grant execute on function public.approve_payment(uuid) to authenticated;
grant execute on function public.reject_payment(uuid,text) to authenticated;

-- Promote your FIRST admin manually after registering:
-- update public.profiles set role='admin' where id=(select id from auth.users where email='YOUR_EMAIL');
