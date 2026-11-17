'use client';

import type { PostHog, PostHogConfig } from 'posthog-js';
import { isTrackingDisabled } from './exclusions';

type Call = (sdk: PostHog) => void;
let sdk: PostHog | undefined;
let loading: Promise<void> | undefined;
const pending: Call[] = [];

function enabled() {
  return typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_POSTHOG_KEY && !isTrackingDisabled();
}

function dispatch(call: Call) {
  if (sdk) call(sdk);
  else if (enabled()) pending.push(call);
}

// Only the provider starts the download, after paint. Child effects can queue
// calls before that; first-touch properties must be registered before replay.
function init(key: string, config: Partial<PostHogConfig>, firstTouch: Record<string, string>) {
  if (!enabled()) return Promise.resolve();
  if (loading) return loading;
  loading = import('posthog-js').then(({ default: loaded }) => {
    if (!enabled()) {
      loading = undefined;
      return;
    }
    loaded.init(key, config);
    loaded.register_once(firstTouch);
    // Keep sdk unset until replay completes, so reentrant calls join the tail.
    while (pending.length) pending.shift()!(loaded);
    sdk = loaded;
  }).catch(error => {
    // Keep queued events when a chunk download fails; the provider can retry.
    loading = undefined;
    throw error;
  });
  return loading;
}

const posthog = {
  init,
  get __loaded() { return !!sdk; },
  capture(...args: Parameters<PostHog['capture']>) {
    dispatch(loaded => { loaded.capture(...args); });
  },
  identify(...args: Parameters<PostHog['identify']>) {
    dispatch(loaded => { loaded.identify(...args); });
  },
  reset(...args: Parameters<PostHog['reset']>) {
    dispatch(loaded => { loaded.reset(...args); });
  },
  register(...args: Parameters<PostHog['register']>) {
    dispatch(loaded => { loaded.register(...args); });
  },
  register_once(...args: Parameters<PostHog['register_once']>) {
    dispatch(loaded => { loaded.register_once(...args); });
  },
  get_distinct_id() { return sdk?.get_distinct_id(); },
};

export default posthog;
