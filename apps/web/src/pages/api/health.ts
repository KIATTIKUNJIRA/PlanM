import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

import { rateLimit } from '@/server/rateLimit';

// Use anon key; RLS still enforced. A dedicated lightweight RPC avoids touching user tables.
// You must create this Postgres function separately (SQL example):
// create or replace function public.ping_health() returns jsonb language sql stable as $$ select jsonb_build_object('pong', true); $$;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const rl = rateLimit(ip);
  if (!rl.allowed) {
    if (rl.retryAfter) res.setHeader('Retry-After', String(rl.retryAfter));
    // server-side log only (no user data) for observability
    console.warn('[health] rate_limited', { ip, retryAfter: rl.retryAfter });
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  }
  const started = process.hrtime.bigint();
  let dbOk: boolean | null = null;
  let dbLatencyMs: number | null = null;
  let serverVersion: string | null = null;
  try {
    if (supabase) {
      const dbStart = process.hrtime.bigint();
      // Lightweight RPC; never touches RLS-protected tables directly.
      const { data, error } = await supabase.rpc('ping_health');
      const dbEnd = process.hrtime.bigint();
      dbLatencyMs = Number(dbEnd - dbStart) / 1_000_000;
      dbOk = !error;
      if (data && typeof data === 'object' && 'server_version' in (data as any)) {
        serverVersion = (data as any).server_version as string;
      }
    }
  } catch {
    dbOk = false;
  }
  try {
    const uptime = process.uptime();
    const now = new Date().toISOString();
    const latencyNs = Number(process.hrtime.bigint() - started);
    res.status(200).json({ ok: true, uptime, now, latency_ms: latencyNs / 1_000_000, dbOk, dbLatencyMs, serverVersion });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message, dbOk });
  }
}
