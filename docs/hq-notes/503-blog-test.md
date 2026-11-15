# Task 503: blog coverage timing and review corrections

## Step 0 — 2026-11-15

Baseline: clean detached worktree at origin/main `c44a558`, without the
branch's test changes. Node 22.21.0, Next 16.2.9, Vitest 4.1.8; reused installed
lockfile dependencies. Initial disk availability: 18011291648 bytes.
Raw logs and the separate timing probe are excluded under `eval/`.

Three separate `npx vitest run tests/blog-start-here.test.ts` invocations
(JSON reporter) passed. The target assertion's durations, not suite durations:
3253.539433, 3853.784851, 1612.640321 ms.

A separate process measured the first dynamic import of the unchanged render
fixture and its page dependencies: 5366.769294 ms. One original `start(slug)`
took 350.689503 ms; rendering all 26 BLOG_POSTS took 3207.287801 ms.
Spies on readFileSync and promises.readFile observed zero calls during rendering
(FS_MS=0); this excludes module-loader I/O during the initial import.
EXPENSIVE=import, followed by render. Main already imports the fixture once.

The review fix will preserve the existing one-time real-post preparation,
restore per-test mockReset, capture catalog calls immediately after preparation,
and assert both that count and complete post coverage. Both hook and assertion
test will use 16101 ms: the largest measurement rounded up (5367 ms) times 3.
This gives scheduling headroom without dropping any existing assertions.
