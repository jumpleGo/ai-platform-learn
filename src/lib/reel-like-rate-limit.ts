const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

const requestTimestamps = new Map<string, number[]>();

export function checkRateLimit(uid: string, now = Date.now()): boolean {
  const timestamps = requestTimestamps.get(uid) || [];
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const recent = timestamps.filter((t) => t > cutoff);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestTimestamps.set(uid, recent);
    return false;
  }
  recent.push(now);
  requestTimestamps.set(uid, recent);
  return true;
}

export function resetRateLimit(): void {
  requestTimestamps.clear();
}
