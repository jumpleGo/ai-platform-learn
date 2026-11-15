# Task 509: defer browser analytics

## Step 0: premise checked

Baseline: c44a558ee51a89e0b86ee8ad12055660c6b70a49. Five static default imports of `posthog-js`:

- `src/components/experiment-exposure.tsx:4`
- `src/components/home-variant-analytics.tsx:4`
- `src/lib/analytics/posthog-client.tsx:2`
- `src/lib/analytics/track-client.ts:2`
- `src/lib/experiments-client.ts:4`

All use `import posthog from 'posthog-js';`. No dynamic SDK import exists. FIX_NEEDED=yes.

`PostHogProvider` calls `posthog.init` during render at line 16 and `register_once` for the four first-touch fields at lines 29–34. `track-client.ts:6,11` dispatches capture/identify from the imported SDK, gated on `__loaded`. Lesson next-click handlers use `track(EVENTS.lessonNextClicked, properties)`. Pageviews come from the SDK defaults (`2025-05-24`); there is no explicit application pageview call.

Hypothesis: moving this SDK out of the initial chunks reduces initial JavaScript without changing event names, properties, or call order. Deployment and subsequent production measurements are separate from local verification.
