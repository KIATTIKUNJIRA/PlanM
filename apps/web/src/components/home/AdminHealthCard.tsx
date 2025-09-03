import React from 'react';
import useSWR from 'swr';
import { internalGet } from '@/lib/internalFetch';

const fetcher = (url: string) => internalGet(url).then(r => r.json());

export function AdminHealthCard({ show }: { show: boolean }) {
  const { data, error, isLoading } = useSWR(show ? '/api/db-health' : null, fetcher, { refreshInterval: 60_000 });
  if (!show) return null;
  const ok = data?.ok;
  return (
    <div className={`p-4 rounded-lg border ${ok ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold">DB Health</h3>
        {isLoading && <span className="animate-pulse text-[10px] text-gray-500">...</span>}
      </div>
      {error && <p className="text-xs text-red-600">โหลดไม่สำเร็จ</p>}
      {!error && ok && <p className="text-xs text-green-700">OK</p>}
      {!error && !ok && !isLoading && <p className="text-xs text-amber-700">มีปัญหาบางส่วน</p>}
      <a href="/admin/db-health" className="mt-2 inline-block text-[11px] text-blue-600 hover:underline">ดูรายละเอียด</a>
    </div>
  );
}
