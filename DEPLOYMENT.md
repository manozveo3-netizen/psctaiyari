# Deploy psctaiyari

1. Use Node.js 22 LTS. In the project folder run `npm ci`.
2. Copy `.env.example` to `.env.local`, set the actual project publishable key, and optionally set `VITE_PAYMENT_QR_URL` to your real QR image. Never use a service-role key. Environment values are embedded at build time; rebuild after changing them.
3. Run `npm run build`. Serve `dist` through Nginx using `deployment/nginx.conf` as a reference. Preserve existing HTTPS/Certbot configuration. Do not run the Vite development server for production.
4. Apply `supabase-bulk-import.sql` and `deployment/secure-quiz.sql`, then `deployment/quiz-snapshot-hardening.sql` in the target Supabase SQL Editor in coordination with deploying this frontend. The security SQL disables the old client-scored quiz flow: older frontend builds must be replaced immediately. Clear/reload old browser tabs.
5. Deploy `supabase/functions/admin-users/index.ts` to the same Supabase project. It validates user JWTs in the function body; gateway JWT verification can be disabled for publishable-key compatibility. No service key belongs in the frontend.
6. Set Supabase Site URL to `https://psctaiyari.com` and add exact `/login` and `/reset-password` redirect URLs. Add `www` equivalents if you serve that origin. Configure custom SMTP and verify signup confirmation and password recovery using a real account.
7. Install a valid TLS certificate, verify DNS points to the VPS, test `nginx -t`, then reload Nginx.

## VPS update

```bash
cd /home/myadmin/psctaiyari
git pull --ff-only
npm ci
npm run build
sudo nginx -t
sudo systemctl reload nginx
```

Check register/confirm/login/logout, reset-password, dashboard refresh, admin CSV duplicate imports, admin users, a demo test refresh and timed submission, and subscription access with an unpaid user. Confirm payment QR belongs to your business before accepting payments.

Quiz attempts are timed by the database. Browser answers survive refresh on the same browser and user. Closing the browser does not pause the timer. Submissions more than 30 seconds late record unanswered questions rather than accepting late answers. Monthly full-mock quotas are enforced for non-demo full mocks using the Nepal calendar month. Each new attempt consumes one slot, including abandoned attempts; refresh/resume does not consume another. Usage is shared across exam levels; overlapping eligible subscriptions use the highest applicable limit. Demo tests and staff are exempt. AI-analysis quotas are not implemented. Active paid access is limited by plan exam level and subscription dates.

## Quiz snapshot upgrade

Apply `deployment/quiz-snapshot-hardening.sql` after the original security SQL. Do not reapply `secure-quiz.sql` alone after upgrading, because it replaces the hardened functions. Snapshot tables remain private and hold frozen questions, options, answer keys, marks, negative marking and deadlines. Referenced questions/options cannot be deleted while retained attempts reference them; deactivate questions instead. Existing in-progress attempts are captured using content at upgrade time; earlier historical versions cannot be reconstructed. Completed results are unchanged. Already-started attempts can resume and submit even if the test is subsequently unpublished or the subscription expires.

Run `npm test` and `npm run build`. The build needs valid `.env.local` values to run on the live site. Run `verification/quiz-snapshots.sql` in the SQL Editor after upgrading for transactional regression checks; synthetic fixtures roll back.
