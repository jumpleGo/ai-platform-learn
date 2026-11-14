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
