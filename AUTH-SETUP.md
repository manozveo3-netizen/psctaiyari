# Auth setup — PSC Mock Test

Project: cubyebzwsqxdluugznml. The included .env.local is configured with this project's browser-safe public API key. No service-role or secret key is included.

## Run on Windows

Extract the ZIP. Open a terminal in nextlayers-mocktest-react (the folder containing package.json):

```bat
npm ci
npm run dev
```

Open http://localhost:5173. Do not rerun the original schema or admin migration: the database already contains them and the Auth hardening below is already applied.

## Remaining dashboard settings

The plugin provides database operations but does not expose an Auth configuration update tool. Email login and signup are enabled; email confirmation is required (verified via the Auth settings endpoint).

Open https://supabase.com/dashboard/project/cubyebzwsqxdluugznml/auth/url-configuration and set:

- Site URL: http://localhost:5173 during local development; your actual website origin when deployed.
- Additional Redirect URLs: http://localhost:5173/login and http://localhost:5173/reset-password.
- Add the exact production /login and /reset-password URLs when you deploy.

Then register your own email, confirm it, and sign in. Use Forgot password to test the email recovery flow. Live email delivery, confirmation, recovery and real-user login/logout still require this final end-to-end check. Default Supabase SMTP has recipient/rate restrictions; configure custom SMTP for public registrations: https://supabase.com/docs/guides/auth/auth-smtp.

## Access rules

Public: home, pricing, test catalogue, login and reset-password entry point.
Login required: dashboard, payment, test runner, results and progress.
Admin/reviewer: admin overview, questions and tests.
Admin only: admin catalogue and payments.
The reset form requires a valid Supabase session from the recovery link.

Sessions persist across refresh. Signed-out navigation preserves the requested path after login. Guards wait for the profile and block access on profile errors. Authoritative roles come from the protected profiles table, never editable user metadata. Database RLS enforces data access separately from browser navigation.

## Applied database change

secure_profile_auth_updates:
- Preserve own-profile SELECT policy and ownership checks.
- Allow updates only to full_name, phone, avatar_url, target_exam_level_id and exam_date.
- Block client changes to role and identity fields.
- Remove the recursive role lookup from the own-profile UPDATE policy.
- Revoke client execution of the signup trigger function.

supabase-auth-hardening.sql records the applied SQL. It does not need to be rerun.

## Verification completed

- Production build passed.
- Eight route guard checks passed: loading, signed-out return URL, profile errors, student routes, student admin rejection, reviewer access, reviewer admin-only rejection, admin-only access.
- Transactional database tests passed: signup trigger creates student profile even with role=admin in user metadata; own profile updates succeed; cross-user reads/updates and client role escalation are blocked. All synthetic test users were rolled back.
- Public Auth settings verified: email enabled, signup enabled, confirmation required.
- Anonymous profile access checked via Data API.

No production deployment or real-user email flow was performed.

## Existing quiz limitations

This task completes Auth code and profile authorization hardening. It does not redesign quiz scoring or subscriptions. The existing question API exposes correct-answer flags and lacks complete paid-content entitlement enforcement; scores are client-writable. Resolve those through secure server-side test delivery/scoring before a paid launch.

Security advisors still flag the two admin payment SECURITY DEFINER RPCs (their bodies check private.is_admin()) and disabled leaked-password protection. References:
https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
