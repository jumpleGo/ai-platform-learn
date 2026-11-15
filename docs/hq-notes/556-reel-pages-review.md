# Reel pages #556: review correction

The sitemap imports `listPublishedReels` from `src/lib/db/reels.ts`, declares its result as `Reel[]`, and removes the optional-export fallback. The unused courses re-export is removed.

Eight sitemap suites add only a narrow `db/reels` mock; assertions and #574 exceptions/hash fixture are unchanged. #556 drops the hack from its courses mock and adds a query-error assertion. Old code: TS7006, tsc=2, tests #556=28/2. Fixed: tsc=0, #556=30/0, #574=33/0 (pass/fail). Nine dependent suites also pass.

SIGNED_URL_IN_JSONLD=yes. `src/app/reels/[id]/page.tsx:15` and `:24` set a one-hour TTL. `:26` signs video and `:28` signs the poster, used in VideoObject at `:62` and og:image at `:48`. `src/lib/reels.ts:14` stores only `posterPath`; no permanent public reel poster URL is available in the model. `/og-gelato.png` at page line 29 remains the fallback for absent posters. No new URL or storage permission was introduced.

Diffs over 2000 characters: `src/app/reels/[id]/page.tsx` implements the public page, player, canonical/social metadata and VideoObject. `tests/reel-page-556.test.tsx` checks publication, guest routing, metadata, JSON-LD and sitemap, including the new regression.

Logs: `eval/*-review-556.*` (excluded from git). Full build belongs to the platform; production verification awaits rollout.
