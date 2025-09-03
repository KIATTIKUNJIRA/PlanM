// Acceptance Checklist
// - [ ] Org switcher works
// - [ ] RecentProjects shows last 8 (RLS)
// - [ ] StatsByType counts match the list
// - [ ] AdminHealthCard visible only for owner/admin; OK/Fail shows; links to /admin/db-health
// - [ ] Skeletons & empty states render correctly
// - [ ] Mobile responsive
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import useOrgs from '@/hooks/useOrgs';
import QuickActions from '@/components/dashboard/QuickActions';
import RecentProjects from '@/components/dashboard/RecentProjects';
import StatsByType from '@/components/dashboard/StatsByType';
import AdminHealthCard from '@/components/dashboard/AdminHealthCard';
import { useOrgRoles } from '@/hooks/useOrgRoles';
import useSWR from 'swr';
import { Building2 } from 'lucide-react';
import { ProjectRow } from '@/components/dashboard/RecentProjects';
import useProjectTypeStats from '@/hooks/useProjectTypeStats';

async function fetchRecent(orgId: string): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id,name,code,type,updated_at,created_at,latitude,longitude')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(8);
  if (error) throw error;
  return (data as any[]) as ProjectRow[];
}

async function fetchProjectCount(orgId: string): Promise<number> {
  const { count, error } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId);
  if (error) throw error;
  return count || 0;
}

export default function HomePage() {
  const router = useRouter();
  const { orgs, loading: orgLoading } = useOrgs();
  const [orgId, setOrgId] = useState<string>(() => (orgs && orgs.length ? orgs[0].id : ''));
  const { role } = useOrgRoles(orgId);
  const isAdmin = role === 'admin' || role === 'owner';

  useEffect(() => { if (!orgLoading && orgs.length && !orgId) setOrgId(orgs[0].id); }, [orgLoading, orgs, orgId]);
  useEffect(() => { (async () => { const { data } = await supabase.auth.getUser(); if (!data.user) router.replace('/login'); })(); }, [router]);

  const { data: recentItems, error: recentError, isLoading: recentLoading } = useSWR(
    orgId ? ['recent-projects', orgId] : null,
    () => fetchRecent(orgId)
  );

  const { data: typeStats, isLoading: typeStatsLoading, error: typeStatsError } = useProjectTypeStats(orgId);
  const { data: totalCount, isLoading: countLoading } = useSWR(
    orgId ? ['project-count', orgId] : null,
    () => fetchProjectCount(orgId)
  );

  const orgName = useMemo(() => orgs.find(o => o.id === orgId)?.name, [orgs, orgId]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {!orgLoading && orgs.length === 0 && (
        <div data-testid="no-orgs" className="p-4 border rounded bg-amber-50 text-sm text-amber-700">
          คุณยังไม่มีองค์กร — <span className="underline">สร้างองค์กร</span>
        </div>
      )}
      <header className="flex flex-wrap items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">ภาพรวมการทำงานวันนี้</h1>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-gray-400" />
            {orgName ? <span>{orgName}</span> : <span className="italic">เลือกองค์กร</span>}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            className="border rounded px-2 py-1 text-sm bg-white"
            value={orgId}
            onChange={e => setOrgId(e.target.value)}
            disabled={orgLoading || !orgs.length}
          >
            {orgs.map(o => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      </header>
      <main className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-6 flex flex-col gap-4">
          <QuickActions orgId={orgId} />
        </div>
        <div className="md:col-span-6 flex flex-col gap-4">
          <AdminHealthCard orgId={orgId} />
        </div>
        <div className="md:col-span-12">
          <RecentProjects
            orgId={orgId}
            items={recentItems}
            loading={recentLoading}
            errorExternal={recentError}
            totalCount={totalCount}
            countLoading={countLoading}
          />
        </div>
        <div className="md:col-span-12">
          <StatsByType stats={typeStats} loading={typeStatsLoading} error={typeStatsError} />
        </div>
      </main>
    </div>
  );
}
