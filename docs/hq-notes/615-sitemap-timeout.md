# Task 615: Sitemap blog coverage test timeout rationale and benchmark

## 1. Problem Context

In CI deployment #608 (2026-11-16 06:22), the test in `tests/blog-lesson-next-step.test.tsx:83`:
`covers every blog article in the sitemap, including auto-articles without lesson links`
timed out at 5000 ms (Vitest default timeout) under high server contention (overall suite took 415 s, import phase took 211 s).
On the same commit `de4975d`, review passed (793/0, and #610 passed 803/0).

## 2. Test Execution Context

The test renders all blog posts (26 articles) listed in `sitemap()` to verify that each post renders correctly and that catalog courses are not queried during rendering.
Each post executes `nextSteps(await renderPost(slug), slug)` sequentially in a `for...of` loop.

## 3. Benchmarks on Clean main

Three runs of the target test were executed on clean `main` (`origin/main`, commit `998468a8426cc5e937ae4bb327f22d60a9d6de42`) in an isolated temporary clean worktree with the command:
`npx vitest run tests/blog-lesson-next-step.test.tsx -t "covers every blog article"`

### Run 1
Source: `eval/main-run-1.log`
Literal output:
```
 RUN  v4.1.8 /home/painsearchdev/agent-hq/workspaces/vera/615/tmp/clean

 ✓ tests/blog-lesson-next-step.test.tsx (4 tests | 3 skipped) 1469ms
   ✓ covers every blog article in the sitemap, including auto-articles without lesson links  1464ms

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  03:28:56
   Duration  5.62s (transform 2.39s, setup 0ms, import 3.52s, tests 1.47s, environment 0ms)
```

### Run 2
Source: `eval/main-run-2.log`
Literal output:
```
 RUN  v4.1.8 /home/painsearchdev/agent-hq/workspaces/vera/615/tmp/clean

 ✓ tests/blog-lesson-next-step.test.tsx (4 tests | 3 skipped) 722ms
   ✓ covers every blog article in the sitemap, including auto-articles without lesson links  720ms

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  03:29:13
   Duration  3.04s (transform 1.11s, setup 0ms, import 1.65s, tests 722ms, environment 0ms)
```

### Run 3
Source: `eval/main-run-3.log`
Literal output:
```
 RUN  v4.1.8 /home/painsearchdev/agent-hq/workspaces/vera/615/tmp/clean

 ✓ tests/blog-lesson-next-step.test.tsx (4 tests | 3 skipped) 1453ms
   ✓ covers every blog article in the sitemap, including auto-articles without lesson links  1450ms

 Test Files  1 passed (1)
      Tests  1 passed | 3 skipped (4)
   Start at  03:29:19
   Duration  4.59s (transform 1.56s, setup 0ms, import 2.45s, tests 1.45s, environment 0ms)
```

## 4. Timeout Justification (15000 ms)

1. Worst single-run measurement on clean main: 1464 ms (from Run 1, with duration 5.62 s).
2. Contention factor: In CI deployment #608, overall test suite execution reached 415 s (with import phase 211 s). Under this level of CPU starvation and thread scheduling contention, sequential rendering of 26 blog post React components exceeded Vitest's default 5000 ms limit.
3. 15000 ms provides a 10x margin over the 1464 ms baseline and 3x over the default 5000 ms limit. This ensures resilience against CI load spikes while strictly bounding test execution and preserving all assertions intact.
