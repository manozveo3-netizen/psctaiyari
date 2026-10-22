# PSC Taiyari Android: Play Store release checklist

This is the Android-only `android-only-app` branch. The website `main` remains separate.

## First launch changes
- Android's routes in `src/App.jsx` and entry in `src/main.jsx` are Android-specific. New `src/android/` screens are outside the `main` shared code sync allowlist.
- Android users cannot purchase digital courses using QR, external payment links, or web checkout. The `/pricing` page shows **existing entitlements only**. `/payment` redirects to `/pricing`. Implement Google Play Billing **plus server-side purchase verification** before enabling in-app Android digital subscription sales.
- In-app account deletion request: `/settings/delete-account` for students and external support email fallback; public deletion instructions: `https://psctaiyari.com/delete-account`. The Supabase Edge Function may fail. Sending an email is a **request**, not immediate deletion. An administrator must verify the requester and carry out actual deletion and data-retention obligations. Test backend end-to-end; source code alone does not prove completion.
- Android email verification and password reset callbacks point to `https://psctaiyari.com/login` and `https://psctaiyari.com/reset-password`. Add those to Supabase Auth allowed redirect URLs. After completing the email link in a browser, users return to the Android app to log in. Device deep-linking into the app is *not* configured; this explicitly avoids broken `https://localhost` links.
- `HashRouter` supports Capacitor's local app routes without requiring web server rewrite rules.

## Build / signing / Android compatibility
- Capacitor 8 generates the Android native project in CI. Android GitHub workflows run `node android-support/check-generated-sdk.mjs` to assert: target API >= 36, compile API >= 36, minimum API <= 24.
- `npm run check` includes `android-support/verify-play.mjs` for checkout, redirects and deletion navigation.
- Signed AAB is created by `.github/workflows/android-release-aab.yml` from `android-only-app` with the existing signing secrets. A normal push only creates an AAB artifact.
- Google Play versionCode uses the **AAB workflow run number**. If Play Console already has a higher versionCode, adjust before uploading.

## Enable Google Play internal testing (not production)
1. Register `com.nextlayers.psctaiyari` in Play Console; complete Play App Signing and manually upload first AAB (the upload action requires an existing registered app).
2. Enable the Google Play Developer API in a Google Cloud project, create a service account, grant **only this app's internal release permissions** in Play Console.
3. Put the complete service account JSON in the GitHub repository secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`. **Never commit or share the JSON.**
4. Open GitHub Actions -> **Build signed Play Store AAB** -> **Run workflow** -> select `android-only-app` -> tick `publish_internal`. The workflow builds a fresh signed AAB, then publishes **only to Internal testing**. Leave the checkbox off for build-only runs.
5. No automatic production publishing is enabled. The branch sync job's own bot pushes also do **not** trigger these AAB workflows; run the AAB workflow manually after a website-to-Android sync.

## Required non-code checks
- Verify both public website deletion and privacy URLs really load externally.
- Verify account deletion request email receipt and execute deletion with legal retention and support audit.
- Complete Play Console Data safety, permissions, target audience, content rating, tester access and listing assets.
- On physical Android devices test registration/email confirmation, password reset, course PDF, offline/network error handling, navigation/back, authentication session, and account deletion fallback.
- If paid digital courses are to be sold from Android later, do not reinstate QR checkout: implement compliant Play Billing first.
