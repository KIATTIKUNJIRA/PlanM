import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type OrgRole = 'member' | 'admin' | 'owner';

// Assumes a table or view organization_members (org_id, role) filtered by RLS for current user
export function useOrgRoles(orgId?: string) {
  const [role, setRole] = useState<OrgRole | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!orgId) { setRole(null); return; }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('organization_members')
        .select('role')
        .eq('org_id', orgId)
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) { console.warn('role fetch error', error); setRole(null); }
      else setRole((data as any)?.role ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orgId]);
  return { role, loading };
}
