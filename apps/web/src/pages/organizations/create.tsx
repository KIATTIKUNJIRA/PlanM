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
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
    })();
    // fetch existing orgs
    void fetchOrgs();
  }, []);

  async function fetchOrgs() {
    setLoadingOrgs(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id,name,business_type,created_by')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('fetch orgs failed', error);
        setOrgs([]);
      } else {
        setOrgs(data ?? []);
      }
    } catch (e) {
      console.error(e);
      setOrgs([]);
    } finally {
      setLoadingOrgs(false);
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!name.trim()) { setMsg('กรุณากรอกชื่อองค์กร'); return; }
    setSaving(true);
    try {
      const created: any = await insertRow('organizations', {
        name: name.trim(),
        business_type: businessType || null,
        created_by: userId || null,
      }, {
        entity: 'องค์กร',
        successMessage: 'สร้างองค์กรสำเร็จ',
        labels: { name: 'ชื่อองค์กร', business_type: 'ประเภทธุรกิจ' }
      });
      // clear inputs
      setName(''); setBusinessType('');
      // prepend created org to list so user sees it immediately
      if (created && created.id) {
        setOrgs(prev => [created, ...prev.filter(o => o.id !== created.id)]);
      } else {
        // fallback: refetch
        void fetchOrgs();
      }
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
      <section className="mt-6">
        <h2 className="text-lg font-medium mb-2">องค์กรที่มีอยู่</h2>
        <div className="bg-white border border-gray-200 rounded-lg shadow p-4">
          {loadingOrgs ? (
            <p className="text-sm text-gray-500">กำลังโหลด...</p>
          ) : orgs.length === 0 ? (
            <p className="text-sm text-gray-500">ยังไม่มีองค์กรในระบบ</p>
          ) : (
            <ul className="space-y-2">
              {orgs.map(o => (
                  <li key={o.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                    <div>
                      <div className="font-medium">{o.name}</div>
                      {o.business_type && <div className="text-sm text-gray-500">{o.business_type}</div>}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-xs text-gray-400">ผู้สร้าง: {o.created_by ?? 'ไม่ระบุ'}</div>
                      <button
                        type="button"
                        disabled={deletingId === o.id}
                        onClick={async () => {
                          const ok = confirm(`ลบองค์กร "${o.name}" จริงหรือไม่?`);
                          if (!ok) return;
                          try {
                            setDeletingId(o.id);
                            const { error } = await supabase.from('organizations').delete().eq('id', o.id);
                            if (error) throw error;
                            setOrgs(prev => prev.filter(p => p.id !== o.id));
                          } catch (err) {
                            console.error('delete org failed', err);
                            alert('ไม่สามารถลบองค์กรได้');
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        className="text-red-600 text-sm hover:underline disabled:opacity-50"
                      >
                        {deletingId === o.id ? 'กำลังลบ...' : 'ลบ'}
                      </button>
                    </div>
                  </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
