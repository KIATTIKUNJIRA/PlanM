import React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { supabase } from '@/lib/supabase';
import { PROJECT_TYPE_OPTIONS } from '@/constants/projectTypes';
import { Clock } from 'lucide-react';
import { showPgErrorToast } from '@/lib/dbErrors';
import { toast } from 'react-hot-toast';

export interface ProjectRow { id: string; name: string; code: string | null; type: string; created_at: string; updated_at: string | null; latitude: number | null; longitude: number | null; }

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

const typeLabel = (t: string) => PROJECT_TYPE_OPTIONS.find(o => o.value === t)?.label || t;
const humanTime = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'ไม่กี่วินาทีที่แล้ว';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ชม.ที่แล้ว`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} วันก่อน`; 
  return d.toLocaleDateString();
};

interface RecentProjectsProps {
  orgId?: string;
  className?: string;
  items?: ProjectRow[]; // externally provided list to skip internal fetch
  loading?: boolean; // external loading state
  errorExternal?: any; // external error
  totalCount?: number; // total projects in org (not limited to 8)
  countLoading?: boolean;
}

const RecentProjects: React.FC<RecentProjectsProps> = ({ orgId, className, items, loading, errorExternal, totalCount, countLoading }) => {
  const useExternal = !!items || loading !== undefined || errorExternal !== undefined;
  const { data, error, isLoading } = useSWR(
    useExternal ? null : orgId ? ['recent-projects', orgId] : null,
    () => fetchRecent(orgId!)
  );
  const list = useExternal ? items : data;
  const loadState = useExternal ? !!loading : isLoading;
  const err = useExternal ? errorExternal : error;

  if (!orgId) {
    return (
      <div className={"p-4 rounded-lg border bg-white text-xs text-gray-500 " + (className||'')}>ยังไม่มีองค์กรที่เลือก</div>
    );
  }

  if (err) {
    showPgErrorToast(err, (m) => toast.error(m), { entity: 'โครงการ' });
  }

  return (
    <div className={"p-4 rounded-lg border bg-white " + (className||'')}> 
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
        <Clock className="w-4 h-4" /> <span>Recent Projects</span>
        <div className="ml-auto flex items-center">
          {countLoading ? (
            <span data-testid="skeleton" className="inline-block w-28 h-4 bg-gray-200 rounded animate-pulse" aria-label="project-count-loading" />
          ) : typeof totalCount === 'number' ? (
            <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] border">
              รวมทั้งหมด: {totalCount} โครงการ
            </span>
          ) : null}
        </div>
      </div>
      {loadState && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div data-testid="skeleton" key={i} className="h-5 bg-gray-200 animate-pulse rounded" />
          ))}
        </div>
      )}
      {!loadState && !err && (!list || list.length === 0) && (
        <p data-testid="empty-recent" className="text-xs text-gray-500">ยังไม่มีโครงการ — <Link href="/projects/new" className="underline">สร้างโครงการแรก</Link></p>
      )}
      <ul className="mt-1 divide-y">
        {list?.map(p => {
          const updated = p.updated_at || p.created_at;
            return (
              <li key={p.id} className="py-2 flex flex-col gap-1 text-xs">
                <div className="flex items-center gap-2">
                  <Link href={`/projects/${p.id}`} className="font-medium text-blue-600 hover:underline truncate max-w-[180px]" title={p.name}>{p.name}</Link>
                  {p.code && <span className="text-gray-400">[{p.code}]</span>}
                  <span className="ml-auto inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] border">{typeLabel(p.type)}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                  <span>อัปเดต {humanTime(updated)}</span>
                  {p.latitude != null && p.longitude != null && (
                    <span className="truncate">({p.latitude.toFixed(3)}, {p.longitude.toFixed(3)})</span>
                  )}
                  <Link href={`/projects/${p.id}`} className="ml-auto text-blue-600 hover:underline">ดูรายละเอียด</Link>
                </div>
              </li>
            );
        })}
      </ul>
    </div>
  );
};

export default RecentProjects;
