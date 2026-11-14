# Legacy lesson redirect, task 348

Step 0: public GETs on 2026-11-14, starting 04:41 UTC. No production writes.
Source baseline: `770e389538119e511134c047e336647115621f17`, freshly fetched
`origin/main`. The deployed source revision is not exposed by these responses.
Raw headers, bodies and summaries are retained in excluded `eval/`.

## Confirmed redirect defect

`/courses/O9aFw3KZqEFyGxnJB8fX/lessons/CY4AYMjQMSbND8TUYSFQ` returns
HTTP **200**, with no Location header and this literal response fragment:

```html
<meta id="__next-page-redirect" http-equiv="refresh" content="0;url=/courses/claude-code-agents/lessons/2"/>
```

The target returns **200**, without a refresh, and has the self-canonical
`https://gelato.education/courses/claude-code-agents/lessons/2`.
Raw legacy body SHA-256:
`2c93509f430f5b1364f5a04b757aaaf0a818c19e956c05f309d5514b0dc46d51`.

The mapping is data driven: `src/lib/db/courses.ts:38-40` resolves a slug
or Firestore course ID; lines 65-79 resolve a lesson ID to its ordered number.
`src/app/(app)/courses/[courseSlug]/lessons/[lessonNumber]/page.tsx:183`
calls `permanentRedirect` below the lesson's `loading.tsx` boundary.
The page stream has started, so Next emits the refresh instead of an HTTP
redirect. There is no hand-written refresh tag in application source.
`next.config.ts` has no redirect rule at this baseline.

Hypothesis: a server 301 for this confirmed legacy address consolidates
indexing and link signals on the live canonical lesson. FIX_NEEDED=yes.

## Old claude-code lessons are separate catalog entries

All three return 200, are linked on `/free` and in `/sitemap.xml`, and have
self-canonicals under `https://gelato.education/courses/claude-code/lessons/`:

| Number | Canonical suffix | HTML title | Status |
| --- | --- | --- | --- |
| 2 | 2 | Промпт-инжиниринг простым языком: как объяснить задачу ИИ — GELATO | live |
| 3 | 3 | Куда уходят лимиты ИИ и как их экономить — GELATO | live |
| 4 | 4 | Почему ИИ выдумывает ответы и как это починить — GELATO | live |

Their course ID is `Ox91xGZDCoVDUbuZXvRU`; lesson IDs are respectively
`zzGlAbeoqkdwyZAQf3jr`, `IiINwiP3pvEtX6FauUYU`, `ag0hg3ymiyE44VMbCnnW`.
The agents course has ID `O9aFw3KZqEFyGxnJB8fX`, different lesson IDs,
and different titles: introduction to Claude Code, beginning vibecoding,
and plugins/skills. CC_OLD_DUPLICATE=no for these catalog lessons; this
does not claim a comparison of the complete paid video contents.

Source: `src/lib/db/courses.ts:19-26,65-74` loads published catalog lessons;
`src/lib/site.ts:21` designates the claude-code hub;
`src/lib/catalog.ts:27-49` and `src/app/(app)/free/page.tsx:34-35` list it.
Editorial titles are in `src/lib/free-lessons.ts:72,92,112`;
canonical metadata is in the lesson page at lines 52-59.
Lesson 1 returns 404. The resolver rejects missing/unpublished lessons
(lines 70-74); its precise Firestore state is unavailable from public GETs.
No redirects for claude-code lessons 2-4 are warranted by this evidence.

Production acceptance after deployment: GET the legacy URL without following
redirects, require 301 and the exact Location; follow it and require 200.
Compare `organic_users_7d` after at least 72 hours. No deployment or
post-deployment validation has occurred in Step 0.

## Fix and local validation

`next.config.ts` adds one exact source/destination rule with `statusCode: 301`.
It runs before rendering and needs no database lookup. This is a static
exception for the single publicly verified ID pair; the general legacy
resolver remains data driven. Other legacy addresses were not generalized.

The new test uses Next 16.2.9's actual config-routing test utility. Its frozen
JSON fixture contains the literal refresh tag, URL, HTTP status and absent
Location from the GET above. The source baseline and fixture SHA-256 are
comments in the test; the test never reads Git or a moving branch.
The full original response remains in `eval/legacy.html`.

Before the fix, the new test reported **2 failed, 6 passed**, with both failures
`expected 200 to be 301`. After the fix, all eight cases pass: fixture integrity,
301 with/without a query, exact destination, no refresh body, and no config
redirect for the canonical, the three old catalog lessons or an unknown ID.
These config tests do not claim to render the destination page.

- Full `npx tsc --noEmit -p .`: exit 0.
- Full branch `npx vitest run`: 360 passed, 9 skipped; exit 0.
- Then the same command on the exact `origin/main` working-tree contents:
  352 passed, 9 skipped; exit 0. `git diff origin/main --exit-code` was empty
  before that run. The fixed files were restored byte-for-byte afterwards.
- All nine skips are the pre-existing opt-in lesson HTTP suite, without
  `LESSON_HTTP_ORIGIN`; no existing test was edited or weakened.
- Main `npx next build`: exit 0, target route `ƒ` (dynamic).
- Branch `npx next build`: exit 0, target route `ƒ` (dynamic), same as main.
- Standalone production server GETs: 301 with the exact Location, both with
  and without `?utm_source=legacy&from=gsc`; query values are preserved.
  Neither response contains an HTML refresh or a Refresh header.

Builds use an empty environment populated only with PATH/HOME, task-local
temporary/cache directories, telemetry opt-out and local Firebase emulator
settings. No service-account or application credentials are supplied.
Dependencies: `npm ci --no-audit --no-fund` from the unchanged lockfile;
Node 22.21.0, npm 10.9.4, Next 16.2.9. The existing posthog-node package emits
an engine warning requiring a newer Node patch; installation and checks pass.

Logs: `eval/red-on-old.log`, `tsc.log`, `vitest-branch.log`, `vitest-main.log`,
`main-tests-tree-diff.log`, `build-main.log` and `build-branch.log`.
The deployment and subsequent production/organic-traffic acceptance remain
pending; local validation does not establish an SEO effect.

## Resumed after the connection interruption

At 05:07 UTC, disk availability was 16,857,600,000 bytes on HOME, the task
worktree and `/`, above the 1,610,612,736-byte gate. Existing research and
regression commits were preserved. The branch build had completed before
resumption; its exit marker, route table and built redirect manifest agree.
Fresh `git fetch origin main` and `git merge --no-edit origin/main` confirmed
the same baseline, with nothing to merge. No application or test code changed
after the successful checks recorded above.

Repeated public GETs confirmed the same statuses, titles and canonicals, and
the original legacy response SHA-256 matched exactly. The three old lessons
remain linked on `/free`. The standalone HTTP checks used an empty environment
with only local emulator endpoints and task-local temporary storage.
Resume evidence: `eval/resume-0507-http.json`, `resume-0507-local-http.json`,
the corresponding raw headers/bodies, `resume-0507-server.log`,
`resume-0507-fetch.log` and `resume-0507-merge.log`.
