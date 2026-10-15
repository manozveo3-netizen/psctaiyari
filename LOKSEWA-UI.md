# Loksewa Taiyari frontend

The existing React application now uses the green learning workspace design approved in the preview. No Moodle installation or database migration is needed.

- Loksewa Taiyari header, footer and browser title; responsive sidebar and course cards.
- Dashboard uses actual recent attempts and the current subscription, with loading/error states instead of placeholder metrics.
- `/materials` searches published lesson titles and units visible to the signed-in student under existing database policies. Content opens through the existing lesson/resource flow.
- All quiz questions appear on one scrolling page. A sticky timer, answered-question navigation and explicit final confirmation replace Previous/Next pagination.
- Existing `start_quiz`, autosave/resume, `save_quiz_answers`, deadline auto-submit and `submit_quiz` scoring remain in use.
- Existing authentication, roles, subscriptions and admin routes remain connected.

## Validation

`npm run check` includes a 50-question rendering/interaction test covering first and last selections, draft persistence, confirmation, RPC submission and expired-answer locking. `npm run build` produces the static frontend.

Live signed-in browser verification is still required for mobile layout, real lesson access, and a full test attempt. Automated UI verification uses fixtures, not production student data.

## VPS update

From the existing project folder, with the existing `.env.local` in place:

```bash
git pull --ff-only origin main
npm ci
npm run check
npm run build
```

If Nginx already serves this project's `dist` directory, the rebuilt files are picked up without changing its configuration. No SQL migration or Moodle installation is part of this update.
