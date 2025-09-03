import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProjectForm } from '../CreateForms';
import { toast } from 'react-hot-toast';

let insertError: any = null;

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
    from: () => ({
      insert: () => ({ select: () => ({ single: () => ({ data: null, error: insertError }) }) }),
    }),
  },
}));

// Mock useOrgs to avoid internal supabase select chain for listing orgs
vi.mock('@/hooks/useOrgs', () => ({
  default: () => ({ orgs: [{ id: 'org1', name: 'Org One' }], loading: false, error: null }),
  __esModule: true,
}));

async function fillRequired() {
  const name = screen.getByLabelText(/ชื่อโครงการ/i) as HTMLInputElement;
  await userEvent.clear(name);
  await userEvent.type(name, 'Test Project');
  const orgSelect = screen.getByLabelText(/เลือกองค์กร/i) as HTMLSelectElement;
  await userEvent.selectOptions(orgSelect, 'org1');
}

describe('ProjectForm error mapping', () => {
  beforeEach(() => {
    insertError = null;
    (toast as any)._messages?.splice?.(0);
  });

  it('maps 23505 duplicate code', async () => {
    insertError = { code: '23505', message: 'duplicate key value violates unique constraint', details: 'Key (org_id, code)=(..., XX) already exists' };
    render(<ProjectForm />);
  await fillRequired();
  await userEvent.click(screen.getByRole('button', { name: /สร้างโครงการ/i }));
    await waitFor(() => {
      expect((toast as any)._messages.join(' ')).toMatch(/รหัสโครงการซ้ำในองค์กร/);
    });
  });

  it('maps 22P02 invalid enum', async () => {
    insertError = { code: '22P02', message: 'invalid input value for enum project_type: "villa"' };
    render(<ProjectForm />);
  await fillRequired();
  await userEvent.click(screen.getByRole('button', { name: /สร้างโครงการ/i }));
    await waitFor(() => {
      expect((toast as any)._messages.join(' ')).toMatch(/ประเภทโครงการไม่ถูกต้อง/);
    });
  });
});
