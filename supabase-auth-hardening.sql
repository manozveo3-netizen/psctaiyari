-- Applied to PSC Mock Test. Preserve ownership checks and make roles immutable to clients.
revoke update on public.profiles from authenticated, anon;
revoke update (id, full_name, phone, avatar_url, role, target_exam_level_id, exam_date, created_at, updated_at) on public.profiles from authenticated, anon;
grant update (full_name, phone, avatar_url, target_exam_level_id, exam_date) on public.profiles to authenticated;
alter policy "users update own profile" on public.profiles
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
-- This function is trigger-only; clients must not invoke it directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
