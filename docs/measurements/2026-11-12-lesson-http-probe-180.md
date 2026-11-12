# #180: production-build HTTP evidence

Hypothesis: resolving a lesson above every ancestor Suspense boundary lets
Next.js send HTTP 404 before streaming a loading shell. The selected fix in
`faca1893026dfb66c3ebeb96e6a17b82becc27bf` moves the unchanged home page and
loading UI into `(app)/(home)`. The lesson guard then precedes its loading
boundary. This run leaves that application fix unchanged.

The local production build returns direct 404 for all five missing lessons,
direct 200 for four existing lessons, and direct 200 for all 30 paths from
the production sitemap. `/` and `/?home=classic` also return direct 200.
`/gelateria` has a pre-existing 307 redirect to `/?home=scene`, which returns
200. Therefore the literal requirement for a first-response 200 at
`/gelateria` is not met; its redirect was not changed.

The run began at 2026-11-12 03:51:39 UTC with a 45-minute budget. Evidence
uses Next.js 16.2.9, Webpack, a production build and `next start`, with a
fixed catalog fixture rather than production Firestore. No deployment or
organic-traffic measurement was performed. A traffic measurement requires
at least 72 hours after shipping.

## Fixture and build

- `resolveLesson` returns existing lessons immediately; only missing
  lessons wait 1600 ms. Preflight: all eight existing lookups took 0.526 ms
  together; a missing lookup took 1605.286 ms.
- The fixture supplies four courses and eight lessons. Catalog/statistics
  imports resolve through exact paths in the isolated tsconfig. All 214
  `src` files were verified byte-identical to the branch. No source module
  is overwritten by the preparation script.
- The only `generateStaticParams` is the blog's fixed `BLOG_POSTS` list;
  lesson generation does not call Firestore there. The earlier delay was
  a suspected contributor to the stalled build, not a proven root cause.
- The branch was built exactly once: `npx next build --webpack`, exit 0.
  Compilation took 6.9 minutes, TypeScript 67 seconds, and static generation
  completed 52/52 pages in 95 seconds.
- `npx tsc --noEmit -p .`: exit 0, no errors. The earlier main check at
  `91d5fcb` also had zero errors; no new TypeScript errors.
- `LESSON_HTTP_ORIGIN=http://localhost:52663 npx vitest run`: exit 0,
  20 files and 177 tests passed, including all nine HTTP tests; none skipped.

## HTTP measurements

Requests used `curl -o /dev/null -w '%{http_code}'` without following
redirects, additionally recording time to first byte (TTFB). Response
bodies were fetched separately to check for streamed 404/500 error markers.
There were no request failures in the final branch probe.

| Missing path | Branch HTTP | Branch TTFB, s |
| --- | --- | --- |
| `/courses/claude-code/lessons/1` | 404 | 2.021018 |
| `/courses/no-such-course/lessons/1` | 404 | 2.274460 |
| `/courses/claude-code/lessons/0` | 404 | 2.513676 |
| `/courses/claude-code/lessons/not-a-number` | 404 | 2.750785 |
| `/courses/claude-code/lessons/999` | 404 | 2.179055 |

Existing lessons, all HTTP 200 without streamed error markers:

- `/courses/claude-code-agents/lessons/1?from=course_landing`
- `/courses/claude-code/lessons/2`
- `/courses/claude-code/lessons/3`
- `/courses/claude-code/lessons/4`

All 30 paths extracted from `https://gelato.education/sitemap.xml` were
requested against the local production build: 30/30 HTTP 200, zero streamed
404 or 500 markers (`SITEMAP_SOFT404=0`). The local sitemap contains the same
30 paths. This covers sitemap HTTP responses; the full #173 link audit was
not rerun, and `BROKEN_N=0` is not claimed.

Parent comparison: **skipped**, with no HTTP result. The engine interruption
left the optional build of detached worktree `1be4d93`
(`1be4d934fe12a109812ae2f86d488eac7b53ff90`) running. The resumed agent's
initial process audit missed it and removed its build artifacts too early.
The parent compiled in 8.1 minutes and finished TypeScript in 2.3 minutes,
then failed at page-data collection because the generated font manifest
had been removed. This is a probe cleanup error, not evidence of an
application regression. No parent HTTP requests completed.

Raw parent build error, exit 1:

```text
Error: Cannot find module '/home/painsearchdev/agent-hq/workspaces/vera/180/eval/lesson-http-1be4d93/.next/server/next-font-manifest.json'
code: 'MODULE_NOT_FOUND'
```

The requested `MAIN_PROBE` field refers to this parent, not to current
`main`. `MAIN_MISSING_200=0/5` counts zero confirmed responses and must be
read with `MAIN_PROBE=skipped`; it does not mean five observed failures.

The first server was bound to `127.0.0.1`; Next's rewrite normalization to
`localhost` produced an external rewrite loop on the home route. Restarting
the same build with `--hostname localhost` resolved this harness issue.
Both the initial and final measurements are retained; no rebuild or source
change was needed. `/gelateria` was also checked with redirect following:
`307 -> /?home=scene -> 200`.

## Reproduction and evidence

Run `node tests/prepare-lesson-http.mjs working` from the repository root.
For the optional parent, pass `1be4d93`; the script creates a detached git
worktree under the ignored `eval/` directory. In the generated directory:

```bash
export PATH=$HOME/.local/node/bin:$PATH
export NEXT_TELEMETRY_DISABLED=1
export NEXT_PUBLIC_USE_FIREBASE_EMULATOR=1
export NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-lesson-http180
export FIRESTORE_EMULATOR_HOST=127.0.0.1:1
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:1
export NEXT_FONT_GOOGLE_MOCKED_RESPONSES=$PWD/next-font-mock.cjs
unset FIREBASE_SERVICE_ACCOUNT_BASE64 GOOGLE_APPLICATION_CREDENTIALS
npx next build --webpack
npx next start --hostname localhost --port 52663
```

Select a free port for each server. From the repository root, run curl
against the paths above and the saved sitemap paths; run Vitest with
`LESSON_HTTP_ORIGIN` pointing to that server. The mock's mutation functions
throw, and Google Fonts use a local font fixture.

Raw evidence is retained in excluded `eval/http-v2/`: `meta.json`,
`resolver-preflight.json`, `fixture-preflight.log`, `source-hashes.json`,
`build-branch.log`, `tsc-initial.log`, `vitest.log`, `production-sitemap.xml`,
`sitemap-paths.json`, `branch/results.json`, `branch/summary.json`, numbered
response bodies, and `gelateria-localhost.headers`. Initial host-mismatch
results are in `branch-ip/`. Build exit codes are saved beside their logs.

After the engine interruption, this task resumed at 04:22:05 UTC. Git was
still on `hq/vera/180` at `faca189`, with only this report and the two fixture
files modified. The completed branch build, curl results and checks above
were recovered from their logs; the successful build was not repeated.
`git diff faca189 -- src` is empty. The optional parent probe was not
restarted within the original 45-minute budget. After its failed process
had exited, its worktree and all task
`.next` artifacts were removed, while the raw logs remain in `eval/`, which
is listed in Git's `info/exclude`.

Evidence SHA-256:

- `build-branch.log`:
  `055ba5b0a0253240204067e7cd107c55dffeff6eea86e1907d0f5c649b4ce315`
- `branch/results.json`:
  `b70679bba9f483634032e4f62bd23cdec99523d3c8bc86c44c5a12815674cab2`

`git diff main...hq/vera/164 --name-only` reports a change to
`src/app/(app)/page.tsx` but not `src/app/(app)/loading.tsx`.
`CONFLICTS_164=src/app/(app)/page.tsx`. That branch was only read.

The protected course landing still has the #71 link to missing
`/courses/claude-code/lessons/1?from=course_landing`. It is outside this
task's permitted scope. No course landing, slug, redirect, blog, auth,
payment, credential or Firestore-rule changes were made in this run.

## Prior unsuccessful run

The earlier 02:51:22–03:11:22 UTC attempt did not establish an HTTP result:
the Webpack alias did not replace the DB module, and curl returned 000
(a transport failure). A subsequent copied-source attempt reached static
generation 26/52 when the deadline expired. It was stopped and cleaned up.
Logs remain in `eval/http/`; those attempts are not counted as acceptance
evidence. The old streaming-order unit regression failed at `1be4d93`
with `['shell', 'lookup']` instead of `['lookup']` (1 failed, 4 passed).

## #173 audit repeat and loading comparison (2026-11-12)

The follow-up started at 05:03:36 UTC on `hq/vera/180`, input commit
`ccb34fde62eb2f9a7b2667cce5d8e68ce8e5c258`. Hypothesis: missing lessons
return real 404 without introducing new broken targets. All 214 source
files and the existing tests remained unchanged, including the protected
`src/app/(app)/courses/[courseSlug]/page.tsx` (`TOUCHES_COURSE_PAGE=no`).

The same catalog fixture and production-build preparation were used.
Three existing lookups together took 0.307 ms; only the missing lookup
waited, taking 1607.136 ms. `next build --webpack` passed; the isolated
build disabled Webpack's disk cache because disk space was limited.
`next start --hostname localhost --port 33531` served every audited target.

The baseline is `../173/eval/20261111T142513Z/report.md`. Its crawler was
copied byte-for-byte, with a transport wrapper mapping production URLs to
localhost and preserving canonical URLs in the results. This retained
GET for sitemap pages, HEAD then GET on 200/405 for other targets,
redirect following, HTML-only link extraction, queries and the original
soft-404 classifier. All 45 crawler requests stayed local; none failed or
duplicated another URL/method. The minimum pause after a request was
0.409 seconds. Fresh production and local sitemaps both matched the
baseline's 30 URLs exactly.

| Metric | #173 baseline | Branch repeat |
| --- | ---: | ---: |
| Sitemap URLs / non-200 / soft-404 | 30 / 0 / 0 | 30 / 0 / 0 |
| Internal targets checked | 38 | 38 |
| Broken targets | 1 | 1 |
| Broken targets returning soft-404 | 1 | 0 |
| CTA pairs checked / broken | 11 / 1 | 11 / 1 |
| Pages containing CTA | 6 | 6 |

The target sets and CTA page sets match exactly: the three course landings
(`ai-cartoons`, `claude-code-agents`, `vibecoding`) plus the three
`vibecoding` URLs carrying the original lesson 02/03/04 campaign queries.
`NEW_BROKEN=0`; the only broken target remains
`/courses/claude-code/lessons/1?from=course_landing`. Its baseline response
was 200 with a streamed 404; both HEAD and the separate direct GET now
return 404. Achieving `BROKEN_N=0` still requires changing the protected
CTA, blocked by the instruction: “src/app/(app)/courses/[courseSlug]/page.tsx
не трогай (там идёт замер #52)”. No new out-of-scope broken links were found.

The separate direct-GET probe confirmed 5/5 missing lessons returning 404
and 4/4 existing lessons returning 200 without streamed errors, using the
same paths listed above. Missing-response TTFB ranged from 1.663 to
1.878 seconds, after the fixture delay. `npx tsc --noEmit -p .` exited 0
(zero new errors against the earlier zero-error baseline);
`LESSON_HTTP_ORIGIN=http://localhost:33531 npx vitest run` passed all 177
tests in 20 files, including all nine HTTP tests, with no skips.

Loading comparison: three samples per page and origin, interleaved, after
one excluded warm-up each; no concurrent build, crawler or tests. All
responses were 200. Values below are medians in milliseconds. TTFB is
curl's `time_starttransfer`; first content means arrival of the first
nonempty route `<h1>` text in the HTML stream, excluding scripts/templates,
timed from curl process launch (including its startup overhead).

| Page | Branch TTFB | Prod TTFB | Branch first content | Prod first content |
| --- | ---: | ---: | ---: | ---: |
| `/blog` | 35.168 | 119.567 | 50.335 | 137.266 |
| `/blog/ai-komanda-kak-realnaya-komanda` | 117.707 | 239.850 | 141.646 | 264.880 |
| `/courses/claude-code-agents` | 57.234 | 155.187 | 84.624 | 173.042 |

`LOADING_LOST` is confirmed in the sampled HTML: no loading skeleton in
any of the nine branch responses, versus a skeleton in all nine production
responses. Production headings arrived inside hidden React containers;
branch headings did not. These are HTTP content-arrival measurements,
not browser paint/FCP or hydration measurements. Localhost with immediate
fixture data versus remote production cannot isolate the causal latency
cost of removing the loading boundary, especially with a slow database.
No deployment, production writes or organic-traffic measurement occurred.

Evidence remains in excluded `eval/audit-20261112T050336Z/`: build/check
logs, crawler CSVs, unchanged crawler and transport wrapper, source/body
hashes, audit comparison, lesson results and timing samples/medians.
The server was stopped before removing the isolated build, raw HTML and
response headers; cleanup removed 24,517,530 bytes. Only this report is
changed by the follow-up commit.
