import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimited, _resetBuckets } from './rateLimit';

describe('rateLimited', () => {
  beforeEach(() => _resetBuckets());
  it('allows first 30 then blocks', () => {
    let blocked = false;
    for (let i=0;i<35;i++) {
      if (rateLimited('1.1.1.1', 0)) blocked = true;
    }
    expect(blocked).toBe(true);
  });
  it('resets after window', () => {
    for (let i=0;i<30;i++) rateLimited('2.2.2.2', 0);
    expect(rateLimited('2.2.2.2', 0)).toBe(true);
    // After window
    expect(rateLimited('2.2.2.2', 61_000)).toBe(false);
  });
});
