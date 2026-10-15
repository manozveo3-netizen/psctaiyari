# NextLayers Mock Test - React + Supabase

## Security first
The service-role JWT shared in chat is NOT used anywhere in this frontend. Rotate/revoke that exposed legacy service-role key in Supabase Dashboard > Settings > API Keys. Use a browser-safe Publishable key (`sb_publishable_...`) in Vite.

## Setup
This copy is configured for PSC Mock Test (cubyebzwsqxdluugznml).
The database and Auth profile hardening are already applied. Do not rerun the original migrations.

1. Follow AUTH-SETUP.md to configure allowed email redirect URLs.
2. Open this folder (the folder containing package.json) in your terminal.
3. Run `npm ci` then `npm run dev`.
4. Register, confirm your email, and log in.
5. Build with `npm run build`.

Login, registration, persisted sessions, logout, password reset and role guards are included.

## Deploy
Deploy the folder to Vercel, Netlify, Cloudflare Pages, or any static host. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build environment variables. Configure SPA fallback to `/index.html` for BrowserRouter routes.

## Included
- Email/password login + registration
- Student dashboard
- Pricing from Supabase plans
- QR-payment submission record
- Published test browser
- MCQ test runner + results
- Progress/topic mastery page
- Role-protected admin panel
- Admin catalog CRUD
- Question + option creation/removal
- Test creation/publish/remove
- Payment approval/rejection RPC and subscription activation

## Important production hardening
The current question API follows the original schema, which exposes `question_options.is_correct` to clients allowed to read options. Before a real paid launch, move test delivery/scoring to secure RPC/Edge Functions so correct answers are never sent before submission. Also add Storage bucket/policy for payment screenshot uploads and replace the QR placeholder with the real NextLayers QR.

## Admin data entry
See public/Admin_User_Manual_NE.pdf (also accessible from Admin → User Manual).
- Admin → Upload CSV imports up to 500 questions transactionally and optionally creates an unpublished demo set.
- Admin → Tests provides a question picker and publishing controls.
- Admin → Users creates students individually, from CSV (20 maximum) or with the three-demo-user preparation button.
- CSV templates are in public/templates; the demo set is already seeded as a draft in PSC Mock Test.
- The admin-users Edge Function and the two CSV/test RPCs are already deployed to this project.
- Existing SQL files are references, not first-run setup instructions.

Validation: npm run build; node verification/csv.mjs; node verification/guards.mjs; node verification/admin-users.mjs; transactional database import tests; live unauthenticated admin-users call rejected with HTTP 401.
Real-admin browser account creation and student submission still need the first-run end-to-end check described in the manual.

## Self-paced LMS and Nasu first paper

See [Frontend upgrade notes](FRONTEND-UPGRADE.md). New pages: `/courses`, `/courses/:id`, `/lessons/:id`, and `/admin/learning`. Progress now includes lessons as well as topic mastery. Quiz autosave/resume, answer review and question/option images use the secured database APIs.

Run `npm run check` and `npm run build` before deploying. NASU full mocks use syllabus distribution checks and 2 marks per question. The connected PSC Mock Test database already has the incremental SQL changes applied; do not rerun the old quiz setup SQL over it.
