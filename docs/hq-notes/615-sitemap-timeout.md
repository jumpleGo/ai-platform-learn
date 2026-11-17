# Task 615: Sitemap blog coverage test timeout rationale and benchmark

## 1. Problem Context

In CI deployment #608 (2026-11-16 06:22), the test in `tests/blog-lesson-next-step.test.tsx:83`:
`covers every blog article in the sitemap, including auto-articles without lesson links`
timed out at 5000 ms (Vitest default timeout) under high server contention (overall suite 415 s, import phase 211 s).
On the same commit `de4975d`, review passed (793/0, and #610 passed 803/0).

## 2. Rendering Analysis: Synchronous React SSR vs Promise.all

The test verifies that all blog posts (26 articles) listed in `sitemap()` are properly rendered without querying the catalog.
Each post is rendered via `renderBlogPost(slug)` which executes `renderToStaticMarkup(cacheListItems(page))`.

Because `renderToStaticMarkup` and React tree construction are completely synchronous CPU-bound operations in Node.js, wrapping calls in `Promise.all(...)` provides no concurrency or parallel execution benefits.

## 3. Benchmarks (Clean main vs Branch)

Clean main (`origin/main`, commit `c02a84f`, sequential `for` loop):
- Run 1: target test 1367 ms (total duration 5.22 s)
- Run 2: target test 1637 ms (total duration 8.06 s)
- Run 3: target test 3658 ms (total duration 14.49 s)
- Target test average: ~2221 ms

Branch (`hq/vera/615`, `Promise.all`):
- Run 1: target test 4123 ms (total duration 10.77 s)
- Run 2: target test 1228 ms (total duration 6.37 s)
- Run 3: target test 1271 ms (total duration 4.89 s)
- Target test average: ~2207 ms

Conclusion: `Promise.all` does not accelerate rendering. The sequential `for` loop is retained.

## 4. Timeout Justification (15000 ms)

Under heavy CI load (case #608), execution reached the 5000 ms timeout.
A local test timeout of 15000 ms (3x margin over the 5000 ms threshold) provides sufficient headroom against CPU contention while remaining strictly bounded.
All assertions and full coverage of all articles remain unweakened.
