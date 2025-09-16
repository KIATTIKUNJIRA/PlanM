import Head from 'next/head';
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { typeToLabel, PROJECT_TYPE_OPTIONS } from "@/constants/projectTypes";
import { useOrgRoles } from '@/hooks/useOrgRoles';
import useOrgs, { Org } from '@/hooks/useOrgs';
import { deleteRow } from '@/lib/dbSubmit';
import { showPgErrorToast } from '@/lib/dbErrors';
import { afterProjectChange } from '@/lib/afterProjectChange';
import { useConfirm } from '@/components/ConfirmProvider';
import useThaiProvinceHierarchy, { useAmphures, useTambons } from '@/hooks/useThaiProvinceHierarchy';
import { findPostal } from '@/hooks/useThaiGeo';
import ThaiDatePicker, { formatThai } from '@/components/ThaiDatePicker';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'react-hot-toast';



type Project = {
  id: string;
  org_id: string;
  name: string;
  code: string | null;
  address: string | null;
  province: string | null;
  project_manager: string | null;
  type: string | null;
  status: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

type FormState = {
  name: string;
  code: string;
  type: string;
  address: string;
  province: string;
  district: string;
  subdistrict: string;
  postal_code: string;
  project_manager: string;
  status: string;
  started_at: string;
  ended_at: string;
};

export default function ProjectDetailPage() {
  const { provinces: provincesHier, loading: hierLoading, error: hierError } = useThaiProvinceHierarchy();
  const confirm = useConfirm();
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: '', code: '', type: '', address: '', province: '', district: '', subdistrict: '', postal_code: '', project_manager: '', status: 'planned', started_at: '', ended_at: ''
  });

  // Hierarchical geo dataset (id-based) + fallback postal logic
  const [provinceId, setProvinceId] = useState<number | undefined>(undefined);
  const amphures = useAmphures(provincesHier, provinceId);
  const [districtId, setDistrictId] = useState<number | undefined>(undefined);
  const tambons = useTambons(amphures, districtId);
  const [subdistrictId, setSubdistrictId] = useState<number | undefined>(undefined);

  // When switching provinceId reset dependent fields
  useEffect(() => {
    setDistrictId(undefined); setSubdistrictId(undefined);
    setForm(f => ({ ...f, district: '', subdistrict: '', postal_code: '' }));
  }, [provinceId]);
  // When switching districtId reset subdistrict
  useEffect(() => {
    setSubdistrictId(undefined);
    setForm(f => ({ ...f, subdistrict: '', postal_code: '' }));
  }, [districtId]);
  // Auto postal from tambon dataset else fallback
  useEffect(() => {
    if (provinceId && districtId && subdistrictId) {
      const zipFromHier = tambons.find(t => t.id === subdistrictId)?.zip_code?.toString();
      const provinceName = provincesHier.find(p => p.id === provinceId)?.name_th || form.province;
      const districtName = amphures.find(a => a.id === districtId)?.name_th || form.district;
      const subdistrictName = tambons.find(t => t.id === subdistrictId)?.name_th || form.subdistrict;
      const fallbackZip = (!zipFromHier && provinceName && districtName && subdistrictName) ? findPostal(provinceName, districtName, subdistrictName) : undefined;
      const finalZip = zipFromHier || fallbackZip || '';
      if (finalZip !== form.postal_code) setForm(f => ({ ...f, postal_code: finalZip }));
    }
  }, [provinceId, districtId, subdistrictId, tambons, amphures, provincesHier]);

  // Attempt to map existing string fields to hierarchical IDs when data loaded
  useEffect(() => {
    if (!project || !provincesHier.length) return;
    if (form.province && provinceId === undefined) {
      const p = provincesHier.find(p => p.name_th === form.province);
      if (p) setProvinceId(p.id);
    }
  }, [project, provincesHier, form.province, provinceId]);
  useEffect(() => {
    if (!project || !amphures.length || districtId !== undefined) return;
    if (form.district) {
      const d = amphures.find(a => a.name_th === form.district);
      if (d) setDistrictId(d.id);
    }
  }, [project, amphures, form.district, districtId]);
  useEffect(() => {
    if (!project || !tambons.length || subdistrictId !== undefined) return;
    if (form.subdistrict) {
      const t = tambons.find(t => t.name_th === form.subdistrict);
      if (t) setSubdistrictId(t.id);
    }
  }, [project, tambons, form.subdistrict, subdistrictId]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Simple fetch: select all existing columns (*) so missing optional columns don't break.
      const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        console.warn('[ProjectDetail] load error', error?.message);
        toast.error('โหลดข้อมูลโครงการไม่สำเร็จ');
        setProject(null);
        setLoading(false);
        return;
      }
      const proj: any = data;
      // Fallback: if started_at / ended_at missing but legacy start_date / end_date present, map them
      if ((proj.started_at == null || proj.started_at === '') && proj.start_date) {
        proj.started_at = proj.start_date;
      }
      if ((proj.ended_at == null || proj.ended_at === '') && proj.end_date) {
        proj.ended_at = proj.end_date;
      }
      setProject(proj as Project);
      setForm({
        name: proj.name || '',
        code: proj.code || '',
        type: proj.type || 'house',
        address: proj.address || '',
        province: proj.province || '',
        district: (proj as any).district || '',
        subdistrict: (proj as any).subdistrict || '',
        postal_code: (proj as any).postal_code || '',
        project_manager: proj.project_manager || '',
        status: proj.status || 'planned',
        started_at: proj.started_at ? String(proj.started_at).substring(0, 10) : '',
        ended_at: proj.ended_at ? String(proj.ended_at).substring(0, 10) : ''
      });
      setLoading(false);
      if (!cancelled && router.query.edit === '1') {
        setEditing(true);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const roleInfo = useOrgRoles(project?.org_id);
  const { orgs } = useOrgs();
  const canEdit = !!project && (roleInfo.role === 'admin' || roleInfo.role === 'owner');

  const statusToThai = (s?: string | null) => {
    if (!s) return '-';
    switch (s) {
      case 'planned': return 'วางแผน';
      case 'active': return 'กำลังดำเนินการ';
      case 'archived': return 'เก็บถาวร';
      default: return s;
    }
  };

  // leaflet-geoman toolbar handling removed (geoman not used)

  const onChange = (field: keyof typeof form, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  // ส่วนที่เกี่ยวข้องกับการวาด/แก้ไขแผนที่ถูกลบออกแล้ว

  const onSave = async () => {
    if (!project) return;
    // Validation: require key fields before attempting save
    if (!form.name || !form.name.trim()) { toast.error('กรุณากรอกชื่อโครงการ'); return; }
    if (!form.type || !form.type.trim()) { toast.error('กรุณาเลือกประเภทโครงการ'); return; }
    if (!form.address || !form.address.trim()) { toast.error('กรุณากรอกที่อยู่'); return; }
    if (!form.province || !form.province.trim()) { toast.error('กรุณาเลือกจังหวัด'); return; }
    if (!form.district || !form.district.trim()) { toast.error('กรุณาเลือกเขต/อำเภอ'); return; }
    if (!form.subdistrict || !form.subdistrict.trim()) { toast.error('กรุณาเลือกแขวง/ตำบล'); return; }
    if (!form.started_at || !form.started_at.trim()) { toast.error('กรุณาระบุวันเริ่มโครงการ'); return; }
    if (!form.ended_at || !form.ended_at.trim()) { toast.error('กรุณาระบุวันสิ้นสุดโครงการ'); return; }
    if (form.started_at && form.ended_at && new Date(form.ended_at) <= new Date(form.started_at)) { toast.error('วันสิ้นสุดต้องมากกว่าวันเริ่ม'); return; }
    setSaving(true);
    try {
      const baseChanges: any = {
        name: form.name.trim(),
        code: form.code || null,
        type: form.type || null,
        address: form.address || null,
        province: form.province || null,
        district: form.district || null,
        subdistrict: form.subdistrict || null,
        postal_code: form.postal_code || null,
        project_manager: form.project_manager || null,
        status: form.status || null,
        started_at: form.started_at || null,
        ended_at: form.ended_at || null,
      };
      // ไม่ส่งข้อมูล geometry กลับไปยังฐานข้อมูลจากหน้าแก้ไขนี้
      const dateVariants = [
        { startKey: 'started_at', endKey: 'ended_at' },
        { startKey: 'start_date', endKey: 'end_date' },
      ];
      const optionalCols = ['province', 'district', 'subdistrict', 'postal_code', 'project_manager'];
      let updatedRow: any = null; let lastErr: any = null;
      for (const v of dateVariants) {
        let attempt: Record<string, any> = { ...baseChanges };
        if (v.startKey !== 'started_at') { attempt[v.startKey] = attempt.started_at; delete attempt.started_at; }
        if (v.endKey !== 'ended_at') { attempt[v.endKey] = attempt.ended_at; delete attempt.ended_at; }
        const doUpdate = async () => await supabase.from('projects').update(attempt).eq('id', project.id).select('*').single();
        let { data, error } = await doUpdate();
        if (error) {
          if (error.code === '42703' || /Could not find the '.*' column/i.test(error.message)) {
            const m = error.message.match(/'([^']+)'/);
            const missing = m?.[1];
            if (missing && optionalCols.includes(missing)) {
              delete (attempt as any)[missing];
              ({ data, error } = await doUpdate());
            }
          }
        }
        if (!error && data) { updatedRow = data; lastErr = null; break; }
        lastErr = error;
        if (error && !(error.code === '42703' || /Could not find the '.*' column/i.test(error.message))) {
          break;
        }
      }
      if (lastErr && !updatedRow) {
        showPgErrorToast(lastErr, (m) => toast.error(m), { entity: 'โครงการ', labels: { code: 'รหัสโครงการ' } });
        return;
      }
      toast.success('อัปเดตโครงการสำเร็จ');
      setProject(prev => prev ? { ...prev, ...updatedRow } : prev);
      await afterProjectChange(project.org_id);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!project) return;
    const ok = await confirm('ลบโครงการนี้?', { danger: true, confirmText: 'ลบ', cancelText: 'ยกเลิก' });
    if (!ok) return;
    try {
      await deleteRow('projects', project.id, { entity: 'โครงการ', successMessage: 'ลบโครงการสำเร็จ' });
      await afterProjectChange(project.org_id);
      router.push('/projects');
    } catch (e: any) { }
  };

  // ตัดการทำงานที่เกี่ยวกับ geometry/แผนที่ออกทั้งหมด

  if (loading) return (
    <DashboardLayout title="กำลังโหลดโครงการ">
      <main className="max-w-5xl mx-auto p-6">กำลังโหลด...</main>
    </DashboardLayout>
  );
  if (!project) return (
    <DashboardLayout title="ไม่พบโครงการ">
      <main className="max-w-5xl mx-auto p-6">ไม่พบโครงการ</main>
    </DashboardLayout>
  );

  return (
    <>
      <Head>
        <title>{project?.name ? `${project.name}` : 'รายละเอียดโครงการ'}</title>
      </Head>
      <DashboardLayout title={project?.name || 'รายละเอียดโครงการ'}>
        <main className="lg:col-span-6 space-y-4">



          {!editing && (
            <div className="space-y-6">
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4 text-center">รายละเอียด</h2>
                <div className="grid grid-cols-3 gap-x-8 gap-y-2">
                  <Detail label="องค์กร" value={(orgs.find((o: Org) => o.id === project.org_id)?.name) || project.org_id || '-'} />
                  <Detail label="รหัส" value={project.code || '-'} />
                  <Detail label="ชื่อ" value={project.name || '-'} />
                  <Detail label="ผู้จัดการโครงการ" value={project.project_manager || '-'} />
                  <Detail label="ประเภท" value={typeToLabel(project.type)} />
                  <Detail label="ที่อยู่" value={((): string => {
                    const parts: string[] = [];
                    if (project.address) parts.push(project.address);
                    const sub = (project as any).subdistrict;
                    const dist = (project as any).district;
                    if (sub) parts.push(sub);
                    if (dist) parts.push(dist);
                    if (project.province) parts.push(project.province);
                    const zip = (project as any).postal_code;
                    if (zip) parts.push(String(zip));
                    return parts.length ? parts.join(', ') : '-';
                  })()} />

                  <Detail label="สถานะ" value={statusToThai(project.status)} />
                  <Detail label="วันเริ่ม" value={project.started_at ? formatThai(project.started_at) : '-'} />
                  <Detail label="วันสิ้นสุด" value={project.ended_at ? formatThai(project.ended_at) : '-'} />
                </div>
              </div>
            </div>
          )}

          {editing && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" data-testid="edit-form">
              <div className="lg:col-span-6 space-y-4">

                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                  <div className="flex justify-center text-lg font-semibold">
                    <h1>ข้อมูลโครงการ</h1>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <label className="block">
                      <span className="text-sm text-gray-600">องค์กร</span>
                      <select className="mt-1 w-full rounded-lg border px-3 py-2" value={project?.org_id || ''} disabled>
                        {(orgs || []).map((o: Org) => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm text-gray-600">รหัส</span>
                      <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.code} onChange={e => onChange('code', e.target.value)} placeholder="เช่น PRJ-2025-001" />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <label className="block">
                      <span className="text-sm text-gray-600">ชื่อ</span>
                      <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.name} onChange={e => onChange('name', e.target.value)} placeholder="เช่น โครงการก่อสร้างถนน" />
                    </label>

                    <label className="block">
                      <span className="text-sm text-gray-600">ประเภท</span>
                      <select className="mt-1 w-full rounded-lg border px-3 py-2" value={form.type} onChange={e => onChange('type', e.target.value)}>
                        {PROJECT_TYPE_OPTIONS.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <label className="block">
                      <span className="text-sm text-gray-600">ผู้จัดการโครงการ</span>
                      <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.project_manager} onChange={e => onChange('project_manager', e.target.value)} placeholder="เช่น นางสาวน้ำ ดอกไม้" />
                    </label>

                    <label className="block">
                      <span className="text-sm text-gray-600">สถานะ</span>
                      <select className="mt-1 w-full rounded-lg border px-3 py-2" value={form.status} onChange={e => onChange('status', e.target.value)}>
                        <option value="planned">วางแผน</option>
                        <option value="active">กำลังดำเนินการ</option>
                        <option value="archived">เก็บถาวร</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <label className="block">
                      <span className="text-sm text-gray-600">วันเริ่มต้น</span>
                      <ThaiDatePicker value={form.started_at} onChange={(iso) => onChange('started_at', iso)} />
                    </label>
                    <label className="block">
                      <span className="text-sm text-gray-600">วันสิ้นสุด</span>
                      <ThaiDatePicker value={form.ended_at} onChange={(iso) => onChange('ended_at', iso)} />
                      {(form.started_at && form.ended_at && new Date(form.ended_at) <= new Date(form.started_at)) && <div className="mt-1 text-[11px] text-red-600">วันสิ้นสุดต้องมากกว่าวันเริ่มต้น</div>}
                    </label>
                  </div>

                  <label className="block mb-4">
                    <span className="text-sm text-gray-600">ที่อยู่</span>
                    <input className="mt-1 w-full rounded-lg border px-3 py-2" value={form.address} onChange={e => onChange('address', e.target.value)} placeholder="เช่น 123 หมู่ 4 บ.ห้วยทราย" />
                  </label>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <label className="block">
                      <span className="text-sm text-gray-600">จังหวัด</span>
                      <select className="mt-1 w-full rounded-lg border px-3 py-2" value={provinceId || ''} onChange={(e) => { const val = e.target.value ? Number(e.target.value) : undefined; setProvinceId(val); const name = provincesHier.find(p => p.id === val)?.name_th || ''; onChange('province', name); }}>
                        <option value="">เลือกจังหวัด</option>
                        {hierLoading && <option disabled>กำลังโหลดข้อมูล...</option>}
                        {hierError && <option disabled>โหลดข้อมูลไม่สำเร็จ</option>}
                        {provincesHier.map(p => <option key={p.id} value={p.id}>{p.name_th}</option>)}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm text-gray-600">อำเภอ/เขต</span>
                      <select disabled={!provinceId} className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100" value={districtId || ''} onChange={(e) => { const val = e.target.value ? Number(e.target.value) : undefined; setDistrictId(val); const name = amphures.find(a => a.id === val)?.name_th || ''; onChange('district', name); }}>
                        <option value="">เลือกอำเภอ</option>
                        {amphures.map(a => <option key={a.id} value={a.id}>{a.name_th}</option>)}
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <label className="block">
                      <span className="text-sm text-gray-600">ตำบล/แขวง</span>
                      <select disabled={!districtId} className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100" value={subdistrictId || ''} onChange={(e) => { const val = e.target.value ? Number(e.target.value) : undefined; setSubdistrictId(val); const name = tambons.find(t => t.id === val)?.name_th || ''; onChange('subdistrict', name); }}>
                        <option value="">เลือกตำบล</option>
                        {tambons.map(t => <option key={t.id} value={t.id}>{t.name_th}</option>)}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm text-gray-600">รหัสไปรษณีย์</span>
                      <input readOnly className="mt-1 w-full rounded-lg border px-3 py-2 bg-gray-50" value={form.postal_code} />
                    </label>
                  </div>

                </div>

              </div>
            </div>
          )}

        </main>
      </DashboardLayout>
    </>
  );
}

// ----- Presentational sub components (kept at bottom to avoid re-render noise) -----
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="font-medium text-gray-800 break-words">{value}</span>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-gray-50 px-4 py-3 flex flex-col">
      <span className="text-gray-500 text-xs tracking-wide uppercase">{label}</span>
      <span className="mt-1 font-semibold text-gray-900 text-sm">{value}</span>
    </div>
  );
}
