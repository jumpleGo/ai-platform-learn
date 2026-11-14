# Reels part B — task 451

Hypothesis: an admin upload form lets the team prepare reels without a developer;
this enables the later public feed and a retention_w1 measurement.

Baseline: fresh origin/main is 4da34e767ef762aaf9de96812383307ba00653c2.
The merge was already up to date; the initial worktree was clean.

Part A entry points:

- `src/app/api/admin/reels/[reelId]/upload/route.ts:11`: POST(request, context), raw video body.
- `src/lib/db/reels.ts:17`: createReel(metadata): Promise<string>.
- `src/lib/db/reels.ts:26`: getReel(id): Promise<Reel | null>.
- `src/lib/db/reels.ts:31`: listPublishedReels(): Promise<Reel[]>.
- `src/lib/db/reels.ts:40`: setReelVideoPath(id, path): Promise<void>.
- `src/lib/require-admin.ts:5`: requireAdmin(), reused without changing access logic.
- Admin example: `src/app/admin/partners/page.tsx:70`, actions guarded at `actions.ts:16`.

The form also needs a published-course selector because Part A requires courseSlug.
New uploads remain drafts, matching Part A. The public feed belongs to part C.

Initial free space: 2529140736 bytes. npm ci passed its disk gate and completed.
Its local output was reclaimed to restore the build gate. Dependencies use a local
symlink to existing main node_modules; both package-lock.json hashes match:
d039cc31faaf00ed24d5043819393b43a6f3a8854dfefb3863c7b5f8ae476a0f.
Hard links were unavailable across mounts. Both builds use webpack, with secrets
removed from the process environment. Raw verification logs are excluded in eval/.

Production validation is pending deployment. After rollout, check an admin upload,
replacement and double-submit; then assess retention_w1 after at least 72 hours.
