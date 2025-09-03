import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthProvider } from '@/hooks/useHealthMonitor';
import { PaletteDialog } from '@/components/CommandPalette';

vi.mock('react-hot-toast', () => {
  const fn: any = Object.assign(() => {}, { error: vi.fn(), success: vi.fn() });
  return { __esModule: true, default: fn, toast: fn, error: fn.error, success: fn.success, Toaster: () => null };
});
vi.mock('@/hooks/useOrgs', () => ({ __esModule: true, default: () => ({ orgs: [{ id: 'org1', name: 'Org' }] }) }));
vi.mock('@/hooks/useOrgRoles', () => ({ useOrgRoles: () => ({ role: 'owner' }) }));
import * as nextRouter from 'next/router';
import userEvent from '@testing-library/user-event';

beforeEach(() => {
  (nextRouter as any).useRouter = () => ({ push: vi.fn(), events: { on: () => {}, off: () => {} } });
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ dbOk: true, latency_ms: 5 }) })) as any;
});

describe('Health Drawer command', () => {
  it('opens drawer when selecting command', async () => {
  render(<HealthProvider><PaletteDialog open={true} onClose={()=>{}} /></HealthProvider>);
    const input = screen.getByPlaceholderText(/ค้นหา/);
    await userEvent.type(input, 'สถานะระบบ');
  const options = await screen.findAllByRole('option');
  const target = options.find(li => li.textContent?.includes('สถานะระบบ'))!;
    await userEvent.click(target);
    // Drawer appears
    const heading = await screen.findByText(/System Health/i);
    expect(heading).toBeTruthy();
  });
});
