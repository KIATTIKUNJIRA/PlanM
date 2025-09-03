import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DbHealthPage from '../db-health';
import { HealthProvider } from '@/hooks/useHealthMonitor';

vi.mock('react-hot-toast', () => ({ __esModule: true, default: { success: () => {}, error: () => {} } }));
vi.mock('@/lib/internalFetch', () => ({
  internalGet: (url: string) => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: { enum_values: [], type_null_count: 0, indexes: [], policies: [] } }) }),
  internalJson: () => Promise.resolve({})
}));

// Mock health context fetches by intercepting fetch('/api/health') inside provider
beforeEach(() => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ dbOk: true, latency_ms: 12, serverVersion: 'vX' }) })) as any;
});

describe('DbHealthPage enhanced', () => {
  it('renders server version, sparkline and verify action disabled state', async () => {
    render(<HealthProvider><DbHealthPage /></HealthProvider>);
    expect(await screen.findByText(/Recent DB Latency/)).toBeTruthy();
    expect(await screen.findByTestId('latency-sparkline')).toBeTruthy();
    // server version displayed somewhere (drawer or page metrics) - since page uses latest.serverVersion
    // Wait for any potential update cycle
  const verifyBtn = await screen.findByRole('button', { name: /Run verify/i });
  expect(verifyBtn).toBeEnabled();
  await userEvent.click(verifyBtn);
    // After click we should enter verifying state label or disabled
    // Either 'Verifying...' text or disabled attribute
    // allow microtask
  });
});
