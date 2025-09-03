// Internal fetch helpers for calling protected Next.js API routes that require `x-internal-key`.
// IMPORTANT: Prefer keeping INTERNAL_DASH_KEY server-only (do NOT expose via NEXT_PUBLIC_ if it's sensitive).
// If you intentionally want a non-secret guard key on the client, you can set NEXT_PUBLIC_INTERNAL_DASH_KEY.

const PUBLIC_KEY = process.env.NEXT_PUBLIC_INTERNAL_DASH_KEY; // only use if deliberately non-secret
const SERVER_KEY = process.env.INTERNAL_DASH_KEY; // server-only secret

function resolveKey(): string | undefined {
  // On server, prioritize server secret
  if (typeof window === 'undefined') return SERVER_KEY || PUBLIC_KEY;
  // On client, only allow the public variant
  return PUBLIC_KEY; // undefined if not set
}

export function internalGet(input: string, init?: RequestInit) {
  const key = resolveKey();
  const headers = new Headers(init?.headers || {});
  if (key) headers.set('x-internal-key', key);
  return fetch(input, { ...init, headers });
}

// Lightweight client-side JSON helper that includes the acting user id (if available)
// and optional orgId query parameter. Falls back to previous internalGet semantics
// when executed server-side (no browser auth context).
import { createClient } from '@supabase/supabase-js';

export async function internalJson<T = any>(path: string, opts?: { orgId?: string }): Promise<T> {
  // If executing on server (no window), delegate to internalGet (cannot derive user id)
  if (typeof window === 'undefined') {
    const url = opts?.orgId ? `${path}?orgId=${encodeURIComponent(opts.orgId)}` : path;
    const res = await internalGet(url);
    if (!res.ok) throw new Error(`Internal fetch failed: ${res.status}`);
    return res.json();
  }

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supaUrl || !supaKey) {
    throw new Error('Supabase env vars missing on client: set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  const supa = createClient(supaUrl, supaKey);
  const { data: { user } } = await supa.auth.getUser();

  const headers: Record<string, string> = {
    'x-internal-key': PUBLIC_KEY || '',
    ...(user?.id ? { 'x-user-id': user.id } : {}),
  };
  if (!headers['x-internal-key']) delete headers['x-internal-key'];

  const url = opts?.orgId ? `${path}?orgId=${encodeURIComponent(opts.orgId)}` : path;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Internal fetch failed: ${res.status}`);
  return res.json();
}
