import React from 'react';
import { useHealth } from '@/hooks/useHealthMonitor';

export const HealthDrawer: React.FC = () => {
  const { open, setOpen, history, latest, manualPing, fetching /* uiEnabled */ } = useHealth();
  // Removed uiEnabled gating so drawer is always testable when feature flag is off.
  // If future re-introduction is needed, wrap rendering with flag again.
  if (!open) return null;
  return (
    <div data-testid="health-drawer-overlay" className="fixed inset-0 z-[998] flex justify-end" onMouseDown={(e)=>{ if (e.target===e.currentTarget) setOpen(false); }}>
      <div className="absolute inset-0 bg-black/40" />
      <div data-testid="health-drawer" role="dialog" aria-modal="true" aria-labelledby="health-drawer-title" className="relative w-full max-w-sm h-full bg-white shadow-xl border-l flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 id="health-drawer-title" className="font-semibold text-sm flex items-center gap-2">
            System Health
            {latest?.serverVersion && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 border font-mono" title="Server Version">{latest.serverVersion}</span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <button disabled={fetching} onClick={()=>manualPing()} className="text-xs px-2 py-1 rounded bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed">{fetching?'Refreshing…':'Refresh now'}</button>
            <button onClick={()=>setOpen(false)} className="text-xs px-2 py-1 rounded bg-gray-200">Close</button>
          </div>
        </div>
        <div className="p-3 text-xs space-y-2">
          {latest && (
            <div className="flex gap-2 items-center text-[11px]">
              <span
                title={latest.ok ? (latest.dbOk===false?'สถานะเสื่อมลง (DB)':'ปกติ'):'ขัดข้อง'}
                className={`w-2.5 h-2.5 rounded-full ${latest.ok ? (latest.dbOk===false?'bg-amber-400':'bg-emerald-500'):'bg-red-500'}`}
              />
              <span>{latest.ok ? (latest.dbOk===false?'Degraded (DB)':'Healthy'):'Down'}</span>
              {latest.apiLatency!=null && <span className="text-gray-500">api {Math.round(latest.apiLatency)}ms</span>}
              {latest.dbLatency!=null && <span className="text-gray-500">db {Math.round(latest.dbLatency)}ms</span>}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-gray-50 border-b">
              <tr className="text-left">
                <th className="px-2 py-1 font-medium">Time</th>
                <th className="px-2 py-1 font-medium">Status</th>
                <th className="px-2 py-1 font-medium">API</th>
                <th className="px-2 py-1 font-medium">DB</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.t} className="border-b last:border-none">
                  <td className="px-2 py-1 whitespace-nowrap">{new Date(h.t).toLocaleTimeString()}</td>
                  <td className="px-2 py-1">{h.ok ? (h.dbOk===false?'degraded':'ok'):'error'}</td>
                  <td className="px-2 py-1">{h.apiLatency!=null?Math.round(h.apiLatency)+'ms':'-'}</td>
                  <td className="px-2 py-1">{h.dbLatency!=null?Math.round(h.dbLatency)+'ms':'-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 text-[10px] text-gray-500 border-t space-y-1">
          <p>Adaptive polling: healthy 60s, degraded 15s, errors exponential 5s..60s. Pauses when hidden/offline.</p>
        </div>
      </div>
    </div>
  );
};
