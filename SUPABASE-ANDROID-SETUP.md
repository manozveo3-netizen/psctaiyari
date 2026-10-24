# Supabase setup for PSC Taiyari Android

1. Create/link the Supabase project, then apply `supabase/migrations/202610240001_lms_android_foundation.sql` through the CLI or SQL Editor. It is intentionally migration-first because this checkout has no authenticated Supabase CLI project link.
2. In **Authentication → URL Configuration**, add the Android-safe redirect URLs documented in `ANDROID-APP.md` (`https://psctaiyari.com/login` and `/reset-password`). Enable Email OTP or Email/Password as the chosen login method.
3. Promote the first administrator from a trusted SQL-editor session only: `update public.profiles set role='admin' where id='<auth-user-uuid>';`. Do not put a role in user metadata.
4. Create published course, unit, lesson, test and question records; upload PDFs/images to the private `learning-materials` bucket. Store only the object path in `lesson_resources.storage_path`.
5. Configure only these client environment variables in the CI/build environment:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_ANDROID_DISTRIBUTION` (optional, build policy flag)

No service-role key belongs in the app, GitHub variables, or an `.env` committed to Git. The provided migration enables RLS and removes default client grants before allowing required operations. Quiz start/save/submit must continue to use server RPCs (`start_quiz`, `save_quiz_answers`, `submit_quiz`) so a client cannot set its own score.

Before production, run Supabase Database Advisors and add policy tests for the existing quiz RPC migration (`deployment/secure-quiz.sql`). Apply that migration before creating production attempts.
