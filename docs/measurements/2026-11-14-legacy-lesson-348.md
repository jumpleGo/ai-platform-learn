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
