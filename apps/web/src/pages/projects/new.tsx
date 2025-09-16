import React, { useEffect, useMemo, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { showPgErrorToast } from '@/lib/dbErrors';
import { afterProjectChange } from '@/lib/afterProjectChange';
import useOrgs, { Org } from '@/hooks/useOrgs';
import useThaiProvinces from '@/hooks/useThaiProvinces';
import useThaiProvinceHierarchy, { useAmphures, useTambons } from '@/hooks/useThaiProvinceHierarchy';
import useThaiGeo, { findPostal } from '@/hooks/useThaiGeo';
import ThaiDatePicker from '@/components/ThaiDatePicker';
import DashboardLayout from '@/components/DashboardLayout';
import MapDrawInner, { MapDrawInnerHandle } from '@/components/MapDrawInner';
import { PROJECT_TYPE_OPTIONS } from '@/constants/projectTypes';
import { THAI_PROVINCES } from '@/constants/thaiProvinces';
import { z } from 'zod';

// --- Schema สำหรับตรวจสอบข้อมูลก่อนบันทึก ---
const ProjectSchema = z.object({
  org_id: z.string().min(1, 'ต้องเลือกองค์กร'),
  name: z.string().trim().min(1, 'ต้องระบุชื่อโครงการ'),
  type: z.string().min(1),
  status: z.enum(['planned', 'active', 'archived']),
  code: z.string().trim().max(64).nullable().optional(),
  address: z.string().trim().max(255).nullable().optional(),
  province: z.string().trim().max(128).nullable().optional(),
  district: z.string().trim().max(128).nullable().optional(),
  subdistrict: z.string().trim().max(128).nullable().optional(),
  postal_code: z.string().trim().max(10).nullable().optional(),
  project_manager: z.string().trim().max(128).nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional()
}).strict();

type ProjectInput = z.input<typeof ProjectSchema>;

// ฟังก์ชันบันทึกข้อมูลโครงการลง Supabase
async function insertProject(payload: ProjectInput, dateVariants: { startKey: string; endKey: string }[]) {
  let lastErr: any = null; let dataOk: any = null;
  for (const v of dateVariants) {
    let attempt: Record<string, any> = { ...payload };

    // รองรับชื่อคอลัมน์วันที่ที่อาจต่างกัน เช่น start_date / started_at (แต่ตอนนี้ใช้ start_date/end_date เท่านั้น)
    if (payload.start_date && v.startKey !== 'start_date') {
      attempt[v.startKey] = payload.start_date;
      delete attempt.start_date;
    }
    if (payload.end_date && v.endKey !== 'end_date') {
      attempt[v.endKey] = payload.end_date;
      delete attempt.end_date;
    }

    // ลบ key ที่ค่าเป็น undefined ออก
    Object.keys(attempt).forEach(k => attempt[k] === undefined && delete attempt[k]);

    // พยายาม insert ลงตาราง projects
    const { data, error } = await supabase.from('projects').insert(attempt).select('id').single();
    if (!error) { dataOk = data; lastErr = null; break; }
    lastErr = error;

    if (error.code === '42703') continue; // ถ้ามีคอลัมน์ไม่ตรง ให้ลองรอบถัดไป
    break;
  }
  if (lastErr && !dataOk) throw lastErr;
  return dataOk;
}

// UI Card Wrapper
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <h3 className="font-medium mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export default function NewProjectPage() {
  // Hooks: data
  const { provinces: dynamicProvinces } = useThaiProvinces();
  const provincesList = (dynamicProvinces && dynamicProvinces.length) ? dynamicProvinces : THAI_PROVINCES;

  const { provinces: provincesHier, loading: hierLoading, error: hierError } = useThaiProvinceHierarchy();

  const router = useRouter();
  const { orgs, loading: orgLoading } = useOrgs();

  // Form state
  const [orgId, setOrgId] = useState<string>('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [ptype, setPtype] = useState<string>(PROJECT_TYPE_OPTIONS[0].value);
  const [status, setStatus] = useState<'planned' | 'active' | 'archived'>('planned');

  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('');
  const [provinceId, setProvinceId] = useState<number | undefined>(undefined);
  const [district, setDistrict] = useState('');
  const [districtId, setDistrictId] = useState<number | undefined>(undefined);
  const [subdistrict, setSubdistrict] = useState('');
  const [subdistrictId, setSubdistrictId] = useState<number | undefined>(undefined);
  const [postal, setPostal] = useState('');

  const amphures = useAmphures(provincesHier, provinceId);
  const tambons = useTambons(amphures, districtId);

  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [geometry, setGeometry] = useState<any>(null);
  const [pm, setPm] = useState('');
  const [showGeometryModal, setShowGeometryModal] = useState(false);

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const mapRef = useRef<MapDrawInnerHandle | null>(null);

  // UI state
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Effects: initialize defaults and cascading resets
  useEffect(() => {
    if (!orgId && orgs.length) setOrgId(orgs[0].id);
  }, [orgs, orgId]);

  useEffect(() => {
    // reset district/subdistrict/postal when province changes
    setDistrict('');
    setDistrictId(undefined);
    setSubdistrict('');
    setSubdistrictId(undefined);
    setPostal('');
  }, [provinceId]);

  useEffect(() => {
    // reset subdistrict/postal when district changes
    setSubdistrict('');
    setSubdistrictId(undefined);
    setPostal('');
  }, [districtId]);

  useEffect(() => {
    if (province && district && subdistrict) {
      const zipFromHier = tambons.find(t => t.id === subdistrictId)?.zip_code?.toString();
      if (zipFromHier) setPostal(zipFromHier);
      else setPostal(findPostal(province, district, subdistrict));
    }
  }, [province, district, subdistrict, subdistrictId, tambons]);

  // Submit handler
  async function doSubmit() {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('กรุณาเข้าสู่ระบบก่อน'); return; }

      const latNum = latitude ? Number(latitude) : null;
      const lngNum = longitude ? Number(longitude) : null;

      const base: ProjectInput = {
        org_id: orgId,
        name: name.trim(),
        code: code ? code.trim() : null,
        type: ptype,
        status,
        address: address || null,
        province: province || null,
        district: district || null,
        subdistrict: subdistrict || null,
        postal_code: postal || null,
        project_manager: pm || null,
        latitude: latNum,
        longitude: lngNum,
        start_date: start || undefined,
        end_date: end || undefined,
      };

      const parsed = ProjectSchema.safeParse(base);
      if (!parsed.success) { alert('ข้อมูลไม่ถูกต้อง'); return; }

      const dateVariants = [{ startKey: 'start_date', endKey: 'end_date' }];
      const inserted = await insertProject(parsed.data, dateVariants);
      await afterProjectChange(orgId);
      const id = inserted?.id;
      if (id) {
        setDirty(false);
        router.replace(`/projects/${id}?created=1`);
      } else {
        router.replace('/projects');
      }
    } catch (err: any) {
      console.error('[projects/new] insert failure', err);
      showPgErrorToast(err, (m) => alert(m), { entity: 'โครงการ' });
    } finally {
      setSaving(false);
    }
  }

  const canCreate = useMemo(() => {
    if (!orgId || !name.trim() || !ptype) return false;
    if (!address.trim() || !province || !district || !subdistrict) return false;
    if (!start || !end) return false;
    if (new Date(end) <= new Date(start)) return false;
    return true;
  }, [orgId, name, ptype, address, province, district, subdistrict, start, end]);

  // Reset form to initial values
  function resetForm() {
    setOrgId(orgs.length ? orgs[0].id : '');
    setName('');
    setCode('');
    setPtype(PROJECT_TYPE_OPTIONS[0].value);
    setStatus('planned');

    setAddress('');
    setProvince('');
    setProvinceId(undefined);
    setDistrict('');
    setDistrictId(undefined);
    setSubdistrict('');
    setSubdistrictId(undefined);
    setPostal('');

    setStart('');
    setEnd('');
    setLatitude('');
    setLongitude('');
    setPm('');

    setDirty(false);
  }

  return (
    <>
      <Head><title>New Project</title></Head>
      <DashboardLayout title="สร้างโครงการใหม่">
        {/* Header */}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 space-y-4">

            <Card title="">
              <div className="flex justify-center text-lg font-semibold">
                <h1>ข้อมูลโครงการ</h1>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm text-gray-600">องค์กร</span>
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={orgId}
                    onChange={(e) => { setOrgId(e.target.value); setDirty(true); }}
                  >
                    {orgLoading && <option>กำลังโหลด…</option>}
                    {!orgLoading && orgs.length === 0 && <option value="">(ยังไม่มีองค์กร)</option>}
                    {orgs.map((o: Org) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm text-gray-600">รหัส</span>
                  <input
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setDirty(true); }}
                    placeholder="เช่น PRJ-2025-001"
                  />
                </label>

              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm text-gray-600">ชื่อ</span>
                  <input
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setDirty(true); }}
                    placeholder="เช่น โครงการก่อสร้างถนน"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-gray-600">ประเภท</span>
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

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm text-gray-600">ผู้จัดการโครงการ</span>
                  <input
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={pm}
                    onChange={(e) => { setPm(e.target.value); setDirty(true); }}
                    placeholder="เช่น นางสาวน้ำ ดอกไม้ (m)"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-gray-600">สถานะ</span>
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={status}
                    onChange={(e) => { setStatus(e.target.value as any); setDirty(true); }}
                  >
                    <option value="planned">วางแผน</option>
                    <option value="active">กำลังดำเนินการ</option>
                    <option value="archived">เก็บถาวร</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm text-gray-600">วันเริ่มต้น</span>
                  <ThaiDatePicker value={start} onChange={(iso) => { setStart(iso); setDirty(true); }} />
                </label>
                <label className="block">
                  <span className="text-sm text-gray-600">วันสิ้นสุด</span>
                  <ThaiDatePicker value={end} onChange={(iso) => { setEnd(iso); setDirty(true); }} />
                  {(start && end && new Date(end) <= new Date(start)) &&
                    <div className="mt-1 text-[11px] text-red-600">วันสิ้นสุดต้องมากกว่าวันเริ่มต้น</div>}
                </label>
              </div>

              <label className="block">
                <span className="text-sm text-gray-600">ที่อยู่</span>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); setDirty(true); }}
                  placeholder="เช่น 123 หมู่ 4 บ.ห้วยทราย"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm text-gray-600">จังหวัด</span>
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                    value={provinceId || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : undefined;
                      setProvinceId(val);
                      const name = provincesHier.find(p => p.id === val)?.name_th || '';
                      setProvince(name);
                      setDirty(true);
                    }}
                  >
                    <option value="">เลือกจังหวัด</option>
                    {hierLoading && <option disabled>กำลังโหลดข้อมูล...</option>}
                    {hierError && <option disabled>โหลดข้อมูลไม่สำเร็จ</option>}
                    {provincesHier.map(p => <option key={p.id} value={p.id}>{p.name_th}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm text-gray-600">อำเภอ/เขต</span>
                  <select
                    disabled={!provinceId}
                    className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100"
                    value={districtId || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : undefined;
                      setDistrictId(val);
                      const name = amphures.find(a => a.id === val)?.name_th || '';
                      setDistrict(name);
                      setDirty(true);
                    }}
                  >
                    <option value="">เลือกอำเภอ</option>
                    {amphures.map(a => <option key={a.id} value={a.id}>{a.name_th}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm text-gray-600">ตำบล/แขวง</span>
                  <select
                    disabled={!districtId}
                    className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100"
                    value={subdistrictId || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : undefined;
                      setSubdistrictId(val);
                      const name = tambons.find(t => t.id === val)?.name_th || '';
                      setSubdistrict(name);
                      setDirty(true);
                    }}
                  >
                    <option value="">เลือกตำบล</option>
                    {tambons.map(t => <option key={t.id} value={t.id}>{t.name_th}</option>)}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm text-gray-600">รหัสไปรษณีย์</span>
                  <input
                    readOnly
                    className="mt-1 w-full rounded-lg border px-3 py-2 bg-gray-50"
                    value={postal}
                  />
                </label>
              </div>
            </Card>

          </div>
          <div className="lg:col-span-6 space-y-4">
            <Card title="แผนที่">
              <MapDrawInner ref={mapRef} initialGeometry={geometry} onChange={(g) => setGeometry(g)} />
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 left-0 right-0 mt-6 py-3 px-4 flex items-center justify-end gap-2">
          <button type="button" onClick={resetForm} className="rounded-lg border px-4 py-2 bg-white hover:bg-gray-50">ล้างข้อมูล</button>
          <button
            disabled={!canCreate || saving}
            onClick={() => doSubmit()}
            className="rounded-lg bg-black text-white px-4 py-2 hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'กำลังบันทึก…' : 'สร้างโครงการ'}
          </button>
          <button type="button" onClick={() => mapRef.current?.clear()} className="rounded-lg border px-3 py-1 bg-white hover:bg-gray-50">ล้าง Geometry</button>
          <button type="button" onClick={() => setShowGeometryModal(true)} className="rounded-lg border px-4 py-2 bg-white hover:bg-gray-50">แสดง Geometry</button>
        </div>
      </DashboardLayout>

      {/* Modal แจ้งเตือนข้อมูลที่ขาด */}
      {showMissingModal && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 2147483647 }}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative max-w-lg w-full bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-3">กรุณากรอกข้อมูลให้ครบ</h2>
            <ul className="list-disc pl-5 text-sm mb-4">
              {missingFields.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
            <div className="flex justify-end">
              <button className="rounded-lg border px-4 py-2 mr-2" onClick={() => setShowMissingModal(false)}>ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* Geometry viewer modal */}
      {showGeometryModal && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 2147483647 }}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative max-w-3xl w-full bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-3">Geometry (GeoJSON)</h2>
            <div className="mb-4 max-h-[60vh] overflow-auto text-sm font-mono bg-gray-50 p-3 rounded">
              {geometry ? (
                <pre className="whitespace-pre-wrap">{JSON.stringify(geometry, null, 2)}</pre>
              ) : (
                <div className="text-gray-600">ยังไม่มี Geometry ที่วาดบนแผนที่</div>
              )}
            </div>
            <div className="flex justify-end">
              <button className="rounded-lg border px-4 py-2" onClick={() => setShowGeometryModal(false)}>ปิด</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
