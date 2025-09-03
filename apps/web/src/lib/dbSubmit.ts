import { supabase } from '@/lib/supabase';
import { showPgErrorToast } from './dbErrors';
import { toast } from 'react-hot-toast';

type SubmitOpts = {
  entity?: string;                // Friendly entity name e.g. 'โครงการ'
  labels?: Record<string,string>; // Column label mapping
  select?: string;                // Custom select clause, default '*'
  successMessage?: string;        // Custom success toast message
  onSuccess?: (row: any) => void;  // Callback after success
};

function successToast(row: any, opts?: SubmitOpts) {
  const msg = opts?.successMessage || (opts?.entity ? `บันทึก${opts.entity}สำเร็จ` : 'บันทึกสำเร็จ');
  toast.success(msg);
  opts?.onSuccess?.(row);
}

/** Insert a single row and return it. Throws after showing a toast on error. */
export async function insertRow<In extends Record<string, any>, Out = In>(
  table: string,
  payload: In,
  opts?: SubmitOpts
): Promise<Out> {
  const sel = opts?.select ?? '*';
  const { data, error } = await supabase.from(table).insert(payload).select(sel).single();
  if (error) {
    showPgErrorToast(error, (m) => toast.error(m), { entity: opts?.entity, labels: opts?.labels });
    throw error;
  }
  successToast(data, opts);
  return data as Out;
}

/** Update a row by id (id column) and return it. Throws after showing a toast on error. */
export async function updateRow<Changes extends Record<string, any>, Out = Changes>(
  table: string,
  id: string,
  changes: Changes,
  opts?: SubmitOpts
): Promise<Out> {
  const sel = opts?.select ?? '*';
  const { data, error } = await supabase.from(table).update(changes).eq('id', id).select(sel).single();
  if (error) {
    showPgErrorToast(error, (m) => toast.error(m), { entity: opts?.entity, labels: opts?.labels });
    throw error;
  }
  successToast(data, opts);
  return data as Out;
}

/** Delete a row by id (soft wrapper). Returns true if deleted (rowcount > 0). */
export async function deleteRow(
  table: string,
  id: string,
  opts?: { entity?: string; successMessage?: string; onSuccess?: () => void }
): Promise<boolean> {
  const { error, status } = await supabase.from(table).delete().eq('id', id);
  if (error) {
    showPgErrorToast(error, (m) => toast.error(m), { entity: opts?.entity });
    throw error;
  }
  const ok = status === 204 || status === 200;
  if (ok) {
    toast.success(opts?.successMessage || (opts?.entity ? `ลบ${opts.entity}สำเร็จ` : 'ลบสำเร็จ'));
    opts?.onSuccess?.();
  }
  // Supabase returns 204 No Content on delete success.
  return ok;
}

/** Upsert helper (match on primary key or unique constraint). */
export async function upsertRow<In extends Record<string, any>, Out = In>(
  table: string,
  payload: In,
  opts?: SubmitOpts & { onConflict?: string }
): Promise<Out> {
  const sel = opts?.select ?? '*';
  let q = supabase.from(table).upsert(payload, { onConflict: opts?.onConflict });
  const { data, error } = await q.select(sel).single();
  if (error) {
    showPgErrorToast(error, (m) => toast.error(m), { entity: opts?.entity, labels: opts?.labels });
    throw error;
  }
  successToast(data, opts);
  return data as Out;
}
