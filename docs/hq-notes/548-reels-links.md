# Reels discovery — task 548

Hypothesis: visible feed links increase visits between lessons (retention_w1)
and AI citations (organic_users_7d). Production measurement remains pending
rollout and at least 72 hours of observation.

Merged origin/main at 398540434bf5824fabb4b475c622787757370133; the #543 footer
link exists. The saved public-feed baseline shows its empty message and zero
video elements; this is an HTML observation, not a direct database count.

Availability is exactly `(await listPublishedReels()).length > 0`; exceptions
return false. React cache shares the result within a server render. The helper
gates the footer, both menus, home hero and llms.txt. Read the installed Next.js
server/client composition and database request-memoization guides.

Files with diffs over 2000 bytes:

- site-footer.tsx: async availability check, conditional existing #543 link,
  filtered base navigation to avoid a duplicate feed link.
- site-nav.tsx: server wrappers fetch availability and pass a boolean to the
  interactive desktop/mobile components without changing the app layout.
- site-nav-client.tsx: transferred existing active-link and burger behavior;
  smaller desktop spacing/text below 1280 px prevents account overlap at 1024.
- reels-links-548.test.tsx: 21 checks render all four destinations with empty,
  failed and one-reel responses, including guest/student and open mobile menus.
- This note records the hypothesis, large-diff explanations, verification and
  the limits of fixture screenshots and production observation.

Existing test changes add database/server-only mocks; the footer test awaits
the async component and supplies a published reel. All assertions are retained.

Verification: new test on baseline: 8 failed / 21, exit 1. Final targeted six
files: 53 passed, exit 0. Full tsc: exit 0. Logs and mocked-data screenshots at
390/1024/1440 px are in eval/, excluded via info/exclude. Dependencies were
preserved from the earlier run; no install or Next build. Platform review runs
the build and full suite. Screenshots render real components with fixture data;
they do not claim a deployed result.
