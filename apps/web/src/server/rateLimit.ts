// In-memory rate limiter (per process) for lightweight endpoints.
// 30 req / min per key (IP). Export pure helpers for test.

export interface RateBucket { count: number; ts: number }
const LIMIT = 30;
const WINDOW_MS = 60_000;
const buckets = new Map<string, RateBucket>();

export function rateLimit(key: string | undefined, nowMs: number = Date.now()): { allowed: boolean; retryAfter?: number } {
  if (!key) return { allowed: true };
  const b = buckets.get(key);
  if (!b || nowMs - b.ts > WINDOW_MS) {
    buckets.set(key, { count: 1, ts: nowMs });
    return { allowed: true };
  }
  b.count += 1;
  if (b.count > LIMIT) {
    const retryAfter = Math.max(0, WINDOW_MS - (nowMs - b.ts));
    return { allowed: false, retryAfter: Math.ceil(retryAfter / 1000) };
  }
  return { allowed: true };
}

// Legacy boolean helper retained for existing imports/tests (if any)
export function rateLimited(key: string | undefined, nowMs?: number): boolean {
  return !rateLimit(key, nowMs).allowed;
}

export function _getBucket(key: string) { return buckets.get(key); }
export function _resetBuckets() { buckets.clear(); }
