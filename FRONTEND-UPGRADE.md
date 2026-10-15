# Nasu preparation and self-paced learning frontend

This upgrade adds course browsing, enrollment, lesson notes and resources, progress/resume, and authoring tools under Admin → Learning. Admin → Questions supports explicit human review and uploading question/option illustrations.

Quiz answers are saved to the server as well as the current browser. Resume prefers newer unsynced browser changes and otherwise restores the server copy. Correct options and explanations appear only after submission. Question/option media use expiring links.

NASU full mocks require 50 questions, 100 marks, GK 30/reasoning 20, the unit quotas in `src/lib/nasu.js`, and GK Level I=18/Level II=12. This is separate from difficulty. Course unit topic mappings and sufficient reviewed questions must be prepared before publishing a complete mock. Duration is entered by an administrator; no official time or penalty rule is assumed.

CSV imports accept optional `question_level` values 1 or 2. Existing files remain supported.

## Deployment

The connected backend has already been upgraded for these features. This frontend is intended for that upgraded backend. Do not rerun the older quiz setup SQL over it. Building this branch does not deploy it automatically.

1. Set the normal frontend environment configuration using the publishable key.
2. Run `npm ci`, `npm run check`, and `npm run build`.
3. Test with real student and admin accounts, then deploy using the existing hosting process.
4. Add reviewed course content, connect paid access, and publish each course/unit/lesson explicitly. Draft content stays hidden from students.

Private video uploads use native HTML playback. External video resources must be direct HTTPS media URLs; YouTube/Vimeo watch pages should be added as links. An external provider URL is not made private by the app.

## Validation performed

Production build, existing checks, new unit distribution/import/resume checks, and transactional database tests passed. Browser end-to-end verification is still outstanding because the environment could not download Chromium. No live deployment or browser test pass is claimed.

Database migration SQL is intentionally excluded from this public frontend change.
