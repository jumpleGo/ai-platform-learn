# Reels publication and deletion — task 543

Hypothesis: admins can publish prepared reels and remove obsolete ones without
a developer; a footer link makes the public feed discoverable to visitors.

Baseline: `203ce089787e6dc3b5f6ad67c4fbd89985bb3e51`, fresh origin/main,
already merged into `hq/vera/543`. Initial /home availability: 15904108544 B.
Dependencies: `npm ci --ignore-scripts` from the unchanged package-lock.json.
Read the installed Next.js guides for Route Handlers, async route params,
revalidatePath, useRouter and Link before implementation.

The existing admin guard from the upload endpoint protects PATCH and DELETE
at `/api/admin/reels/{reelId}`. Publication requires a nonempty videoPath and
a published matching course. Unpublishing remains possible without either.
Deletion confirms in the UI, removes only the recorded UUID video in that
reel's Storage namespace, then deletes `reels/{id}`. Missing files are accepted;
other Storage failures preserve the document for retry. Storage and Firestore
are separate operations: a failed document deletion can be retried safely.
The upload and management buttons share the same in-flight lock.

Visitors open `/reels` via the new footer link or a direct shared URL, without
login. The admin page links to the same feed. Its existing course links and
public access behavior remain covered by the unchanged public-reels tests.

Verification (all Firebase/Storage access mocked):

- Final new tests on the unchanged baseline: 50 failed, 0 passed, exit 1
  (`eval/old-543.log`, `.json`, `.exit`). Every failure is an absent route,
  control or navigation link. Implementation files were restored byte-for-byte.
- Six focused reels suites: 108 passed, exit 0 (`eval/reels-543.*`), including
  all 50 new tests and 58 existing tests. No existing test was edited.
- Full `npx tsc --noEmit -p .`: exit 0 (`eval/tsc-543.*`).
- Next build and the full test suite are deferred to system review by the run
  instruction. Route build modes are therefore NA, not measured.
- `eval/` is excluded via Git info/exclude. No live database or Storage calls,
  deployment, auth changes, rules, secrets or payment changes were made.

Files with task diffs over 2000 characters:

- `src/lib/db/reels.ts`: publication prerequisites, Russian domain errors and
  ordered Storage/document deletion with exact path ownership validation.
- `src/app/api/admin/reels/[reelId]/route.ts`: guarded mutation handlers,
  proxy-aware origin validation, input errors and both page invalidations.
- `src/app/admin/reels/reel-upload-form.tsx`: publish/unpublish/delete controls,
  native confirmation, shared pending state and readable network/server errors.
- `tests/reels-management-543.test.ts`: real handlers and data functions against
  mocked services, including authorization, failed writes and cleanup retries.
- `tests/reels-controls-543.test.tsx`: actual button handlers, confirmation,
  request failures, shared upload lock and both navigation entry points.
- This note records the hypothesis, baseline, verification and review limits.

Production validation remains pending rollout: use an approved disposable reel
to check publish, unpublish, guest discovery and deletion, then assess feed
engagement after at least 72 hours. No production outcome is claimed here.
