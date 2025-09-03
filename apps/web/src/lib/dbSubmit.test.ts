import { describe, it, expect, vi, beforeEach } from 'vitest';
import { insertRow } from './dbSubmit';
import { toast } from 'react-hot-toast';

let mockError: any = null;
let mockData: any = { id: 'x1', name: 'Test' };

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: () => ({ data: mockError ? null : mockData, error: mockError })
        })
      })
    })
  }
}));

// capture success/error messages via mocked toast (from global setup)

describe('dbSubmit insertRow', () => {
  beforeEach(() => {
    mockError = null;
    mockData = { id: 'x1', name: 'Test' };
    (toast as any)._messages?.splice?.(0);
  });

  it('returns data and emits success toast', async () => {
    const row = await insertRow('dummy', { name: 'Test' }, { entity: 'ทดสอบ', successMessage: 'สำเร็จแล้ว' });
    expect(row.name).toBe('Test');
    expect((toast as any)._messages.join(' ')).toMatch(/สำเร็จแล้ว/);
  });

  it('invokes onSuccess callback', async () => {
    const cb = vi.fn();
    await insertRow('dummy', { name: 'Test' }, { onSuccess: cb });
    expect(cb).toHaveBeenCalled();
  });

  it('shows friendly error toast and throws', async () => {
    mockError = { code: '23505', details: 'Key (code)=(A) already exists', message: 'duplicate key' };
    await expect(insertRow('dummy', { code: 'A' }, { entity: 'ข้อมูล', labels: { code: 'รหัส' } }))
      .rejects.toBe(mockError);
    expect((toast as any)._messages.join(' ')).toMatch(/รหัสซ้ำ/);
  });
});
