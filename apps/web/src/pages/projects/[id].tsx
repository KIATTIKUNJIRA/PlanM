import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { typeToLabel, PROJECT_TYPE_OPTIONS } from "@/constants/projectTypes";
import { useOrgRoles } from '@/hooks/useOrgRoles';
import { updateRow, deleteRow } from '@/lib/dbSubmit';
import { afterProjectChange } from '@/lib/afterProjectChange';
import { toast } from 'react-hot-toast';

type Project = {
  id: string;
  org_id: string;
  name: string;
  code: string | null;
  address: string | null;
  type: string | null;
  latitude: number | null;
  longitude: number | null;
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{name:string; code:string; type:string; address:string; latitude:string; longitude:string}>({name:'',code:'',type:'',address:'',latitude:'',longitude:''});

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("projects")
        .select("id, org_id, name, code, type, address, latitude, longitude")
        .eq("id", id)
        .single();
      if (data) {
        const proj = data as Project;
        setProject(proj);
        setForm({
          name: proj.name || '',
          code: proj.code || '',
          type: proj.type || 'house',
          address: proj.address || '',
          latitude: proj.latitude != null ? String(proj.latitude) : '',
          longitude: proj.longitude != null ? String(proj.longitude) : ''
        });
      } else {
        setProject(null);
      }
      setLoading(false);
    })();
  }, [id]);

  const roleInfo = useOrgRoles(project?.org_id);
  const canEdit = !!project && (roleInfo.role === 'admin' || roleInfo.role === 'owner');

  const onChange = (field: keyof typeof form, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const onSave = async () => {
    if (!project) return;
    setSaving(true);
    try {
      const changes: any = {
        name: form.name.trim(),
        code: form.code || null,
        type: form.type || null,
        address: form.address || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      };
      const updated = await updateRow('projects', project.id, changes, { entity: 'โครงการ', labels: { code: 'รหัสโครงการ' }, successMessage: 'อัปเดตโครงการสำเร็จ' });
      setProject(prev => prev ? { ...prev, ...updated } : prev);
      await afterProjectChange(project.org_id);
      setEditing(false);
    } catch (e:any) {
      // toast already shown by helper
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!project) return;
    if (!confirm('ลบโครงการนี้?')) return;
    try {
      await deleteRow('projects', project.id, { entity: 'โครงการ', successMessage: 'ลบโครงการสำเร็จ' });
      await afterProjectChange(project.org_id);
      router.push('/projects');
    } catch (e:any) {
      // toast already shown
    }
  };

  if (loading) return <main className="max-w-3xl mx-auto p-6">กำลังโหลด...</main>;
  if (!project) return <main className="max-w-3xl mx-auto p-6">ไม่พบโครงการ</main>;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-sm text-gray-500">ประเภท: {typeToLabel(project.type)}</p>
        </div>
        <div className="flex gap-2">
          {canEdit && !editing && (
            <button onClick={()=>setEditing(true)} className="px-3 py-1.5 text-xs rounded bg-indigo-600 text-white hover:opacity-90" data-testid="edit-project-btn">แก้ไข</button>
          )}
          {canEdit && editing && (
            <>
              <button onClick={onSave} disabled={saving} className="px-3 py-1.5 text-xs rounded bg-green-600 text-white disabled:opacity-50" data-testid="save-project-btn">{saving? 'กำลังบันทึก...' : 'บันทึก'}</button>
              <button onClick={()=>{setEditing(false); setForm({ name: project.name||'', code: project.code||'', type: project.type||'house', address: project.address||'', latitude: project.latitude!=null?String(project.latitude):'', longitude: project.longitude!=null?String(project.longitude):'' });}} className="px-3 py-1.5 text-xs rounded bg-gray-300" data-testid="cancel-edit-btn">ยกเลิก</button>
            </>
          )}
          {canEdit && !editing && (
            <button onClick={onDelete} className="px-3 py-1.5 text-xs rounded bg-red-600 text-white hover:opacity-90" data-testid="delete-project-btn">ลบ</button>
          )}
        </div>
      </div>
      {!editing && (
        <div className="text-gray-700 space-y-1">
          <div>รหัส: {project.code ?? '-'}</div>
          <div>ที่อยู่: {project.address ?? '-'}</div>
          <div>พิกัด: {project.latitude ?? '-'}, {project.longitude ?? '-'}</div>
          <a className="text-blue-600 hover:underline inline-block mt-2 text-sm" href="/projects">← กลับไปหน้ารายการ</a>
        </div>
      )}
      {editing && (
        <form className="space-y-3" onSubmit={e=>{e.preventDefault(); onSave();}} data-testid="edit-form">
          <div>
            <label className="block text-sm text-gray-600">ชื่อโครงการ *</label>
            <input className="mt-1 w-full rounded border px-3 py-2" value={form.name} onChange={e=>onChange('name', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-600">รหัสโครงการ</label>
            <input className="mt-1 w-full rounded border px-3 py-2" value={form.code} onChange={e=>onChange('code', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-600">ประเภท</label>
            <select className="mt-1 w-full rounded border px-3 py-2" value={form.type} onChange={e=>onChange('type', e.target.value)}>
              {PROJECT_TYPE_OPTIONS.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600">ที่อยู่</label>
            <input className="mt-1 w-full rounded border px-3 py-2" value={form.address} onChange={e=>onChange('address', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600">ละติจูด</label>
              <input className="mt-1 w-full rounded border px-3 py-2" value={form.latitude} onChange={e=>onChange('latitude', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600">ลองจิจูด</label>
              <input className="mt-1 w-full rounded border px-3 py-2" value={form.longitude} onChange={e=>onChange('longitude', e.target.value)} />
            </div>
          </div>
        </form>
      )}
    </main>
  );
}
