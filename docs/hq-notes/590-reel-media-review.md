# Stable reel media URLs #590

Hypothesis: expired search/social preview images reduce visits to reel pages. Stable media URLs should preserve search/social previews and organic_users_7d.

The #556 page put one-hour Storage signatures in VideoObject contentUrl/thumbnailUrl and og:image. It now uses `/reels/[id]/video` and `/reels/[id]/poster`, including Twitter and the player; embedUrl is the reel page. Both GET routes check the existing published/playable reel and published-course filter before returning a fresh 302. Missing, draft, unplayable and retired-course reels return 404 without signing. A published legacy reel without a poster redirects to the existing raster fallback. Redirects and 404s have `Cache-Control: no-store`; routes are force-dynamic. Proxy permits only these two additional paths under the existing 20-character ASCII alphanumeric ID rule.

The regression renders current JSON-LD and reads generated OG/Twitter metadata, rejects signature query parameters, and requires the stable URLs. All four identical checks fail on executable minimal #556 snippets from c48931631a099ed78dc02cf54d097c45554204b0. The fixture records the original source SHA256 and the hash of its 11 copied lines; tests never read Git. Further checks cover refresh after an hour, withdrawal, the fallback, invalid IDs and guest access boundaries.

Existing #556 expectations change because the intended media addresses change; publication/query-error assertions are retained and extended to both routes. The two reel suites explicitly mock db/reels with a spy delegating to the existing implementation over mocked Firestore, preserving their integration checks. Other sitemap suites already have the narrow mock, including #583; its assertions remain unchanged. #574 exceptions and its frozen fixture remain unchanged.

Validation: `npx tsc --noEmit -p .` exited 0. Vitest passed all 14 selected suites (188 passed, 2 existing expected failures): #590, #556, public reels, #574 and all 12 suites with actual sitemap imports. #590 reports OLD_FAILS=4 and NEW_FAILS=0; SITEMAP_SUITES_WITHOUT_MOCK=[]. `git diff --check` passed.

Full next build is reserved for platform review. No deployment was performed; production verification, desktop/mobile screenshots of a published reel and observation of organic_users_7d await rollout.
