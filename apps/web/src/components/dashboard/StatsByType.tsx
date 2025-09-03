import React from 'react';
import { BarChart2 } from 'lucide-react';
import { PROJECT_TYPE_OPTIONS } from '@/constants/projectTypes';
import { ProjectTypeStat } from '@/hooks/useProjectTypeStats';

interface StatsByTypeProps {
  stats: ProjectTypeStat[];
  loading?: boolean;
  error?: any;
  className?: string;
}

const StatsByType: React.FC<StatsByTypeProps> = ({ stats, loading, error, className }) => {
  const resolveLabel = (typeKey: string | null) => {
    if (!typeKey) return 'ไม่ระบุ';
    return PROJECT_TYPE_OPTIONS.find(o => o.value === typeKey)?.label || typeKey || '—';
  };

  const empty = !loading && stats.length === 0;

  return (
    <div className={"p-4 rounded-lg border bg-white " + (className || '')}>
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
        <BarChart2 className="w-4 h-4" /> <span>Projects by Type</span>
      </div>
      {error && !loading && (
        <p className="text-xs text-red-600" data-testid="type-stats-error">เกิดข้อผิดพลาดในการดึงสถิติ</p>
      )}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div data-testid="skeleton" key={i} className="rounded-md border bg-gray-50 px-2 py-2 h-12" />
          ))}
        </div>
      )}
      {!loading && !error && empty && (
        <p data-testid="empty-stats" className="text-xs text-gray-500">ยังไม่มีโครงการให้แสดง</p>
      )}
      {!loading && !error && !empty && stats.length === 0 && (
        <p className="text-xs text-gray-500">— ไม่มีข้อมูล —</p>
      )}
      {!loading && !error && stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {stats.map(s => (
            <div
              key={s.type || '__null__'}
              className="rounded-md border bg-gray-50 px-2 py-2 flex flex-col text-xs"
            >
              <span className="text-gray-600 truncate" title={resolveLabel(s.type)}>
                {resolveLabel(s.type)}
              </span>
              <span className="mt-1 text-base font-semibold">{s.cnt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StatsByType;
