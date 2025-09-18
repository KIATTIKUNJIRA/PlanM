import React, { useState, useEffect } from 'react';
import { insertRow } from '@/lib/dbSubmit';
import { supabase } from '@/lib/supabase';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export default function CreateOrganizationPage() {
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!name.trim()) { setMsg('กรุณากรอกชื่อองค์กร'); return; }
    setSaving(true);
    try {
      await insertRow('organizations', {
        name: name.trim(),
        business_type: businessType || null,
        created_by: userId || null,
      }, {
        entity: 'องค์กร',
        successMessage: 'สร้างองค์กรสำเร็จ',
        labels: { name: 'ชื่อองค์กร', business_type: 'ประเภทธุรกิจ' }
      });
      setName(''); setBusinessType('');
    } catch (err: any) {
      setMsg(err?.message || 'บันทึกไม่สำเร็จ');
    } finally { setSaving(false); }
  };

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">สร้างองค์กรใหม่</h1>
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow">
        {msg && <p className="text-sm text-amber-700 mb-2">{msg}</p>}
        <form className="space-y-3" onSubmit={submit}>
          <Field label="ชื่อองค์กร *">
            <input className="w-full rounded-lg border px-3 py-2" value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อบริษัท / องค์กร" />
          </Field>
          <Field label="ประเภทธุรกิจ (ไม่บังคับ)">
            <input className="w-full rounded-lg border px-3 py-2" value={businessType} onChange={e => setBusinessType(e.target.value)} placeholder="เช่น ปั้มน้ำมัน, ค้าปลีก" />
          </Field>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="rounded-lg bg-black text-white px-4 py-2 hover:opacity-90 disabled:opacity-50">
              {saving ? 'กำลังบันทึก...' : 'สร้างองค์กร'}
            </button>
            <p className="text-sm text-gray-500">ผู้สร้าง: {userId ? userId : 'ไม่ระบุ'}</p>
          </div>
        </form>
      </div>
    </main>
  );
}
