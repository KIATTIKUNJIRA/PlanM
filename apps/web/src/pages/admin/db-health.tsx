import React, { useState } from 'react';
import useSWR from 'swr';
import { PROJECT_TYPE_OPTIONS } from '@/constants/projectTypes';
import { internalGet, internalJson } from '@/lib/internalFetch';
import { useHealth } from '@/hooks/useHealthMonitor';
import toast from 'react-hot-toast';

const fetcher = (url: string) => internalGet(url).then(r => r.json());

type RpcHealthPayload = {
  enum_values: string[];
  type_null_count: number;
  indexes: { name: string; def: string }[];
  policies: { policyname: string; cmd: string; roles: string[]; qual: string | null; with_check: string | null }[];
};

export default function DbHealthPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/db-health', fetcher, { refreshInterval: 30_000 });
  const { latest, history, manualPing } = useHealth();
  const [verifying, setVerifying] = useState(false);

  if (isLoading) return <div className="p-6 text-sm">กำลังตรวจสอบฐานข้อมูล...</div>;
  if (error || !data?.ok) return <div className="p-6 text-sm text-red-600">ตรวจสอบไม่สำเร็จ</div>;

  const d = data.data as RpcHealthPayload;
  const expected: string[] = PROJECT_TYPE_OPTIONS.map(o => o.value);
  const missing = expected.filter(v => !d.enum_values.includes(v));
  const extra = d.enum_values.filter(v => !expected.includes(v));

  const healthSamples = history;
  const maxLatency = Math.max(...healthSamples.map(s => (s.dbLatency || 0)), 1);
  const spark = (values: number[]) => {
    const h = 24; const w = 120; const step = values.length > 1 ? w / (values.length - 1) : w;
    const pts = values.map((v,i)=> `${i*step},${h - (v/maxLatency)*h}`).join(' ');
    return <svg data-testid="latency-sparkline" width={w} height={h} className="overflow-visible"><polyline fill="none" stroke="#2563eb" strokeWidth={2} points={pts} /></svg>;
  };

  const runVerify = async () => {
    if (verifying) return;
    setVerifying(true);
    try {
      await manualPing();
      await mutate();
      const h = latest;
      const status = !h ? 'UNKNOWN' : h.ok ? (h.dbOk===false?'DEGRADED':'OK') : 'ERROR';
      toast.success(`Health verify: ${status}`);
    } catch (e:any) {
      toast.error('Verify failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">DB Health Check</h1>
        <button
          onClick={() => mutate()}
          className="text-sm rounded bg-black text-white px-3 py-1 hover:opacity-80"
        >รีเฟรช</button>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="p-3 border rounded bg-white/50">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">API Latency</div>
          <div className="font-mono text-sm">{latest?.apiLatency != null ? Math.round(latest.apiLatency)+'ms':'—'}</div>
        </div>
        <div className="p-3 border rounded bg-white/50">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">DB Latency</div>
          <div className="font-mono text-sm">{latest?.dbLatency != null ? Math.round(latest.dbLatency)+'ms':'—'}</div>
        </div>
        <div className="p-3 border rounded bg-white/50">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Status</div>
          <div className="font-mono text-sm">{latest ? (latest.ok ? (latest.dbOk===false?'DEGRADED':'OK'):'ERROR'):'—'}</div>
        </div>
        <div className="p-3 border rounded bg-white/50">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Server Version</div>
          <div className="font-mono text-xs">{(latest as any)?.serverVersion || '—'}</div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Recent DB Latency (sparkline)</h2>
          <div className="flex gap-2">
            <button disabled={verifying} onClick={runVerify} className="text-xs bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-2 py-1 rounded">{verifying?'Verifying...':'Run verify'}</button>
          </div>
        </div>
        <div className="bg-white border rounded p-2 inline-block">
          {spark(healthSamples.map(s => s.dbLatency || 0).reverse())}
        </div>
        <ul className="text-[11px] grid grid-cols-5 gap-1 text-gray-600">
          {healthSamples.map(s => (
            <li key={s.t} className="truncate">{s.dbLatency!=null?Math.round(s.dbLatency)+'ms':'–'}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Project Type (enum)</h2>
        <p className="text-sm">ใน DB: <span className="font-mono">{d.enum_values.join(', ')}</span></p>
        <p className={`text-sm ${missing.length ? 'text-red-600' : 'text-gray-600'}`}>
          ขาด: {missing.length ? missing.join(', ') : '—'}
        </p>
        <p className={`text-sm ${extra.length ? 'text-amber-600' : 'text-gray-600'}`}>
          เกิน: {extra.length ? extra.join(', ') : '—'}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Projects type NULL</h2>
        <p className={`text-sm ${d.type_null_count ? 'text-red-600' : 'text-gray-600'}`}>{d.type_null_count} รายการ</p>
      </section>

  <section className="space-y-2">
        <h2 className="font-medium">Indexes (projects)</h2>
        <ul className="text-sm list-disc pl-5 space-y-1">
          {d.indexes.map(ix => (
            <li key={ix.name}><code>{ix.name}</code></li>
          ))}
        </ul>
      </section>

  <section className="space-y-2">
        <h2 className="font-medium">RLS Policies (projects)</h2>
        <ul className="text-sm list-disc pl-5 space-y-1">
          {d.policies.map(p => (
            <li key={p.policyname}>
              <code>{p.policyname}</code> — {p.cmd}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
