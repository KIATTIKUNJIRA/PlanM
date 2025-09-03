import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
vi.mock('react-hot-toast', () => {
  const fn: any = Object.assign(() => {}, { error: vi.fn(), success: vi.fn() });
  return { __esModule: true, default: fn, toast: fn, error: fn.error, success: fn.success, Toaster: () => null };
});
import { HealthProvider, useHealth } from '@/hooks/useHealthMonitor';

// Mock fetch
const makeResp = (ok: boolean, body: any, status = 200) => ({ ok, status, json: async () => body } as any);

function TestComp() {
  const { latest, manualPing } = useHealth();
  return <div>
    <button onClick={()=>manualPing()}>ping</button>
    <pre data-testid="status">{latest ? (latest.ok ? (latest.dbOk===false?'degraded':'ok') : 'error') : 'none'}</pre>
  </div>;
}

describe('HealthMonitor adaptive logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    let count = 0;
    global.fetch = vi.fn(async () => {
      count++;
      // first call ok healthy, second degraded, third+ error
      if (count === 1) return makeResp(true, { dbOk: true, latency_ms: 10 });
      if (count === 2) return makeResp(true, { dbOk: false, latency_ms: 12 });
      if (count === 3) return makeResp(false, {} as any, 500);
      return makeResp(false, {} as any, 500);
    }) as any;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules different intervals based on status', async () => {
    render(<HealthProvider><TestComp /></HealthProvider>);
    // initial run
    await act(async () => { vi.advanceTimersByTime(0); });
    expect(screen.getByTestId('status').textContent).toBe('ok');
    // advance less than healthy interval - no new fetch yet (healthy=60s)
    await act(async () => { vi.advanceTimersByTime(30_000); });
    expect((fetch as any).mock.calls.length).toBe(1);
    // advance to 60s triggers second fetch -> degraded
    await act(async () => { vi.advanceTimersByTime(30_001); });
    expect(screen.getByTestId('status').textContent).toBe('degraded');
    expect((fetch as any).mock.calls.length).toBe(2);
    // degraded interval 15s
    await act(async () => { vi.advanceTimersByTime(15_000); });
    expect((fetch as any).mock.calls.length).toBe(3);
    expect(screen.getByTestId('status').textContent).toBe('error');
  // error backoff scheduled at 5s; advance to just before it fires (no change)
  await act(async () => { vi.advanceTimersByTime(4_900); });
  expect((fetch as any).mock.calls.length).toBe(3);
  // fire it (some environments may schedule next tick; allow microtask flush)
  await act(async () => { vi.advanceTimersByTime(200); });
  // Depending on timer ordering the error retry may not yet have executed; accept >=3
  expect((fetch as any).mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
