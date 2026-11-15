# Public reels — task 464

Hypothesis: an open short-video feed links newcomers to courses and gives students
a reason to return between lessons (retention_w1, organic_users_7d).

Step 0, 2026-11-14: initial worktree clean; fresh origin/main 04fc3e3; merge
already up to date. Disk gate: 22800347136 B free on /home, FULL mode.

Audit expressions and entry points:

- `git grep -n -E 'listPublishedReels|published: boolean|r\.published' -- src/lib/db/reels.ts src/lib/reels.ts`
- `src/lib/db/reels.ts:55`: listPublishedReels(), server-side reader with no session
  or admin guard; lines 57–60 require published reels, a video and a published course.
- `src/lib/reels.ts:11`: published: boolean.
- `git grep -n -E 'getSession|/login|const PUBLIC|const isPublic|isPublic.*authed' -- 'src/app/(app)/layout.tsx' src/proxy.ts`
- `src/app/(app)/layout.tsx:14`: getSession() personalizes the header; no redirect.
- `src/proxy.ts:45,96`: global guest routing; /reels is not yet a public address.
  The explicitly authorized public /reels needs a route-specific public entry.
- `git grep -n -E '/reels|statics|force-dynamic' -- src/app/sitemap.ts src/proxy.ts`
- `src/app/sitemap.ts:20`: public static URL list, currently without /reels.
- No existing src/app/reels/page.tsx or saved task changes were found.

Raw run artifacts live in eval/, excluded through Git info/exclude.
Production validation and the hypothesis measurement await rollout.

## Resumed run, 2026-11-14

Started from clean `hq/vera/464` at `8b28b80`; disk gate passed with
19,801,796,608 B available. Fresh `origin/main` (`fb94eab`) merged without
conflicts. The saved implementation already satisfied the product requirements:
public `src/app/reels/page.tsx` outside `(app)`, published reels with playable
Storage paths and published course links, empty state, manual inline video with
`preload="none"`, title/description, `/reels` canonical and sitemap entry.
The exact public route exception also covers the trailing slash and query string.
The root structured-data slot and robots allow this route.

Added three student-session routing cases to the existing public-feed suite.
They supplement the guest, empty/drafts, published course, Storage signing,
ordering, metadata and sitemap assertions. No assertions were weakened.
The suite also checks that `/admin`, `/admin/reels`, `/reels/private` and
`/reels-private` retain their existing guest gate.

Validation from this run:

- `npx tsc --noEmit -p .`: exit 0 (`eval/tsc-final.log`).
- `npx vitest run --reporter=verbose`: exit 0, 55 test files passed and one
  skipped; 490 passed, 3 expected fail and 9 skipped (`eval/vitest-final.log`).
  The existing production lesson HTTP suite is skipped without its live fixture.
  An interrupted first full run exited 143 without a final report; its log is
  preserved as `eval/vitest-interrupted.log`, and the exact command was rerun.
- The identical 17-case feed suite ran on pre-implementation main `04fc3e3`
  in `eval/node_modules/main`: 10 failed, 7 passed, exit 1. Empty and draft-only
  feed assertions fail because the public route is absent; sitemap and guest
  assertions fail as well (`eval/old-final.log`, `eval/old-final.json`).
- Browser review at 1440×1080 and 390×844: no horizontal overflow, no initial
  MP4 requests, course links present, playback succeeds using `video.play()`
  with a CDP user gesture (`eval/browser-review.json`).
- Review shots: `eval/reels-desktop-published.png`,
  `eval/reels-mobile-published.png`, `eval/reels-desktop-empty.png`, and
  `eval/reels-mobile-empty.png`. They render the actual page component with
  the application stylesheet and local Firestore/Storage fixtures. They cover
  the component layout; production data, Next hydration and live Storage signing
  remain to be checked after rollout.
- No Next build or main build ran in this resumed run, as explicitly instructed.
  Route modes have not been measured. Existing `node_modules` were reused.

Files whose complete task diff exceeds 2000 characters:

- `src/app/reels/page.tsx`: the new public page contains its own header, responsive
  video grid, Storage URL signing, empty state, course links and metadata.
- `tests/reels-public.test.tsx`: integration assertions render the real page and
  data reader with mocked Firestore/Storage, exercise proxy routing and sitemap,
  and provide a reproducible failing baseline on the old checkout.
- This note: records the original audit, resumed-run evidence and review limits.

The remaining two files each add only the narrowly scoped `/reels` entry:
`src/app/sitemap.ts` for discovery and `src/proxy.ts` for authorized guest access.
Authentication modules, payments, Firestore rules, environment files and GitHub
configuration have no task changes. Production validation and the retention/search
hypothesis measurement remain pending rollout.
