import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Utility to mock org & roles
function mockOrg(role: 'member' | 'admin' | 'owner' = 'admin') {
  vi.doMock('@/hooks/useOrgs', () => ({
    __esModule: true,
    default: () => ({ orgs: [{ id: 'org_x', name: 'Demo Org' }], loading: false, error: null })
  }));
  vi.doMock('@/hooks/useOrgRoles', () => ({
    __esModule: true,
    useOrgRoles: () => ({ role, loading: false })
  }));
  vi.doMock('@/lib/supabase', () => ({
    supabase: { auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } }
  }));
}

describe('HomePage loading & admin health', () => {
  it('shows skeletons while loading (all SWR keys loading)', async () => {
    vi.resetModules();
    mockOrg('admin');
    vi.doMock('swr', () => ({
      __esModule: true,
      default: () => ({ data: undefined, error: undefined, isLoading: true })
    }));
    const Page = (await import('../../pages/home')).default;
    render(<Page />);
    const skels = screen.getAllByTestId(/skeleton/);
    expect(skels.length).toBeGreaterThan(0);
  });

  it('admin health shows fail style on error (error element)', async () => {
    vi.resetModules();
    mockOrg('admin');
    vi.doMock('swr', async () => {
      const actual = await vi.importActual<any>('swr');
      return {
        __esModule: true,
        default: (key: any, fetcher?: any) => {
          if (Array.isArray(key) && key[0] === 'recent-projects') {
            return { data: [], error: null, isLoading: false };
          }
          if (Array.isArray(key) && key[0] === 'project-type-counts') {
            return { data: [], error: null, isLoading: false };
          }
            if (Array.isArray(key) && key[0] === 'project-count') {
            return { data: 0, error: null, isLoading: false };
          }
          if (key === '/api/db-health') {
            return { data: undefined, error: new Error('boom'), isLoading: false };
          }
          return actual.default(key, fetcher);
        }
      };
    });
    vi.doMock('@/lib/internalFetch', () => ({
      __esModule: true,
      internalGet: vi.fn().mockRejectedValue(new Error('boom'))
    }));
    const Page = (await import('../../pages/home')).default;
    render(<Page />);
    expect(await screen.findByTestId('health-error')).toBeInTheDocument();
  });

  it('type stats shows error message when RPC fails', async () => {
    vi.resetModules();
    mockOrg('admin');
    vi.doMock('@/hooks/useProjectTypeStats', () => ({
      __esModule: true,
      default: () => ({ data: [], error: new Error('RPC fail'), isLoading: false })
    }));
    vi.doMock('swr', async () => {
      const actual = await vi.importActual<any>('swr');
      return {
        __esModule: true,
        default: (key: any, fetcher?: any) => actual.default(key, fetcher)
      };
    });
    const Page = (await import('../../pages/home')).default;
    render(<Page />);
    expect(await screen.findByTestId('type-stats-error')).toBeInTheDocument();
  });
});
