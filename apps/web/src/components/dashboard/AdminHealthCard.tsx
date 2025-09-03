import React from 'react';
import useSWR from 'swr';
import { internalJson } from '@/lib/internalFetch';
import { Activity, ShieldAlert } from 'lucide-react';
import { useOrgRoles } from '@/hooks/useOrgRoles';

interface AdminHealthCardProps { orgId?: string; className?: string; }

// Admin / Owner only visibility; returns null for others.
const AdminHealthCard: React.FC<AdminHealthCardProps> = ({ orgId, className }) => {
  const { role, loading } = useOrgRoles(orgId);
  const elevated = role === 'admin' || role === 'owner';
  const { data, error, isLoading } = useSWR(
    elevated && orgId ? ['/api/db-health', orgId] : null,
    () => internalJson('/api/db-health', { orgId }),
    { refreshInterval: 60_000 }
  );

  if (!orgId) return null; // no org context
  if (!elevated) return null; // silently hide for non-admins

  const ok: boolean | undefined = data?.ok;

  return (
    <div className={"p-4 rounded-lg border bg-white flex flex-col gap-2 " + (className || '')}>
      <div className="flex items-center justify-between text-sm font-semibold">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" /> <span>DB Health</span>
        </div>
  {(loading || isLoading) && <span data-testid="skeleton" className="text-[10px] text-gray-400 animate-pulse">...</span>}
      </div>
      {error && (
        <div data-testid="health-error" className="flex items-center gap-1 text-xs text-red-600">
          <ShieldAlert className="w-3 h-3" /> <span>โหลดไม่สำเร็จ</span>
        </div>
      )}
      {!error && ok === true && (
        <span className="inline-block w-fit px-2 py-0.5 rounded bg-green-100 text-green-700 text-[11px] font-medium">OK</span>
      )}
      {!error && ok === false && (
        <span className="inline-block w-fit px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[11px] font-medium">Fail</span>
      )}
      {!error && ok === undefined && !isLoading && (
        <span className="text-[11px] text-gray-500">ไม่มีข้อมูล</span>
      )}
      <a
        href="/admin/db-health"
        className="mt-1 inline-block text-[11px] text-blue-600 hover:underline"
      >รายละเอียด</a>
    </div>
  );
};

export default AdminHealthCard;
