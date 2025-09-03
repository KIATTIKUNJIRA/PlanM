import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

function mockHooks(orgs: Array<{ id: string; name: string }>, role: 'member' | 'admin' | 'owner') {
  vi.doMock('@/hooks/useOrgs', () => ({
    __esModule: true,
    default: () => ({ orgs, loading: false, error: null }),
  }));
  vi.doMock('@/hooks/useOrgRoles', () => ({
    __esModule: true,
    useOrgRoles: () => ({ role, loading: false }),
  }));
}

function mockSupabase(projects: any[]) {
  vi.doMock('@/lib/supabase', () => ({
    supabase: {
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
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

describe('HomePage rendering', () => {
  it('renders empty state and hides AdminHealthCard for member', async () => {
  vi.resetModules();
  mockHooks([{ id: 'o1', name: 'Org One' }], 'member');
  mockSupabase([]);
  const Page = (await import('../home')).default;
  render(<Page />);

    // Title
    expect(await screen.findByText('ภาพรวมการทำงานวันนี้')).toBeInTheDocument();
    // Subtitle contains org name
  // Org name appears in subtitle span and select option
  const orgNameEls = await screen.findAllByText('Org One');
  expect(orgNameEls.length).toBeGreaterThan(0);
    // QuickActions header
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    // Empty recent projects CTA
    expect(await screen.findByText(/สร้างโครงการแรก/)).toBeInTheDocument();
    // AdminHealthCard should not appear (no DB Health text)
    expect(screen.queryByText(/DB Health/)).toBeNull();
  });

  it('renders list + stats and shows AdminHealthCard for admin', async () => {
  vi.resetModules();
    const projects = [
      { id: 'p1', name: 'Project A', code: 'A', type: 'office', updated_at: new Date().toISOString(), created_at: new Date().toISOString(), latitude: null, longitude: null },
      { id: 'p2', name: 'Project B', code: null, type: 'office', updated_at: new Date().toISOString(), created_at: new Date().toISOString(), latitude: 10, longitude: 20 },
    ];
    vi.doMock('swr', async () => {
      const actual = await vi.importActual<any>('swr');
      return {
        __esModule: true,
        default: (key: any, fetcher?: any) => {
          if (Array.isArray(key) && key[0] === 'recent-projects') {
            return { data: projects, error: null, isLoading: false };
          }
          if (Array.isArray(key) && key[0] === 'project-type-counts') {
            return { data: [{ type: 'office', cnt: 2 }], error: null, isLoading: false };
          }
          if (Array.isArray(key) && key[0] === 'project-count') {
            return { data: 2, error: null, isLoading: false };
          }
          if (typeof key === 'string' && key === '/api/db-health') {
            return { data: { ok: true }, error: null, isLoading: false };
          }
          return actual.default(key, fetcher);
        },
      };
    });
    mockHooks([{ id: 'o1', name: 'Org One' }], 'admin');
    mockSupabase([]);
    const Page = (await import('../home')).default;
    render(<Page />);
    await screen.findAllByText('Org One');
    expect(await screen.findByText('Project A')).toBeInTheDocument();
    expect(screen.getByText('Project B')).toBeInTheDocument();
  expect((await screen.findAllByText('สำนักงาน')).length).toBeGreaterThan(0);
  expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getByText('DB Health')).toBeInTheDocument();
  });
});
