# Task 503: blog coverage timing and review corrections

## Step 0 — 2026-11-15, fresh verification

Fetched origin/main and merged it normally: already current at c44a558.
Baseline: separate clean detached worktree at that commit, with no branch
changes. Node 22.21.0 / Vitest 4.1.8 / Next 16.2.9; reused installed dependencies
with identical main/branch package-lock.json. Disk: 16951730176 bytes available.
Raw reports and the separate timing probe: ignored eval/run-0310/.

Three separate npx vitest run tests/blog-start-here.test.ts invocations:
TEST_MS_BEFORE=5183.504959,4543.075154,4517.057910 (target test, not suite).
The first failed past the default 5000 ms limit; the next two passed.
RED_ON_OLD=yes under actual machine contention (load average approximately 17).
The failed duration is elapsed until failure, not a completed coverage run.

Separate unchanged-main probe: first fixture/page import 6786.203223 ms;
one original start(slug), including assertions, 488.106228 ms;
render all 26 BLOG_POSTS 4535.457943 ms. FS_MS=0 / FS_CALLS=0 for readFileSync
and promises.readFile during rendering; module-loader I/O is inside IMPORT_MS.
EXPENSIVE=import, followed by render. Main already imports the helper once;
preparing markup in beforeAll separates rendering from assertion timing but
does not reduce total rendering work.

Timeout for both hook and test: ceil(max(measurements) * 3) = 20359 ms.
This uses the first import as the largest measured operation and gives bounded
scheduling headroom. Every real post and all original assertions must remain.
