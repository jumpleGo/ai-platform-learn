# #180: lesson HTTP status — blocked

Hypothesis: resolving the lesson above every ancestor Suspense boundary
allows HTTP 404. Acceptance: five missing URLs give 404; four existing
lessons and 30 production-sitemap paths keep 200. No deployment or organic
measurement; the latter requires at least 72 hours after shipping.

All loading/layout files on the original lesson path:

- src/app/layout.tsx
- src/app/(app)/layout.tsx
- src/app/(app)/loading.tsx
- src/app/(app)/courses/[courseSlug]/lessons/layout.tsx
- src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/layout.tsx
- src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/loading.tsx

CHOSEN_FIX: move the unchanged home page and loading UI into (home).
The lesson guard then precedes every loading boundary on its path, while
`/` is preserved. PartnerBar's Suspense is a sibling. Other public routes
lose the generic home skeleton. Next.js 16.2.9 loading/route-groups docs
were consulted. No slug or redirect changes.

Results:

- TypeScript: main 91d5fcb = 0 errors; branch = 0; delta = 0. Same dependencies,
  no generated Next types or copied build sources in either check.
- Vitest: 168 passed, 9 HTTP tests skipped. The streaming-order regression
  fails on rejected 1be4d93 with the old ancestor loading file: 1 failed,
  4 passed; actual events `['shell', 'lookup']`, expected `['lookup']`.
- HTTP acceptance remains UNVERIFIED, including the main 200 baseline.
  The initial Webpack alias did not replace the DB module: curl returned
  000 (timeout/connection failure), which is not an HTTP status measurement.
  The next attempt copied mock modules into isolated sources; builds missed
  the deadline.
- Started 02:51:22 UTC; deadline 03:11:22. Attempts stopped without a confirmed
  404. Processes terminated and build artifacts removed. Audit #173 was
  not run; SITEMAP_SOFT404 and BROKEN_N are unknown.

Raw build output at stop (full logs in excluded eval/http/):
```
✓ Compiled successfully in 3.3min
  Running TypeScript ...
  Finished TypeScript in 88s ...
  Collecting page data using 1 worker ...
  Generating static pages using 1 worker (26/52)
```

Reproduction input: `node tests/prepare-lesson-http.mjs working` (or `main`).
The isolated copy replaces only catalog/statistics with a fixture delaying
resolveLesson by 1600 ms. Mutations throw. In that copy, use demo Firebase
emulator settings, NEXT_FONT_GOOGLE_MOCKED_RESPONSES=$PWD/next-font-mock.cjs,
then `npx next build --webpack` and `npx next start --port 3180`. At repo root:
`LESSON_HTTP_ORIGIN=http://127.0.0.1:3180 npx vitest run`.
Missing cases: hub lesson 1, unknown course, 0, not-a-number, 999.

#71 a2e5824 changes links only and is absent from main. The protected #52
course landing still links to missing hub lesson 1; BROKEN_N=0 depends on
shipping #71. Auth, payments, rules and blog were not changed.
