import useSWR from 'swr';
import { supabase } from '@/lib/supabase';

export interface ProjectTypeStat { type: string | null; cnt: number; }

async function fetchProjectTypeCounts(orgId: string): Promise<ProjectTypeStat[]> {
  const { data, error } = await supabase.rpc('project_type_counts', { p_org_id: orgId });
  if (error) throw error;
  return (data || []) as ProjectTypeStat[];
}

export default function useProjectTypeStats(orgId?: string) {
  const { data, error, isLoading } = useSWR<ProjectTypeStat[]>(
    orgId ? ['project-type-counts', orgId] : null,
    () => fetchProjectTypeCounts(orgId as string)
  );
  return { data: data || [], error, isLoading };
}
