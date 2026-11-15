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

## Step 1: production before

Measured 2026-11-15 UTC. HTML: `curl -s --compressed`; each unique external `script src`: raw response bytes with `Accept-Encoding: gzip` (equivalent to piping to `wc -c`). No preload-only or inline scripts included.

### /: 378973 B

| script src | gzip bytes |
| --- | ---: |
| `/_next/static/chunks/0ha4m18glnjqn.js` | 8796 |
| `/_next/static/chunks/39jur218l8-_y.js` | 8879 |
| `/_next/static/chunks/1h5s7r5en_mue.js` | 29140 |
| `/_next/static/chunks/27jktro2p5rq9.js` | 9236 |
| `/_next/static/chunks/0um2kh66idet2.js` | 70728 |
| `/_next/static/chunks/turbopack-3eez9nhmn1l23.js` | 4178 |
| `/_next/static/chunks/3cuz7hkr6nt-4.js` | 8707 |
| `/_next/static/chunks/0u2uia-kod828.js` | 13836 |
| `/_next/static/chunks/0lhug96r8ne8e.js` | 19812 |
| `/_next/static/chunks/2i1jz2stgcveg.js` | 32390 |
| `/_next/static/chunks/1j9ihm788jhc4.js` | 63591 |
| `/_next/static/chunks/33u59vf_8xpd-.js` | 12879 |
| `/_next/static/chunks/0urvqn_k8tj_e.js` | 7186 |
| `/_next/static/chunks/0p87v2gk_m09p.js` | 15588 |
| `/_next/static/chunks/0iqwxd76nkjt9.js` | 14681 |
| `/_next/static/chunks/0-q8ftv5fmemx.js` | 17383 |
| `/_next/static/chunks/0cz1d0mv5g_q7.js` | 39627 |
| `/_next/static/chunks/2iho8jepmwwua.js` | 2336 |

### /courses/vibecoding: 348462 B

| script src | gzip bytes |
| --- | ---: |
| `/_next/static/chunks/0ha4m18glnjqn.js` | 8796 |
| `/_next/static/chunks/39jur218l8-_y.js` | 8879 |
| `/_next/static/chunks/1h5s7r5en_mue.js` | 29140 |
| `/_next/static/chunks/27jktro2p5rq9.js` | 9236 |
| `/_next/static/chunks/0um2kh66idet2.js` | 70728 |
| `/_next/static/chunks/turbopack-3eez9nhmn1l23.js` | 4178 |
| `/_next/static/chunks/3cuz7hkr6nt-4.js` | 8707 |
| `/_next/static/chunks/0u2uia-kod828.js` | 13836 |
| `/_next/static/chunks/0lhug96r8ne8e.js` | 19812 |
| `/_next/static/chunks/2i1jz2stgcveg.js` | 32390 |
| `/_next/static/chunks/1j9ihm788jhc4.js` | 63591 |
| `/_next/static/chunks/33u59vf_8xpd-.js` | 12879 |
| `/_next/static/chunks/1a-7r3iun7lxq.js` | 8449 |
| `/_next/static/chunks/1zt-5e3x42w8s.js` | 15878 |
| `/_next/static/chunks/0cz1d0mv5g_q7.js` | 39627 |
| `/_next/static/chunks/2iho8jepmwwua.js` | 2336 |

### /blog/vaybkoding-chto-eto: 333611 B

| script src | gzip bytes |
| --- | ---: |
| `/_next/static/chunks/0ha4m18glnjqn.js` | 8796 |
| `/_next/static/chunks/39jur218l8-_y.js` | 8879 |
| `/_next/static/chunks/1h5s7r5en_mue.js` | 29140 |
| `/_next/static/chunks/27jktro2p5rq9.js` | 9236 |
| `/_next/static/chunks/0um2kh66idet2.js` | 70728 |
| `/_next/static/chunks/turbopack-3eez9nhmn1l23.js` | 4178 |
| `/_next/static/chunks/3cuz7hkr6nt-4.js` | 8707 |
| `/_next/static/chunks/0u2uia-kod828.js` | 13836 |
| `/_next/static/chunks/0lhug96r8ne8e.js` | 19812 |
| `/_next/static/chunks/2i1jz2stgcveg.js` | 32390 |
| `/_next/static/chunks/1j9ihm788jhc4.js` | 63591 |
| `/_next/static/chunks/33u59vf_8xpd-.js` | 12879 |
| `/_next/static/chunks/1a-7r3iun7lxq.js` | 8449 |
| `/_next/static/chunks/1d0edgkwk1_r7.js` | 1027 |
| `/_next/static/chunks/0cz1d0mv5g_q7.js` | 39627 |
| `/_next/static/chunks/2iho8jepmwwua.js` | 2336 |


## Local baseline

Next.js 16.2.9 Turbopack, Node 22.21.0, lockfile installed by `npm ci`. Read the packaged Lazy Loading, use client, and Next CLI guides before changes.

First-load files are the deduplicated union of `.next/build-manifest.json` rootMainFiles/polyfillFiles and the route client-reference manifest entryJSFiles (the same entries Next uses for route script tags). Each file is gzip-compressed separately at level 6. Local and production baselines are distinct; production may serve another build/home variant.

| Route | Before, gzip B |
| --- | ---: |
| / | 341470 |
| /courses/vibecoding | 348620 |
| /blog/vaybkoding-chto-eto | 333768 |

The 63591 B SDK chunk is present in every initial route manifest. Raw HTML, per-script measurements, build logs, and frozen source provenance are retained in ignored `eval/509/`. No environment files or credentials were changed.

## Step 2: deferred SDK

A single `import('posthog-js')` lives in the thin client wrapper. The provider starts it in a task after an animation frame from useEffect. A shared promise prevents duplicate initialization. First-touch values are snapshotted before loading, registered after init, then queued register/capture/identify/reset calls replay in order. Download failures retain the queue and schedule a retry. All five application import sites now use the wrapper; the synchronous visitor-ID fallback remains available after SDK readiness.

Event names, payload builders, the SDK defaults controlling automatic/history pageviews, and the admin before_send filter are unchanged.

The baseline build compiled successfully and its emitted files were measured; its remaining TypeScript phase and the optional baseline test run were stopped to preserve the 30-minute budget for the final full checks.
