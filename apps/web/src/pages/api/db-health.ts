import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type Ok = { ok: true; data: any; latency_ms: number };
type Fail = { ok: false; error: string; detail?: any };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Fail>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  // Internal key (support public variant if intentionally exposed)
  const internalKey = req.headers['x-internal-key'];
  if (
    internalKey !== process.env.INTERNAL_DASH_KEY &&
    internalKey !== process.env.NEXT_PUBLIC_INTERNAL_DASH_KEY
  ) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
  }

  const orgId = (req.query.orgId as string | undefined) || (req.query.org_id as string | undefined);
  if (!orgId) return res.status(400).json({ ok: false, error: 'MISSING_ORG_ID' });

  const actingUserId = (req.headers['x-user-id'] as string | undefined) || undefined;
  if (!actingUserId) return res.status(401).json({ ok: false, error: 'MISSING_USER' });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY; // server-only
  if (!url || !serviceRole) {
    return res.status(500).json({ ok: false, error: 'MISSING_SUPABASE_ENV', detail: { url: !!url, serviceRole: !!serviceRole } });
  }

  const started = performance.now();
  try {
    const admin = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });

    // Verify membership & role
    const { data: member, error: memberErr } = await admin
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', actingUserId)
      .maybeSingle();
    if (memberErr) return res.status(500).json({ ok: false, error: memberErr.message });
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
    }

    const { data, error } = await admin.rpc('db_health');
    const latency = performance.now() - started;
    if (error) return res.status(500).json({ ok: false, error: error.message || 'RPC_FAILED' });
    return res.status(200).json({ ok: true, data, latency_ms: Math.round(latency) });
  } catch (err: any) {
    const latency = performance.now() - started;
    return res.status(500).json({ ok: false, error: err?.message || 'UNEXPECTED_ERROR', detail: { latency_ms: Math.round(latency) } });
  }
}
