import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { showPgErrorToast } from '@/lib/dbErrors';
import { afterProjectChange } from '@/lib/afterProjectChange';
import useOrgs, { Org } from '@/hooks/useOrgs';
import { PROJECT_TYPE_OPTIONS } from '@/constants/projectTypes';
import type { Feature, FeatureCollection } from 'geojson';
import { centerLatLng } from '@/lib/geo';

const MapDraw = dynamic(() => import('@/components/map/MapDraw'), { ssr: false });

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <h3 className="font-medium mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export default function NewProjectPage() {
  const router = useRouter();
  const { orgs, loading: orgLoading } = useOrgs();
  const [orgId, setOrgId] = useState<string>('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [ptype, setPtype] = useState<string>('raw_land');
  const [status, setStatus] = useState<'planned' | 'active' | 'archived'>('planned');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('');
  const [pm, setPm] = useState('');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  const [geometry, setGeometry] = useState<FeatureCollection | Feature | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!orgId && orgs.length) setOrgId(orgs[0].id);
  }, [orgs, orgId]);

  // เตือนเมื่อออกหน้าโดยยังไม่บันทึก
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty && !saving) {
        e.preventDefault(); e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, saving]);

  const canCreate = useMemo(() => {
    if (!orgId || !name.trim() || !ptype) return false;
    if (start && end && new Date(end) < new Date(start)) return false;
    return true;
  }, [orgId, name, ptype, start, end]);

  function onGeoChange(geo: FeatureCollection | Feature | null, c: { lat: number; lng: number } | null) {
    setGeometry(geo);
    setCenter(c);
    setDirty(true);
  }

  async function doSubmit(mode: 'draft' | 'create') {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('กรุณาเข้าสู่ระบบก่อน'); return;
      }
      if (!canCreate) {
        alert('กรอกข้อมูลไม่ครบหรือไม่ถูกต้อง'); return;
      }

      const payload: any = {
        org_id: orgId,
        name: name.trim(),
        code: code || null,
        type: ptype,                // enum ตาม projectTypes
        status: mode === 'draft' ? 'planned' : status,
        address: address || null,
        province: province || null,
        project_manager: pm || null,
        start_date: start || null,
        end_date: end || null,
        latitude: center?.lat ?? null,
        longitude: center?.lng ?? null,
        geometry: geometry ? (geometry as any) : null,
      };

      // insert + select id เพื่อ redirect
      const { data, error } = await supabase
        .from('projects')
        .insert(payload)
        .select('id')
        .single();

      if (error) throw error;

      // refresh cache หน้า home/stat
      await afterProjectChange(orgId);

      const id = data?.id;
      if (id) {
        setDirty(false);
        router.replace(`/projects/${id}?created=1`);
      } else {
        // กันเคส RLS select ไม่ผ่าน (ไม่น่าเกิดเพราะมี policy select แล้ว)
        router.replace('/projects');
      }
    } catch (err: any) {
  // Fallback toast via alert; can be replaced with react-hot-toast
  showPgErrorToast(err, (m) => alert(m), { entity: 'โครงการ', labels: { code: 'รหัสโครงการ', type: 'ประเภท', latitude: 'ละติจูด', longitude: 'ลองจิจูด' } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Head><title>New Project</title></Head>

      <div className="px-4 sm:px-6 lg:px-8 py-4">
        {/* Header + Actions */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-gray-500">
              <Link href="/projects" className="hover:underline">Projects</Link> / New
            </div>
            <h1 className="text-xl font-semibold">สร้างโครงการใหม่</h1>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/projects" className="rounded-lg border px-4 py-2 hover:bg-gray-50">Cancel</Link>
            <button
              disabled={!orgId || saving}
              onClick={() => doSubmit('draft')}
              className="rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              disabled={!canCreate || saving}
              onClick={() => doSubmit('create')}
              className="rounded-lg bg-black text-white px-4 py-2 hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Create Project ▶'}
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left */}
          <div className="lg:col-span-5 space-y-4">
            <Card title="📛 Identity">
              {/* Organization */}
              <label className="block">
                <span className="text-sm text-gray-600">Organization *</span>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={orgId}
                  onChange={(e) => { setOrgId(e.target.value); setDirty(true); }}
                >
                  {orgLoading && <option>Loading…</option>}
                  {!orgLoading && orgs.length === 0 && <option value="">(ยังไม่มีองค์กร)</option>}
                  {orgs.map((o: Org) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-sm text-gray-600">ชื่อโครงการ *</span>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setDirty(true); }}
                  placeholder="เช่น โครงการ A"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm text-gray-600">รหัสโครงการ</span>
                  <input
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setDirty(true); }}
                    placeholder="ไม่บังคับ (unique ในองค์กร)"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-gray-600">ประเภทโครงการ *</span>
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={ptype}
                    onChange={(e) => { setPtype(e.target.value); setDirty(true); }}
                  >
                    {PROJECT_TYPE_OPTIONS.map(pt => (
                      <option key={pt.value} value={pt.value}>{pt.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-sm text-gray-600">สถานะ</span>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={status}
                  onChange={(e) => { setStatus(e.target.value as any); setDirty(true); }}
                >
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </Card>

            <Card title="📮 Address & Admin">
              <label className="block">
                <span className="text-sm text-gray-600">ที่อยู่</span>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); setDirty(true); }}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm text-gray-600">จังหวัด</span>
                  <input
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={province}
                    onChange={(e) => { setProvince(e.target.value); setDirty(true); }}
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-gray-600">Project Manager</span>
                  <input
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={pm}
                    onChange={(e) => { setPm(e.target.value); setDirty(true); }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm text-gray-600">วันเริ่มโครงการ</span>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={start}
                    onChange={(e) => { setStart(e.target.value); setDirty(true); }}
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-gray-600">วันสิ้นสุด</span>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={end}
                    onChange={(e) => { setEnd(e.target.value); setDirty(true); }}
                  />
                </label>
              </div>
            </Card>
          </div>

          {/* Right */}
          <div className="lg:col-span-7 space-y-4">
            <Card title="🗺️ Location & Geometry">
              <MapDraw
                value={geometry}
                onChange={(geo, c) => {
                  setGeometry(geo);
                  setCenter(c ?? centerLatLng(geo));
                  setDirty(true);
                }}
                height={560}
              />
            </Card>
          </div>
        </div>

        {/* Sticky footer (mobile-friendly) */}
        <div className="sticky bottom-0 left-0 right-0 bg-white/80 backdrop-blur border-t mt-6 py-3 px-4 flex items-center justify-end gap-2">
          <Link href="/projects" className="rounded-lg border px-4 py-2 hover:bg-gray-50">← Back</Link>
          <button
            disabled={!orgId || saving}
            onClick={() => doSubmit('draft')}
            className="rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            disabled={!canCreate || saving}
            onClick={() => doSubmit('create')}
            className="rounded-lg bg-black text-white px-4 py-2 hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Create Project ▶'}
          </button>
        </div>
      </div>
    </>
  );
}
