# PSC Taiyari: Website manual QR payments

Status: Website QR checkout code added. **Not a Play Store payment solution.**

## Configure your own QR (admin)
1. Sign in as an admin on https://psctaiyari.com
2. Open /admin/payment-qr.
3. Upload the original bank/wallet QR image (PNG, JPEG, WebP, max 2 MB).
4. Enter the exact merchant/payee name shown in the wallet and optional instructions.
5. Check 'QR Payment Enable' and Save.
6. On a second account verify /pricing -> Choose Plan -> /payment?plan=... shows the correct QR and amount.

The QR defaults to **disabled**. No actual QR image is included in this repository.

## Customer checkout and review
- Users scan/show/save QR and pay with their own banking/wallet app.
- On the website, logged-in students enter a transaction ID and may attach an optional private payment screenshot (max 4 MB).
- `submit_manual_payment` RPC derives the amount from `plans` (not user input), rejects duplicate transaction references and prevents simultaneous pending requests for the same plan.
- `payments` cannot be directly INSERTed by authenticated clients.
- Admin opens /admin/payments, verifies **actual incoming funds** independently, then approves or rejects using existing secured RPC. A screenshot or reference ID does not prove settlement.
- A successful approval activates a subscription with the existing `approve_payment` RPC.
- Existing Android `android-only-app` does **not** provide in-app digital subscriptions via external QR. Implement Google Play Billing before selling digital access inside a Google Play-distributed app.

## Supabase
Applied migration: `website_manual_qr_payment_verified_submission`.
Created `public.payment_qr_settings` (admin updates, public enabled reads), public image bucket `psc-payment-qr` (admin upload), private screenshot bucket `psc-payment-proofs` (owner upload, owner/admin read), and secure `submit_manual_payment` / `attach_manual_payment_proof` functions.

## Important remaining verification
- Upload the real payment QR image and verify payee details.
- Check Supabase storage policies with student/admin sessions on production.
- Test a genuine low-value payment and the complete status progression with bank reconciliation.
- Test that QR cannot be accessed via in-app Android purchase flow.
