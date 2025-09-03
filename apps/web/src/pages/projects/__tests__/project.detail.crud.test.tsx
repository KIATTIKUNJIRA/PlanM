import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ProjectDetailPage from '../[id]';
import { useRouter } from 'next/router';

// Mock router to supply id
vi.mock('next/router', () => ({
  useRouter: () => ({ query: { id: 'p1' }, push: vi.fn() })
}));

// Mock org roles -> owner to allow editing
vi.mock('@/hooks/useOrgRoles', () => ({ useOrgRoles: () => ({ role: 'owner', loading: false }) }));

// Cache invalidation helper
const afterProjectChangeSpy = vi.fn();
vi.mock('@/lib/afterProjectChange', () => ({ afterProjectChange: (...args:any[]) => afterProjectChangeSpy(...args) }));

// Supabase mock
let updatedPayload: any = null;
let deleted = false;
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'projects') {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'p1', org_id: 'o1', name: 'Proj A', code: 'AA', type: 'house', address: 'ADDR', latitude: 10, longitude: 20 } }) }) }),
          update: (changes: any) => ({ eq: () => ({ select: () => ({ single: () => { updatedPayload = changes; return Promise.resolve({ data: { id: 'p1', org_id: 'o1', ...changes }, error: null }); } }) }) }),
          delete: () => ({ eq: () => { deleted = true; return Promise.resolve({ error: null, status: 204 }); } })
        } as any;
      }
      return {} as any;
    }
  }
}));

// dbSubmit wrappers
vi.mock('@/lib/dbSubmit', () => ({
  updateRow: async (_t:string, _id:string, changes:any) => { updatedPayload = changes; return { ...changes }; },
  deleteRow: async () => { deleted = true; return true; }
}));

// toast
vi.mock('react-hot-toast', () => ({ toast: { success: ()=>{}, error: ()=>{} } }));

describe('ProjectDetailPage CRUD', () => {
  beforeEach(() => { updatedPayload = null; deleted = false; afterProjectChangeSpy.mockReset(); });
  it('allows owner to edit and save project', async () => {
    render(<ProjectDetailPage />);
    expect(await screen.findByTestId('edit-project-btn')).toBeTruthy();
    await userEvent.click(screen.getByTestId('edit-project-btn'));
    const nameInput = await screen.findByDisplayValue('Proj A');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Proj B');
    await userEvent.click(screen.getByTestId('save-project-btn'));
    await waitFor(()=> expect(updatedPayload?.name).toBe('Proj B'));
    expect(afterProjectChangeSpy).toHaveBeenCalledWith('o1');
  });
  it('allows owner to delete project', async () => {
    // mock confirm true
    vi.spyOn(window, 'confirm').mockImplementation(()=>true);
    render(<ProjectDetailPage />);
    await screen.findByTestId('delete-project-btn');
    await userEvent.click(screen.getByTestId('delete-project-btn'));
    await waitFor(()=> expect(deleted).toBe(true));
    expect(afterProjectChangeSpy).toHaveBeenCalledWith('o1');
  });
});
