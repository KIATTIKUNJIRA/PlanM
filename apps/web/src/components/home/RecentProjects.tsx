import React from 'react';
import Link from 'next/link';
import { useRecentProjects } from '@/hooks/useRecentProjects';
import { PROJECT_TYPE_OPTIONS } from '@/constants/projectTypes';

export function RecentProjects({ orgId }: { orgId?: string }) {
  const { items, loading } = useRecentProjects(orgId, 6);
  const label = (t: string) => PROJECT_TYPE_OPTIONS.find(o => o.value === t)?.label || t;
  return (
    <div className="p-4 bg-white border rounded-lg">
      <h3 className="text-sm font-semibold mb-2">Recent Projects</h3>
      {loading && <p className="text-xs text-gray-500">กำลังโหลด...</p>}
      {!loading && !items.length && <p className="text-xs text-gray-500">ไม่มีโครงการ</p>}
      <ul className="space-y-1">
        {items.map(p => (
          <li key={p.id} className="flex items-center justify-between text-xs">
            <Link href={`/projects/${p.id}`} className="text-blue-600 hover:underline">{p.name}</Link>
            <span className="text-gray-500">{label(p.type)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
