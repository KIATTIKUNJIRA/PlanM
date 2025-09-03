import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import MapPicker from "@/components/map/MapPicker";
import { supabase } from "@/lib/supabase";
import useOrgs from "@/hooks/useOrgs";
import { PROJECT_TYPE_OPTIONS, ProjectTypeCode } from "@/constants/projectTypes";
import { friendlyDbMessage } from "@/lib/dbErrors";
import { toast } from "react-hot-toast";
import { insertRow } from '@/lib/dbSubmit';
import { afterProjectChange } from '@/lib/afterProjectChange';

/** ---------- Small helpers ---------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function useProjects(orgId?: string) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!orgId) return setItems([]);
      const { data, error } = await supabase
        .from("projects")
        .select("id,name")
        .eq("org_id", orgId)
        .order("name", { ascending: true });
      if (!mounted) return;
      if (error) console.error(error);
      setItems(data ?? []);
    })();
    return () => {
      mounted = false;
    };
  }, [orgId]);
  return items;
}

function useSites(orgId?: string, projectId?: string) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!orgId || !projectId) return setItems([]);
      const { data, error } = await supabase
        .from("sites")
        .select("id,name")
        .eq("org_id", orgId)
        .eq("project_id", projectId)
        .order("name", { ascending: true });
      if (!mounted) return;
      if (error) console.error(error);
      setItems(data ?? []);
    })();
    return () => {
      mounted = false;
    };
  }, [orgId, projectId]);
  return items;
}

function useBuildings(orgId?: string, siteId?: string) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!orgId || !siteId) return setItems([]);
      const { data, error } = await supabase
        .from("buildings")
        .select("id,name")
        .eq("org_id", orgId)
        .eq("site_id", siteId)
        .order("name", { ascending: true });
      if (!mounted) return;
      if (error) console.error(error);
      setItems(data ?? []);
    })();
    return () => {
      mounted = false;
    };
  }, [orgId, siteId]);
  return items;
}

function useFloors(orgId?: string, buildingId?: string) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!orgId || !buildingId) return setItems([]);
      const { data, error } = await supabase
        .from("floors")
        .select("id,floor_no")
        .eq("org_id", orgId)
        .eq("building_id", buildingId)
        .order("floor_no", { ascending: true });
      if (!mounted) return;
      if (error) console.error(error);
      setItems(data ?? []);
    })();
    return () => {
      mounted = false;
    };
  }, [orgId, buildingId]);
  return items;
}

/** ============ Organization ============ */
export function OrgForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!name.trim()) { setMsg('กรุณากรอกชื่อองค์กร'); return; }
    setSaving(true);
    try {
      await insertRow('organizations', { name: name.trim(), description: description || null }, {
        entity: 'องค์กร', successMessage: 'สร้างองค์กรสำเร็จ',
        labels: { name: 'ชื่อองค์กร' }
      });
      setName(''); setDescription('');
    } catch (err: any) {
      setMsg(err?.message || 'บันทึกไม่สำเร็จ');
    } finally { setSaving(false); }
  };

  return (
    <Card title="🏢 สร้างองค์กร">
      <form className="space-y-3" onSubmit={submit}>
        {msg && <p className="text-sm text-amber-700">{msg}</p>}
        <Field label="ชื่อองค์กร *">
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ชื่อบริษัท / องค์กร"
          />
        </Field>
        <Field label="คำอธิบาย (ไม่บังคับ)">
          <textarea
            className="w-full rounded-lg border px-3 py-2"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="คำอธิบายเกี่ยวกับองค์กร"
          />
        </Field>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-black text-white px-4 py-2 hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "สร้างองค์กร"}
        </button>
      </form>
    </Card>
  );
}

/** ============ Project ============ */
export function ProjectForm() {
  const { orgs, loading: orgLoading, error: orgError } = useOrgs();
  const router = useRouter();

  const [orgId, setOrgId] = useState<string>("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<ProjectTypeCode>("house");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<string>("13.756331");
  const [longitude, setLongitude] = useState<string>("100.501762");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // fetch current user once
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    })();
  }, []);

  // auto-select single org
  useEffect(() => {
    if (!orgLoading && orgs.length === 1 && !orgId) {
      setOrgId(orgs[0].id);
    }
  }, [orgLoading, orgs, orgId]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      if (!orgId) {
        setMsg("กรุณาเลือกองค์กร");
        return;
      }
      // 1) auth
      const { data: ures, error: uerr } = await supabase.auth.getUser();
      if (uerr || !ures?.user) throw new Error("กรุณาเข้าสู่ระบบใหม่");

      // 2) build payload
      const payload = {
        org_id: orgId,
        name,
        code,
  type,
        address,
        latitude: Number(latitude),
        longitude: Number(longitude),
      };

      // 3) insert (attempt to return id directly)
      const { data: ins, error: insErr } = await supabase
        .from('projects')
        .insert(payload)
        .select('id')
        .single();
      if (insErr) {
        const friendly = friendlyDbMessage(insErr as any, {
          entity: 'โครงการ',
          labels: {
            org_id: 'องค์กร',
            code: 'รหัสโครงการ',
            type: 'ประเภทโครงการ',
            latitude: 'ละติจูด',
            longitude: 'ลองจิจูด',
          }
        });
        toast.error(friendly);
        setMsg(friendly);
        return;
      }

      let newId = Array.isArray(ins) ? (ins as any)[0]?.id : (ins as any)?.id;

      // 4) defensive fallback: fetch latest for this org if id not visible due to RLS
      if (!newId) {
        const { data: latest } = await supabase
          .from("projects")
          .select("id")
          .eq("org_id", orgId)
          // ใช้คอลัมน์เวลาที่มีจริงในตารางของคุณ: created_at/inserted_at
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        newId = latest?.id;
      }

      toast.success("สร้างโครงการสำเร็จ");

      // 5) invalidate project-related caches so dashboard updates immediately
      try {
        await afterProjectChange(orgId);
      } catch (cacheErr) {
        // non-fatal; log only
        console.warn('afterProjectChange failed', cacheErr);
      }

      // 6) redirect — ถ้าได้ id ไปหน้า detail, ไม่ได้ให้ไป list
      if (newId) {
        void router.push(`/projects/${newId}`);
        return; // important: stop here to avoid falling through
      }
      void router.push("/projects");
    } catch (err: any) {
      console.error("create project failed:", err);
      setMsg(err?.message ?? "เกิดข้อผิดพลาดที่ไม่คาดคิด");
      toast.error(err?.message ?? "บันทึกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="🏗️ สร้างโครงการ">
      <form className="space-y-3" onSubmit={submit}>
        {msg && (
          <p className="text-sm text-amber-700 mt-2">{msg}</p>
        )}
        <label className="block">
          <span className="text-sm text-gray-600">เลือกองค์กร *</span>
          {orgLoading ? (
            <select className="w-full mt-1 rounded-lg border px-3 py-2 text-gray-500" disabled>
              <option>กำลังโหลดองค์กร...</option>
            </select>
          ) : !orgLoading && orgs.length === 0 ? (
            <p className="mt-1 text-sm text-gray-500">คุณยังไม่ได้เป็นสมาชิกองค์กร</p>
          ) : (
            <select
              className="w-full mt-1 rounded-lg border px-3 py-2"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              required
            >
              <option value="" disabled>— เลือกองค์กร —</option>
              {orgs.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          )}
        </label>

        <Field label="ชื่อโครงการ *">
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <Field label="รหัสโครงการ (ไม่บังคับ)">
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </Field>

        <label className="block">
          <span className="text-sm text-gray-600">ประเภทโครงการ</span>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value as ProjectTypeCode)}
          >
            {PROJECT_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <Field label="ที่อยู่">
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>

        <div className="space-y-2">
          <MapPicker
            value={[ Number(latitude) || 13.756331, Number(longitude) || 100.501762 ]}
            onChange={(newLat, newLng) => {
              setLatitude(newLat.toFixed(6));
              setLongitude(newLng.toFixed(6));
            }}
            height={480}
            className="rounded-lg border"
          />
          <p className="px-3 py-2 text-xs text-gray-600 bg-white/70 rounded">
            เคล็ดลับ: คลิกบนแผนที่เพื่อเลือกพิกัด หรือจับ Marker ลากเพื่อปรับละเอียด
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="ละติจูด (latitude)">
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="13.756331"
            />
          </Field>
          <Field label="ลองจิจูด (longitude)">
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="100.501762"
            />
          </Field>
        </div>

        <button
          type="submit"
          disabled={loading || orgLoading || !orgId}
          className="rounded-lg bg-black text-white px-4 py-2 hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "กำลังบันทึก..." : "สร้างโครงการ"}
        </button>
      </form>
    </Card>
  );
}

/** ============ Site ============ */
export function SiteForm() {
  const { orgs } = useOrgs();
  const [orgId, setOrgId] = useState<string>("");
  const projects = useProjects(orgId);
  const [projectId, setProjectId] = useState<string>("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [deed, setDeed] = useState("");
  const [size, setSize] = useState("");
  const [province, setProvince] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId && orgs.length) setOrgId(orgs[0].id);
  }, [orgs, orgId]);

  useEffect(() => {
    if (!projectId && projects.length) setProjectId(projects[0].id);
  }, [projects, projectId]);

  const [msgSite, setMsgSite] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgSite(null);
    if (!orgId) { setMsgSite('เลือกองค์กรก่อน'); return; }
    if (!projectId) { setMsgSite('เลือกโครงการก่อน'); return; }
    if (!name.trim()) { setMsgSite('กรุณากรอกชื่อสาขา/ที่ดิน'); return; }
    setSaving(true);
    try {
      await insertRow('sites', {
        org_id: orgId,
        project_id: projectId,
        name: name.trim(),
        code: code || null,
        deed_number: deed || null,
        land_size_sqm: size ? Number(size) : null,
        province: province || null,
        address: address || null,
        latitude: lat ? Number(lat) : null,
        longitude: lng ? Number(lng) : null,
      }, { entity: 'สาขา/ที่ดิน', successMessage: 'สร้างสาขา/ที่ดินสำเร็จ', labels: { name: 'ชื่อสาขา/ที่ดิน', code: 'รหัส', latitude: 'ละติจูด', longitude: 'ลองจิจูด' } });
      setName(''); setCode(''); setDeed(''); setSize(''); setProvince(''); setAddress(''); setLat(''); setLng('');
    } catch (err: any) {
      setMsgSite(err?.message || 'บันทึกไม่สำเร็จ');
    } finally { setSaving(false); }
  };

  return (
    <Card title="🏢 สร้างสาขา/ที่ดิน (Site)">
      <form className="space-y-3" onSubmit={submit}>
        {msgSite && <p className="text-sm text-amber-700">{msgSite}</p>}
        <Field label="เลือกองค์กร *">
          <select className="w-full rounded-lg border px-3 py-2" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เลือกโครงการ *">
          <select className="w-full rounded-lg border px-3 py-2" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ชื่อสาขา/ที่ดิน *">
          <input className="w-full rounded-lg border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="รหัส (ไม่บังคับ)">
            <input className="w-full rounded-lg border px-3 py-2" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Field label="เลขที่โฉนด (ไม่บังคับ)">
            <input className="w-full rounded-lg border px-3 py-2" value={deed} onChange={(e) => setDeed(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ขนาดที่ดิน (ตร.ม.)">
            <input type="number" className="w-full rounded-lg border px-3 py-2" value={size} onChange={(e) => setSize(e.target.value)} />
          </Field>
          <Field label="จังหวัด">
            <input className="w-full rounded-lg border px-3 py-2" value={province} onChange={(e) => setProvince(e.target.value)} />
          </Field>
        </div>
        <Field label="ที่อยู่">
          <input className="w-full rounded-lg border px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ละติจูด">
            <input className="w-full rounded-lg border px-3 py-2" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="13.756331" />
          </Field>
          <Field label="ลองจิจูด">
            <input className="w-full rounded-lg border px-3 py-2" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="100.501762" />
          </Field>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-black text-white px-4 py-2 hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "สร้างสาขา/ที่ดิน"}
        </button>
      </form>
    </Card>
  );
}

/** ============ Building ============ */
export function BuildingForm() {
  const { orgs } = useOrgs();
  const [orgId, setOrgId] = useState<string>("");
  const projects = useProjects(orgId);
  const [projectId, setProjectId] = useState<string>("");
  const sites = useSites(orgId, projectId);
  const [siteId, setSiteId] = useState<string>("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId && orgs.length) setOrgId(orgs[0].id);
  }, [orgs, orgId]);

  useEffect(() => {
    if (!projectId && projects.length) setProjectId(projects[0].id);
  }, [projects, projectId]);

  useEffect(() => {
    if (!siteId && sites.length) setSiteId(sites[0].id);
  }, [sites, siteId]);

  const [msgBuilding, setMsgBuilding] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgBuilding(null);
    if (!orgId) { setMsgBuilding('เลือกองค์กรก่อน'); return; }
    if (!projectId) { setMsgBuilding('เลือกโครงการก่อน'); return; }
    if (!siteId) { setMsgBuilding('เลือกสาขา/ที่ดินก่อน'); return; }
    if (!name.trim()) { setMsgBuilding('กรุณากรอกชื่ออาคาร'); return; }
    setSaving(true);
    try {
      await insertRow('buildings', { org_id: orgId, project_id: projectId, site_id: siteId, name: name.trim(), code: code || null }, { entity: 'อาคาร', successMessage: 'สร้างอาคารสำเร็จ', labels: { name: 'ชื่ออาคาร', code: 'รหัสอาคาร' } });
      setName(''); setCode('');
    } catch (err: any) { setMsgBuilding(err?.message || 'บันทึกไม่สำเร็จ'); } finally { setSaving(false); }
  };

  return (
    <Card title="🏗️ สร้างอาคาร (Building)">
      <form className="space-y-3" onSubmit={submit}>
        {msgBuilding && <p className="text-sm text-amber-700">{msgBuilding}</p>}
        <Field label="เลือกองค์กร *">
          <select className="w-full rounded-lg border px-3 py-2" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เลือกโครงการ *">
          <select className="w-full rounded-lg border px-3 py-2" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เลือกสาขา/ที่ดิน *">
          <select className="w-full rounded-lg border px-3 py-2" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ชื่ออาคาร *">
          <input className="w-full rounded-lg border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="รหัสอาคาร (ไม่บังคับ)">
          <input className="w-full rounded-lg border px-3 py-2" value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-black text-white px-4 py-2 hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "สร้างอาคาร"}
        </button>
      </form>
    </Card>
  );
}

/** ============ Floor ============ */
export function FloorForm() {
  const { orgs } = useOrgs();
  const [orgId, setOrgId] = useState<string>("");
  const projects = useProjects(orgId);
  const [projectId, setProjectId] = useState<string>("");
  const sites = useSites(orgId, projectId);
  const [siteId, setSiteId] = useState<string>("");
  const buildings = useBuildings(orgId, siteId);
  const [buildingId, setBuildingId] = useState<string>("");
  const [floorNo, setFloorNo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId && orgs.length) setOrgId(orgs[0].id);
  }, [orgs, orgId]);

  useEffect(() => {
    if (!projectId && projects.length) setProjectId(projects[0].id);
  }, [projects, projectId]);

  useEffect(() => {
    if (!siteId && sites.length) setSiteId(sites[0].id);
  }, [sites, siteId]);

  useEffect(() => {
    if (!buildingId && buildings.length) setBuildingId(buildings[0].id);
  }, [buildings, buildingId]);

  const [msgFloor, setMsgFloor] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgFloor(null);
    if (!orgId) { setMsgFloor('เลือกองค์กรก่อน'); return; }
    if (!projectId) { setMsgFloor('เลือกโครงการก่อน'); return; }
    if (!siteId) { setMsgFloor('เลือกสาขา/ที่ดินก่อน'); return; }
    if (!buildingId) { setMsgFloor('เลือกอาคารก่อน'); return; }
    if (!floorNo.trim()) { setMsgFloor('กรุณากรอกชั้น'); return; }
    setSaving(true);
    try {
      await insertRow('floors', { org_id: orgId, project_id: projectId, site_id: siteId, building_id: buildingId, floor_no: floorNo.trim() }, { entity: 'ชั้น', successMessage: 'สร้างชั้นสำเร็จ', labels: { floor_no: 'ชั้น' } });
      setFloorNo('');
    } catch (err: any) { setMsgFloor(err?.message || 'บันทึกไม่สำเร็จ'); } finally { setSaving(false); }
  };

  return (
    <Card title="🏠 สร้างชั้น (Floor)">
      <form className="space-y-3" onSubmit={submit}>
        {msgFloor && <p className="text-sm text-amber-700">{msgFloor}</p>}
        <Field label="เลือกองค์กร *">
          <select className="w-full rounded-lg border px-3 py-2" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เลือกโครงการ *">
          <select className="w-full rounded-lg border px-3 py-2" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เลือกสาขา/ที่ดิน *">
          <select className="w-full rounded-lg border px-3 py-2" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เลือกอาคาร *">
          <select className="w-full rounded-lg border px-3 py-2" value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
            {buildings.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ชั้น *">
          <input 
            className="w-full rounded-lg border px-3 py-2" 
            value={floorNo} 
            onChange={(e) => setFloorNo(e.target.value)} 
            placeholder="เช่น G, 1, 2, 3, B1, B2"
          />
        </Field>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-black text-white px-4 py-2 hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "สร้างชั้น"}
        </button>
      </form>
    </Card>
  );
}

/** ============ Unit ============ */
export function UnitForm() {
  const { orgs } = useOrgs();
  const [orgId, setOrgId] = useState<string>("");
  const projects = useProjects(orgId);
  const [projectId, setProjectId] = useState<string>("");
  const sites = useSites(orgId, projectId);
  const [siteId, setSiteId] = useState<string>("");
  const buildings = useBuildings(orgId, siteId);
  const [buildingId, setBuildingId] = useState<string>("");
  const floors = useFloors(orgId, buildingId);
  const [floorId, setFloorId] = useState<string>("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId && orgs.length) setOrgId(orgs[0].id);
  }, [orgs, orgId]);

  useEffect(() => {
    if (!projectId && projects.length) setProjectId(projects[0].id);
  }, [projects, projectId]);

  useEffect(() => {
    if (!siteId && sites.length) setSiteId(sites[0].id);
  }, [sites, siteId]);

  useEffect(() => {
    if (!buildingId && buildings.length) setBuildingId(buildings[0].id);
  }, [buildings, buildingId]);

  useEffect(() => {
    if (!floorId && floors.length) setFloorId(floors[0].id);
  }, [floors, floorId]);

  const [msgUnit, setMsgUnit] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgUnit(null);
    if (!orgId) { setMsgUnit('เลือกองค์กรก่อน'); return; }
    if (!projectId) { setMsgUnit('เลือกโครงการก่อน'); return; }
    if (!siteId) { setMsgUnit('เลือกสาขา/ที่ดินก่อน'); return; }
    if (!buildingId) { setMsgUnit('เลือกอาคารก่อน'); return; }
    if (!floorId) { setMsgUnit('เลือกชั้นก่อน'); return; }
    if (!name.trim()) { setMsgUnit('กรุณากรอกชื่อห้อง/ยูนิต'); return; }
    setSaving(true);
    try {
      await insertRow('units', { org_id: orgId, project_id: projectId, site_id: siteId, building_id: buildingId, floor_id: floorId, name: name.trim(), code: code || null }, { entity: 'ห้อง/ยูนิต', successMessage: 'สร้างห้อง/ยูนิตสำเร็จ', labels: { name: 'ชื่อห้อง/ยูนิต', code: 'รหัสห้อง' } });
      setName(''); setCode('');
    } catch (err: any) { setMsgUnit(err?.message || 'บันทึกไม่สำเร็จ'); } finally { setSaving(false); }
  };

  return (
    <Card title="🚪 สร้างห้อง/ยูนิต (Unit)">
      <form className="space-y-3" onSubmit={submit}>
        {msgUnit && <p className="text-sm text-amber-700">{msgUnit}</p>}
        <Field label="เลือกองค์กร *">
          <select className="w-full rounded-lg border px-3 py-2" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เลือกโครงการ *">
          <select className="w-full rounded-lg border px-3 py-2" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เลือกสาขา/ที่ดิน *">
          <select className="w-full rounded-lg border px-3 py-2" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เลือกอาคาร *">
          <select className="w-full rounded-lg border px-3 py-2" value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
            {buildings.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เลือกชั้น *">
          <select className="w-full rounded-lg border px-3 py-2" value={floorId} onChange={(e) => setFloorId(e.target.value)}>
            {floors.map((f: any) => (
              <option key={f.id} value={f.id}>
                ชั้น {f.floor_no}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ชื่อห้อง/ยูนิต *">
          <input className="w-full rounded-lg border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="รหัสห้อง (ไม่บังคับ)">
          <input className="w-full rounded-lg border px-3 py-2" value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-black text-white px-4 py-2 hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "สร้างห้อง/ยูนิต"}
        </button>
      </form>
    </Card>
  );
}

/** ============ Asset ============ */
export function AssetForm() {
  const { orgs } = useOrgs();
  const [orgId, setOrgId] = useState<string>("");
  const projects = useProjects(orgId);
  const [projectId, setProjectId] = useState<string>("");
  const sites = useSites(orgId, projectId);
  const [siteId, setSiteId] = useState<string>("");
  const buildings = useBuildings(orgId, siteId);
  const [buildingId, setBuildingId] = useState<string>("");
  const floors = useFloors(orgId, buildingId);
  const [floorId, setFloorId] = useState<string>("");
  const [unitId, setUnitId] = useState<string>(""); // optional
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId && orgs.length) setOrgId(orgs[0].id);
  }, [orgs, orgId]);

  useEffect(() => {
    if (!projectId && projects.length) setProjectId(projects[0].id);
  }, [projects, projectId]);

  useEffect(() => {
    if (!siteId && sites.length) setSiteId(sites[0].id);
  }, [sites, siteId]);

  useEffect(() => {
    if (!buildingId && buildings.length) setBuildingId(buildings[0].id);
  }, [buildings, buildingId]);

  useEffect(() => {
    if (!floorId && floors.length) setFloorId(floors[0].id);
  }, [floors, floorId]);

  const [msgAsset, setMsgAsset] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgAsset(null);
    if (!orgId) { setMsgAsset('เลือกองค์กรก่อน'); return; }
    if (!projectId) { setMsgAsset('เลือกโครงการก่อน'); return; }
    if (!siteId) { setMsgAsset('เลือกสาขา/ที่ดินก่อน'); return; }
    if (!buildingId) { setMsgAsset('เลือกอาคารก่อน'); return; }
    if (!floorId) { setMsgAsset('เลือกชั้นก่อน'); return; }
    if (!name.trim()) { setMsgAsset('กรุณากรอกชื่อสินทรัพย์'); return; }
    setSaving(true);
    try {
      await insertRow('assets', { org_id: orgId, project_id: projectId, site_id: siteId, building_id: buildingId, floor_id: floorId, unit_id: unitId || null, name: name.trim(), brand: brand || null, model: model || null, serial_number: serialNumber || null }, { entity: 'สินทรัพย์', successMessage: 'สร้างสินทรัพย์สำเร็จ', labels: { name: 'ชื่อสินทรัพย์' } });
      setName(''); setBrand(''); setModel(''); setSerialNumber(''); setUnitId('');
    } catch (err: any) { setMsgAsset(err?.message || 'บันทึกไม่สำเร็จ'); } finally { setSaving(false); }
  };

  return (
    <Card title="📦 สร้างสินทรัพย์ (Asset)">
      <form className="space-y-3" onSubmit={submit}>
        {msgAsset && <p className="text-sm text-amber-700">{msgAsset}</p>}
        <Field label="เลือกองค์กร *">
          <select className="w-full rounded-lg border px-3 py-2" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เลือกโครงการ *">
          <select className="w-full rounded-lg border px-3 py-2" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เลือกสาขา/ที่ดิน *">
          <select className="w-full rounded-lg border px-3 py-2" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เลือกอาคาร *">
          <select className="w-full rounded-lg border px-3 py-2" value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
            {buildings.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="เลือกชั้น *">
          <select className="w-full rounded-lg border px-3 py-2" value={floorId} onChange={(e) => setFloorId(e.target.value)}>
            {floors.map((f: any) => (
              <option key={f.id} value={f.id}>
                ชั้น {f.floor_no}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ห้อง/ยูนิต (ไม่บังคับ)">
          <input 
            className="w-full rounded-lg border px-3 py-2" 
            value={unitId} 
            onChange={(e) => setUnitId(e.target.value)}
            placeholder="ID ของห้อง (ถ้ามี)"
          />
        </Field>
        <Field label="ชื่อสินทรัพย์ *">
          <input className="w-full rounded-lg border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ยี่ห้อ">
            <input className="w-full rounded-lg border px-3 py-2" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </Field>
          <Field label="รุ่น">
            <input className="w-full rounded-lg border px-3 py-2" value={model} onChange={(e) => setModel(e.target.value)} />
          </Field>
        </div>
        <Field label="หมายเลขซีเรียล">
          <input className="w-full rounded-lg border px-3 py-2" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
        </Field>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-black text-white px-4 py-2 hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "สร้างสินทรัพย์"}
        </button>
      </form>
    </Card>
  );
}
