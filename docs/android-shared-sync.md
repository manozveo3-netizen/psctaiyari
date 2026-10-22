# PSC Taiyari: one-way shared code synchronization

Source: `main` (website). Destination: `android-only-app` (Capacitor application).

## How it works

A push to `main` affecting relevant code starts `.github/workflows/sync-android-shared.yml`. The job checks out both branches in independent worktrees, compares only approved shared source against the last successfully synchronized `main` SHA, and refuses ambiguous modifications. On its first run, the baseline is the branches' merge base. Later runs use `.github/android-sync-state.json` stored **only on the Android branch**.

When eligible changes exist, the job reconciles shared npm dependency versions without replacing Capacitor dependencies, refreshes the Android lockfile, runs `npm run check`, builds the Vite bundle, generates/syncs the Capacitor Android project and runs Gradle `assembleDebug`. Only after every validation succeeds does it commit and fast-forward push `android-only-app`. Re-running without new shared changes writes nothing.

## Automatic shared paths

- `src/lib/**`, `src/contexts/**`: Supabase client, auth and reusable services.
- `src/components/**`, `src/pages/**`: shared React components and screens, **except** the explicit exclusions below.
- `verification/**`: shared verification scripts.
- `supabase/functions/**`: shared Edge Function source (copied for version alignment, **not deployed** by this workflow).
- Existing shared dependency allowlist: `@supabase/supabase-js`, `lucide-react`, `mammoth`, `react`, `react-dom`, `react-router-dom`.

Source extensions synchronized: `.js`, `.jsx`, `.mjs`, `.ts`, `.tsx`. The allowlist is defined in `scripts/sync-android-shared.mjs`; new shared dependencies must be added deliberately.

## Protected, platform-owned paths

- Website: `.github/workflows/deploy.yml`, Nginx/VPS deployment, website-specific dependency scripts.
- Android: `capacitor.config.json`, native `android/**`, `.github/workflows/android-*.yml`, Android package scripts, signing/Gradle files, icons and Android-specific assets.
- Deliberate React exclusions: `src/App.jsx`, `src/main.jsx`, `src/styles.css`, `src/components/Layout.jsx`, `src/pages/DeleteAccount.jsx`, `src/pages/LegalPage.jsx`, `src/pages/admin/AccountDeletions.jsx`, `src/pages/admin/Admin.jsx`, `src/pages/admin/LearningAdmin.jsx`.

The last five admin/legal exclusions contain divergent implementations. Reconcile them explicitly or extract their shared logic into `src/lib` before enabling synchronization; otherwise automatic replacement risks losing Android functionality.

## Conflict and release behavior

If an eligible Android file was changed independently after the baseline, and it differs from both the old and new website versions, the workflow fails **before writing any updates or pushing**. Fix the conflict intentionally and re-run the workflow from the Actions tab. It never merges branches wholesale and never force pushes. A concurrent change to the target branch rejects the fast-forward push safely.

GitHub suppresses ordinary `push` workflows triggered by pushes made with `GITHUB_TOKEN`. Therefore this synchronization workflow validates and generates its own Android debug APK artifact instead of assuming the existing Android debug/release workflows will be triggered. Android release AAB signing remains under the existing Android workflow; no production Play Store release is published by synchronization.

Supabase schema migrations, Edge Function deployment, website deployment, and Google Play production publishing remain independent operations. Source synchronization alone does not perform them.
