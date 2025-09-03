import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import HomePage from '../../pages/home';

// Mock hooks and supabase client pieces used in the page
const noOrgImpl = { orgs: [], loading: false };
const oneOrgImpl = { orgs: [{ id: 'o1', name: 'Org One' }], loading: false };
let orgMode: 'none' | 'one' = 'none';
vi.mock('@/hooks/useOrgs', () => ({
  __esModule: true,
  default: () => (orgMode === 'none' ? noOrgImpl : oneOrgImpl)
}));
vi.mock('@/hooks/useOrgRoles', () => ({
  useOrgRoles: () => ({ role: 'member' })
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ order: () => ({ order: () => ({ limit: () => ({}) }) }) }) }) })
  }
}));
vi.mock('@/hooks/useProjectTypeStats', () => ({
  __esModule: true,
  default: () => ({ data: [], isLoading: false, error: null })
}));

describe('HomePage edge cases', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('shows CTA when no orgs', async () => {
    orgMode = 'none';
    render(<HomePage />);
    expect(await screen.findByTestId('no-orgs')).toBeTruthy();
  });
  it('shows empty recent & stats when org but no projects', async () => {
    orgMode = 'one';
    render(<HomePage />);
    const labels = await screen.findAllByText('Org One');
    expect(labels.length).toBeGreaterThan(0);
    await screen.findByTestId('empty-recent');
  });
});
