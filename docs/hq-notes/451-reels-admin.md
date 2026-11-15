# Reels part B — task 451

Hypothesis: an admin upload form lets the team prepare reels without a developer;
this enables the later public feed and a retention_w1 measurement.

Baseline: fresh origin/main is 4da34e767ef762aaf9de96812383307ba00653c2.
The merge was already up to date; the initial worktree was clean.

Part A entry points:

- `src/app/api/admin/reels/[reelId]/upload/route.ts:11`: POST(request, context), raw video body.
- `src/lib/db/reels.ts:17`: createReel(metadata): Promise<string>.
- `src/lib/db/reels.ts:26`: getReel(id): Promise<Reel | null>.
- `src/lib/db/reels.ts:31`: listPublishedReels(): Promise<Reel[]>.
- `src/lib/db/reels.ts:40`: setReelVideoPath(id, path): Promise<void>.
- `src/lib/require-admin.ts:5`: requireAdmin(), reused without changing access logic.
- Admin example: `src/app/admin/partners/page.tsx:70`, actions guarded at `actions.ts:16`.

The form also needs a published-course selector because Part A requires courseSlug.
New uploads remain drafts, matching Part A. The public feed belongs to part C.

Initial free space: 2529140736 bytes. npm ci passed its disk gate and completed.
Its local output was reclaimed to restore the build gate. Dependencies use a local
symlink to existing main node_modules; both package-lock.json hashes match:
d039cc31faaf00ed24d5043819393b43a6f3a8854dfefb3863c7b5f8ae476a0f.
Hard links were unavailable across mounts. Both builds use webpack, with secrets
removed from the process environment. Raw verification logs are excluded in eval/.

Production validation is pending deployment. After rollout, check an admin upload,
replacement and double-submit; then assess retention_w1 after at least 72 hours.

Continuation verification (2026-11-14):

- Resumed clean at e8ada4ee83a55c815a49228661908479826428e6 on hq/vera/451.
- Disk gate: 23083180032 B available on /home, above 1610612736 B; FULL mode.
- Replayed the unchanged tests before implementation: 10 failed, 5 passed,
  exit 1 (`eval/continuation-red.log` and `.json`).
- Implementation commit: 746076698565e30937e45b4936e447e875f21d3b.
- Focused reels verification: 41/41 passed, including all 15 admin tests.
- Full `npx tsc --noEmit -p .`: exit 0 (`eval/continuation-tsc.log`).
- Full `npx vitest run`: exit 0; 466 passed, 3 expected failures, 9 skipped,
  478 total (`eval/continuation-full.log` and `.json`). The nine existing HTTP
  integration cases require LESSON_HTTP_ORIGIN, which was not configured.
- MAIN_FAILS is NA: no unexpected check failure required a main comparison.
- No dependency installation or Next build was run in this continuation, as
  explicitly instructed. The saved main build succeeded and marks the upload
  endpoint dynamic. /admin/reels did not exist on main. Its branch route mode
  is UNRELIABLE without a branch build; dynamic rendering is expected because
  the page calls the existing admin guard. No route-mode equality is claimed.
- No analytics event or public feed was added. The navigation target is
  /admin/reels; file uploads target /api/admin/reels/{reelId}/upload.

Files with diffs larger than 2000 characters:

- `src/app/admin/reels/reel-upload-form.tsx`: one reusable create/edit form,
  MP4 and size validation before writes, metadata-only Server Action calls,
  raw XMLHttpRequest upload, byte-based progress, and a ref preventing a second
  submission before React updates. The draft ID survives network failure for
  retry. Fields stay disabled until the server response, including at 100%.
- `src/lib/db/reels.ts`: adds the uncached admin reel list and published-course
  choices. Create and update share the existing metadata validation so edits
  cannot bypass title, order, or published-course checks. Metadata updates
  preserve the current video path; replacement still returns the reel to draft.
- `tests/reels-admin.test.tsx`: the pre-existing task commit supplies the red
  regression cases for replacement ownership, failure ordering, action guard,
  upload validation, actual byte progress, duplicate submission, and retry.
  It was replayed without editing any existing tests during this continuation.
- `docs/hq-notes/451-reels-admin.md`: preserves the baseline and dependency
  provenance, records reproducible verification results and their limitations,
  explains the larger diffs, and specifies the production follow-up.

Replacement deletes only the recorded UUID video path in the same reel's
namespace, after Storage save and Firestore attachment both succeed. Failed
save or attachment leaves the old object intact. Cleanup failure returns HTTP
200 with a visible warning because the replacement is already saved. Cleanup
does not list a bucket or delete other reel objects.
