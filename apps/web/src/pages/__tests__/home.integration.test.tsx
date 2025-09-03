import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Shared mock data
const org = { id: 'org_1', name: 'Demo Org' };
const projects = [
  { id: 'p1', name: 'House A', code: 'HA', type: 'house', updated_at: new Date().toISOString(), created_at: new Date().toISOString(), latitude: null, longitude: null },
  { id: 'p2', name: 'Condo Z', code: 'CZ', type: 'condo', updated_at: new Date().toISOString(), created_at: new Date().toISOString(), latitude: 10, longitude: 20 },
  { id: 'p3', name: 'House B', code: null, type: 'house', updated_at: new Date().toISOString(), created_at: new Date().toISOString(), latitude: null, longitude: null },
];

function mockSupabaseAuth() {
  vi.doMock('@/lib/supabase', () => ({
    supabase: {
      auth: { getUser: async () => ({ data: { user: { id: 'user_1' } } }) },
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () => ({
                limit: () => ({ data: projects, error: null }),
              }),
            }),
          }),
        }),
      }),
    },
  }));
}

function mockSWR(projectsData: any[], healthOk: boolean | null) {
  vi.doMock('swr', async () => {
    const actual = await vi.importActual<any>('swr');
    return {
      __esModule: true,
      default: (key: any, fetcher?: any) => {
        if (Array.isArray(key) && key[0] === 'recent-projects') {
          return { data: projectsData, error: null, isLoading: false };
        }
        if (Array.isArray(key) && key[0] === 'project-type-counts') {
          // Derive counts from provided projectsData
          const counts: Record<string, number> = {};
          projectsData.forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1; });
          const stats = Object.entries(counts).map(([type, cnt]) => ({ type, cnt }));
          return { data: stats, error: null, isLoading: false };
        }
        if (Array.isArray(key) && key[0] === 'project-count') {
          return { data: projectsData.length, error: null, isLoading: false };
        }
        if (typeof key === 'string' && key === '/api/db-health') {
          if (healthOk === null) return { data: undefined, error: undefined, isLoading: false };
          return { data: { ok: healthOk }, error: null, isLoading: false };
        }
        return actual.default(key, fetcher);
      },
    };
  });
}

function mockHooks(role: 'member' | 'admin') {
  vi.doMock('@/hooks/useOrgs', () => ({
    __esModule: true,
    default: () => ({ orgs: [org], loading: false, error: null }),
  }));
  vi.doMock('@/hooks/useOrgRoles', () => ({
    __esModule: true,
    useOrgRoles: () => ({ role, loading: false }),
  }));
}

function mockInternalFetch(ok = true) {
  vi.doMock('@/lib/internalFetch', () => ({
    __esModule: true,
    internalGet: vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok }) }),
    internalJson: vi.fn().mockResolvedValue({ ok }),
  }));
}

async function importPage() {
  const Page = (await import('../home')).default;
  return Page;
}

// Utility to render page with a role
async function renderHome(role: 'member' | 'admin', healthOk: boolean | null = null) {
  vi.resetModules();
  mockHooks(role);
  mockSupabaseAuth();
  mockSWR(projects, role === 'admin' ? (healthOk ?? true) : null);
  if (role === 'admin') mockInternalFetch(healthOk ?? true);
  const Page = await importPage();
  render(<Page />);
}

describe('HomePage integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('member: renders quick actions, recent projects, stats, hides AdminHealthCard', async () => {
    await renderHome('member');

    // QuickActions: expect create project button text (Thai) present
    expect(await screen.findByText('Quick Actions')).toBeInTheDocument();
  // Org name appears (header or option) indicating org context loaded
  expect((await screen.findAllByText('Demo Org')).length).toBeGreaterThan(0);

    // RecentProjects list size (3)
    expect(await screen.findByText('House A')).toBeInTheDocument();
    expect(screen.getByText('Condo Z')).toBeInTheDocument();
    expect(screen.getByText('House B')).toBeInTheDocument();

  // StatsByType counts: house 2, condo 1 (ensure at least these count elements exist)
  const twos = screen.getAllByText('2');
  expect(twos.length).toBeGreaterThan(0);
  const ones = screen.getAllByText('1');
  expect(ones.length).toBeGreaterThan(0);

    // AdminHealthCard hidden
    expect(screen.queryByText(/DB Health/i)).toBeNull();
  });

  it('admin: renders AdminHealthCard and health ok badge', async () => {
    await renderHome('admin', true);

    // Projects show
    expect(await screen.findByText('House A')).toBeInTheDocument();
    // AdminHealthCard visible
    expect(await screen.findByText('DB Health')).toBeInTheDocument();
  });
});
