# PSC Taiyari Android App

This branch is only for the Android app build. Do not merge it into the website deployment branch.

## Build on a Windows PC or VPS

1. Install Node.js 20+ and Android Studio.
2. Run `npm install` (not `npm ci` until the lockfile is refreshed).
3. Run `npx cap add android` once to create the native Android folder.
4. Run `npm run android:open` and build an APK from Android Studio, or run `npm run android:debug`.

## Low-end device target

- Minimal visual effects and no video autoplay.
- Text-first lessons.
- API level 24+, Android 7.0+ (Capacitor 8 requirement).
- Offline lesson/test data and queued score sync are the next implementation phase.

The production website remains unchanged because this branch is not deployed by the website workflow.
