# #167 ACCEPT v3

Hypothesis: blog links improve discovery. Traffic/GEO: rollout +72h, gated by #52/#164; no deployment.

Rendered 17 real BLOG_POSTS (src/lib/blog.ts:1229, identical on main 91d5fcb/branch); counted <article> hrefs without navigation. /courses/* coverage: 9/17=52.94% → 17/17=100%; any lesson 2→17; first free 1→17. LOW_N=yes (17-article census). Template: src/app/(app)/blog/[slug]/page.tsx:172 (body), :196 (CTA).

Snapshot: curl -fsSL https://gelato.education/courses, HTTP 200, 72915 bytes, no JS. Visible order: vibecoding, claude-code-agents, ai-cartoons (test: «Скоро»). Auxiliary curl HTML, HTTP 200:

- /courses/vibecoding/lessons/1: guest unlocked 1,3–7; locked 2.
- /courses/claude-code-agents/lessons/1: unlocked 1; locked 2–9.
- /free: claude-code lessons 2,3,4 (hub absent from /courses).

Projection: slug/test/first free; order=display rank; unused fields=defaults; test course excluded.

Sources: src/lib/site.ts:17 `BEGINNER_URL='/courses/claude-code-agents'`; :21,23 `isFreeHub`: ['claude-code'], slug??id. src/lib/slug.ts:34,38: courseKey=slug||id; lessonPath builds URL. src/lib/blog.ts:24: editorial lessonPath. «Обзор нового инструмента»: agents/7 was correct for synthetic data; expectation now uses these values. Live: agents/1. All 13 new #167 scenarios/≥90% retained; assertions deduplicated.

Catalog failure preserves article/FAQ/JSON-LD; notFound outside catch. 4e42a2d regression, exit 1:
```
 FAIL  tests/blog-start-here.test.ts > catalog throw preserves article without CTA
Error: catalog unavailable
```

PATH=$HOME/.local/node/bin:$PATH. Main exported locally; shared node_modules. npx tsc --noEmit: exit 0/0; raw logs 0 bytes; main/branch/new errors=0/0/0. #140 noise absent.

npx vitest run, raw tails main/branch (exit 0 each):
```
 Test Files  18 passed (18)
      Tests  163 passed (163)
   Start at  02:17:00
   Duration  15.57s (transform 3.56s, setup 0ms, import 5.42s, tests 811ms, environment 16ms)
 Test Files  17 passed (17)
      Tests  145 passed (145)
   Start at  02:21:46
   Duration  19.43s (transform 3.01s, setup 0ms, import 5.95s, tests 2.78s, environment 4ms)
```
Existing suites differ. Curl: newest posts (Nov 10), HTTP 200 + article/h1: claude-fable-5-2-mythos-5-2-proverka; minimax-h3-image-novichku; lokalnoe-video-comfyui-ltx-hyperflow.

OUT_OF_SCOPE: agents landing → /courses/claude-code/lessons/1?from=course_landing gives HTTP 200 + NEXT_HTTP_ERROR_FALLBACK;404, noindex.
