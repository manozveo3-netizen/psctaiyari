-- Grants every newly created user full access to all courses that are published
-- at signup for seven days. The database trigger enforces expiry server-side.

begin;

alter table public.course_enrollments
  drop constraint if exists course_enrollments_access_type_check;

alter table public.course_enrollments
  add constraint course_enrollments_access_type_check
  check (access_type = any (array['free'::text, 'subscription'::text, 'manual'::text, 'trial'::text]));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;

  insert into public.course_enrollments (
    user_id, course_id, status, access_type, enrolled_at, expires_at
  )
  select
    new.id, c.id, 'active', 'trial', now(), now() + interval '7 days'
  from public.courses c
  where c.status = 'published'
  on conflict (user_id, course_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

commit;
