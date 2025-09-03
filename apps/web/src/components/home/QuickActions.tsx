import React from 'react';
import Link from 'next/link';

export function QuickActions() {
  return (
    <div className="p-4 bg-white border rounded-lg space-y-3">
      <h3 className="text-sm font-semibold tracking-wide">Quick Actions</h3>
      <div className="flex flex-wrap gap-2">
        <Link href="/projects/new" className="px-3 py-1.5 text-xs rounded bg-black text-white hover:opacity-80">สร้างโครงการ</Link>
        <Link href="/org/members/invite" className="px-3 py-1.5 text-xs rounded bg-gray-800 text-white hover:opacity-80">เชิญสมาชิก</Link>
        <Link href="/projects" className="px-3 py-1.5 text-xs rounded bg-gray-200 hover:bg-gray-300">ดูทั้งหมด</Link>
      </div>
    </div>
  );
}
