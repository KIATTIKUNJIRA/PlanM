import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, _resetBuckets } from './rateLimit';

describe('rateLimit helper', () => {
  beforeEach(()=> _resetBuckets());
  it('allows first request', () => {
    const r = rateLimit('ip1', 0);
    expect(r.allowed).toBe(true);
  });
  it('blocks after limit with retryAfter', () => {
    let last: any;
    for (let i=0;i<35;i++) last = rateLimit('ip2', 0);
    expect(last.allowed).toBe(false);
    expect(typeof last.retryAfter).toBe('number');
  });
  it('resets after window', () => {
    for (let i=0;i<31;i++) rateLimit('ip3', 0);
    const blocked = rateLimit('ip3', 0);
    expect(blocked.allowed).toBe(false);
    const after = rateLimit('ip3', 61_000);
    expect(after.allowed).toBe(true);
  });
});
