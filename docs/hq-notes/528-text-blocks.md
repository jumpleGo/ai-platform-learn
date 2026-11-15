# Task 528: shorter answers

Hypothesis: short phrases and grouped facts make the two answers easier to scan. Visitor impact is unmeasured; there was no deployment or production verification.

Scope: `geo-answers.ts` is rendered on `/free`, despite the task calling it a home-page block. The existing renderer and the course homework FAQ were changed. URLs, analytics events, A/B variants and blog content were preserved.

Each complete answer has a 40-word maximum. Intro: 80 -> 38 words (old answer 51 plus repeated subtitle 29). Homework: 46 -> 32. Three cards per block stack in one column at 390 px. The tools sentence immediately precedes the existing lesson CTA. Homework support duration comes from existing course tariff data.

The baseline run was red on both budgets: `eval/run-528/red-on-old.log`, 2 failures. Exact old answer strings are in `tests/fixtures/text-blocks-2557bec.json`, source `2557bec0c889f691dc9135b9cb83530450b3793c`, with SHA-256 checked against git outside the test. The test reads no git state.

The existing GEO test's 40-word minimum contradicted the requested shortening. Only its /free requirement now uses a maximum of 40 and preserves key terms and CTA ordering. The new test checks the complete rendered blocks, retained facts, duration from data and negative fixtures. The existing CTA/click tests remain unchanged.

Large diffs: the inherited research document records the earlier audit and was not edited here; `tests/text-blocks-528.test.tsx` renders real components with local mocks, verifies facts and budgets, and optionally exports browser markup. This note records verification evidence and limitations.

Dependencies: existing package-lock installation, logged in `eval/run-528/npm-ci.log`; no dependency edits. Raw logs and screenshots stay in ignored `eval/run-528/`.

Verification: TypeScript exit 0. Initial full suite found two CTA adjacency failures; the markup was corrected. Final full-suite and branch-build results will be appended after completion. Parallel verification encountered generated build files; final checks must use a stable build.

Follow-up test correction: `AGENTS_FAIL_CAUSE=page_has_no_block`. The agents page renders its own FAQ, “Как устроена поддержка?”, rather than the vibecoding homework block targeted here. The support-period test now renders only vibecoding and checks its actual support feature. The no-Telegram premise belonged to a different course and did not exercise this block. The 40-word budget, retained-fact assertions, exact old-text fixtures and their SHA-256 checks remain unchanged.

Follow-up validation: `npx vitest run tests/text-blocks-528.test.tsx` passed all 8 tests, including both old-text rejections; `npx tsc --noEmit -p .` exited 0. Logs: ignored `eval/run-528/followup-vitest.log` and `followup-tsc.log`. No build or dependency installation in this run. `eval/` has no tracked files. Started from `e095ecf`, an existing descendant of `af1c5fd`, preserving history.
