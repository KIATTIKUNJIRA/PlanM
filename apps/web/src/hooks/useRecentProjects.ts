import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface RecentProject { id: string; name: string; type: string; code: string | null; created_at: string; }

export function useRecentProjects(orgId?: string, limit = 5) {
  const [items, setItems] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!orgId) { setItems([]); return; }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('id,name,type,code,created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (cancelled) return;
      if (error) console.warn('recent projects error', error);
      setItems((data as any) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orgId, limit]);
  return { items, loading };
}
