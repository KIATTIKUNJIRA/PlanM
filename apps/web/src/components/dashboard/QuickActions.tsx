import React from 'react';
import Link from 'next/link';
import { Plus, UserPlus, ListChecks } from 'lucide-react';

type Props = { className?: string; orgId?: string };

const baseBtn = 'text-xs px-3 py-1.5 rounded inline-flex items-center gap-1 font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black transition disabled:opacity-50 disabled:cursor-not-allowed';

const QuickActions: React.FC<Props> = ({ className, orgId }) => {
  const disabled = !orgId;
  return (
    <div className={"p-4 rounded-lg border bg-white flex flex-col gap-3 " + (className||'')}> 
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Plus className="w-4 h-4" />
        <span>Quick Actions</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {disabled ? (
          <button className={baseBtn + ' bg-gray-300 text-gray-600'} disabled>
            สร้างโครงการ
          </button>
        ) : (
          <Link href="/projects/new" className={baseBtn + ' bg-black text-white hover:opacity-85'}>
            <Plus className="w-3 h-3" /> สร้างโครงการ
          </Link>
        )}
        {disabled ? (
          <button className={baseBtn + ' bg-gray-200 text-gray-500'} disabled>
            <UserPlus className="w-3 h-3" /> เชิญสมาชิก
          </button>
        ) : (
          <Link href="/org/members" className={baseBtn + ' bg-gray-800 text-white hover:opacity-85'}>
            <UserPlus className="w-3 h-3" /> เชิญสมาชิก
          </Link>
        )}
        <Link
          href="/commands"
          className={baseBtn + ' border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}
          aria-label="เปิดเมนูคำสั่งทั้งหมด"
        >
          <ListChecks className="w-3 h-3" /> เมนูคำสั่งทั้งหมด
        </Link>
      </div>
      {disabled && (
        <p className="text-[11px] text-amber-700 mt-1">กรุณาเลือกหรือสร้างองค์กรก่อน</p>
      )}
    </div>
  );
};

export default QuickActions;
