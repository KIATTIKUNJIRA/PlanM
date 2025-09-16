import dynamic from "next/dynamic";
import { showPgErrorToast } from '@/lib/dbErrors';
import { afterProjectChange } from '@/lib/afterProjectChange';
import { useRouter } from 'next/router';
const MapPicker = dynamic(() => import("@/components/map/MapPicker"), { ssr: false });
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import useOrgs from "@/hooks/useOrgs";

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

/** Whitelist project table columns to avoid PostgREST unknown column errors */
function pickKnownProjectColumns(raw: Record<string, any>) {
  // Map legacy/local keys to DB schema keys if needed
  const mapped = { ...raw };
  if (mapped.kind && !mapped.type) mapped.type = mapped.kind; // rename if table uses 'type'
  // Potential alternate column names (manager vs project_manager)
  if (mapped.manager && !mapped.project_manager) mapped.project_manager = mapped.manager;
  // geometry synonyms
  if (mapped.boundary && !mapped.geometry) mapped.geometry = mapped.boundary;

  const allowed = new Set([
    'org_id','code','name','type','status','address','latitude','longitude',
    'started_at','ended_at','manager','project_manager','geometry','boundary','kind','project_kind'
  ]);
  const out: Record<string, any> = {};
  for (const k of Object.keys(mapped)) {
    if (allowed.has(k) && mapped[k] !== undefined) out[k] = mapped[k];
  }
  // Prefer canonical keys
  if (out.kind && !out.type && out.project_kind == null) { out.type = out.kind; }
  if (out.project_kind && !out.type) { out.type = out.project_kind; }
  return out;
}

/** ============ Organization ============ */
export function OrgForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("กรุณากรอกชื่อองค์กร");

    setSaving(true);
    const { error } = await supabase.from("organizations").insert({
      name: name.trim(),
      description: description || null,
    });
    setSaving(false);

    if (error) {
      alert("สร้างองค์กรไม่สำเร็จ: " + error.message);
      return;
    }

    alert("สร้างองค์กรสำเร็จ");
    setName("");
    setDescription("");
  };

  return (
    <Card title="🏢 สร้างองค์กร">
      <form className="space-y-3" onSubmit={submit}>
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
  const { orgs } = useOrgs();
  const router = useRouter();

  const [orgId, setOrgId] = useState<string>("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"raw_land" | "housing" | "condo" | "office" | "warehouse" | "mixed_use">("housing");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // default org เมื่อโหลดรายการเสร็จ
  useEffect(() => {
    if (!orgId && orgs.length) setOrgId(orgs[0].id);
  }, [orgs, orgId]);

  // ช่วยให้ MapPicker แสดงจุดเมื่อมีค่า lat/lng แล้ว
  const mapValue: [number, number] | null = lat && lng
    ? [Number(lat), Number(lng)]
    : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return alert("เลือกองค์กรก่อน");
    if (!name.trim()) return alert("กรุณากรอกชื่อโครงการ");

    const latitude  = lat ? Number(lat) : null;
    const longitude = lng ? Number(lng) : null;
    if (lat && isNaN(latitude!))  return alert("ละติจูดไม่ถูกต้อง");
    if (lng && isNaN(longitude!)) return alert("ลองจิจูดไม่ถูกต้อง");

    const rawPayload: Record<string, any> = {
      org_id: orgId,
      name: name.trim(),
      code: code || null,
      kind,               // will be mapped to type if necessary
      project_kind: kind,  // keep original in case schema uses this
      address: address || null,
      latitude,
      longitude,
      // placeholders for optional fields if form extended later
      status: 'planned',
    };
    const payload = pickKnownProjectColumns(rawPayload);

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert(payload)
        .select('id, org_id')
        .single();
      if (error) {
        console.error('Project insert payload keys:', Object.keys(payload));
        showPgErrorToast(error, (m) => alert(m), { entity: 'โครงการ', labels: { code: 'รหัสโครงการ', type: 'ประเภท' } });
        return;
      }
      const newId = data?.id;
      if (newId) {
        await afterProjectChange(orgId);
        alert('สร้างโครงการสำเร็จ');
        router.replace(`/projects/${newId}?created=1`);
      } else {
        alert('สร้างโครงการสำเร็จ (ไม่พบ ID)');
      }
    } finally {
      setSaving(false);
      // reset some fields but keep org selection
      setName(''); setCode(''); setAddress(''); setLat(''); setLng('');
    }
  };

  return (
    <Card title="🏗️ สร้างโครงการ">
      <form className="space-y-3" onSubmit={submit}>
        <Field label="เลือกองค์กร *">
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </Field>

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

        <Field label="ประเภทโครงการ">
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={kind}
            onChange={(e) => setKind(e.target.value as any)}
          >
            <option value="raw_land">ที่ดินเปล่า</option>
            <option value="housing">หมู่บ้าน/ที่อยู่อาศัย</option>
            <option value="condo">คอนโด</option>
            <option value="office">สำนักงาน</option>
            <option value="warehouse">คลังสินค้า</option>
            <option value="mixed_use">ผสมผสาน</option>
          </select>
        </Field>

        <Field label="ที่อยู่">
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="ละติจูด">
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="13.756331"
            />
          </Field>
          <Field label="ลองจิจูด">
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="100.501762"
            />
          </Field>
        </div>

        {/* ตัวเลือกพิกัดบนแผนที่ */}
        <div className="rounded-lg border">
          <MapPicker
            value={mapValue}
            onChange={(newLat: number, newLng: number) => {
              setLat(newLat.toFixed(6));
              setLng(newLng.toFixed(6));
            }}
            height={320}
          />
          <div className="px-3 py-2 text-xs text-gray-600 bg-white/80">
            เคล็ดลับ: คลิกบนแผนที่เพื่อเลือกพิกัด หรือจับ Marker ลากเพื่อปรับละเอียด
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-black text-white px-4 py-2 hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "สร้างโครงการ"}
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return alert("เลือกองค์กรก่อน");
    if (!projectId) return alert("เลือกโครงการก่อน");
    if (!name.trim()) return alert("กรุณากรอกชื่อสาขา/ที่ดิน");

    setSaving(true);
    const { error } = await supabase.from("sites").insert({
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
    });
    setSaving(false);

    if (error) {
      alert("สร้างสาขา/ที่ดินไม่สำเร็จ: " + error.message);
      return;
    }

    alert("สร้างสาขา/ที่ดินสำเร็จ");
    setName(""); setCode(""); setDeed(""); setSize(""); setProvince(""); setAddress(""); setLat(""); setLng("");
  };

  return (
    <Card title="🏢 สร้างสาขา/ที่ดิน (Site)">
      <form className="space-y-3" onSubmit={submit}>
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return alert("เลือกองค์กรก่อน");
    if (!projectId) return alert("เลือกโครงการก่อน");
    if (!siteId) return alert("เลือกสาขา/ที่ดินก่อน");
    if (!name.trim()) return alert("กรุณากรอกชื่ออาคาร");

    setSaving(true);
    const { error } = await supabase.from("buildings").insert({
      org_id: orgId,
      project_id: projectId,
      site_id: siteId,
      name: name.trim(),
      code: code || null,
    });
    setSaving(false);

    if (error) {
      alert("สร้างอาคารไม่สำเร็จ: " + error.message);
      return;
    }

    alert("สร้างอาคารสำเร็จ");
    setName(""); setCode("");
  };

  return (
    <Card title="🏗️ สร้างอาคาร (Building)">
      <form className="space-y-3" onSubmit={submit}>
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return alert("เลือกองค์กรก่อน");
    if (!projectId) return alert("เลือกโครงการก่อน");
    if (!siteId) return alert("เลือกสาขา/ที่ดินก่อน");
    if (!buildingId) return alert("เลือกอาคารก่อน");
    if (!floorNo.trim()) return alert("กรุณากรอกชั้น");

    setSaving(true);
    const { error } = await supabase.from("floors").insert({
      org_id: orgId,
      project_id: projectId,
      site_id: siteId,
      building_id: buildingId,
      floor_no: floorNo.trim(),
    });
    setSaving(false);

    if (error) {
      alert("สร้างชั้นไม่สำเร็จ: " + error.message);
      return;
    }

    alert("สร้างชั้นสำเร็จ");
    setFloorNo("");
  };

  return (
    <Card title="🏠 สร้างชั้น (Floor)">
      <form className="space-y-3" onSubmit={submit}>
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return alert("เลือกองค์กรก่อน");
    if (!projectId) return alert("เลือกโครงการก่อน");
    if (!siteId) return alert("เลือกสาขา/ที่ดินก่อน");
    if (!buildingId) return alert("เลือกอาคารก่อน");
    if (!floorId) return alert("เลือกชั้นก่อน");
    if (!name.trim()) return alert("กรุณากรอกชื่อห้อง/ยูนิต");

    setSaving(true);
    const { error } = await supabase.from("units").insert({
      org_id: orgId,
      project_id: projectId,
      site_id: siteId,
      building_id: buildingId,
      floor_id: floorId,
      name: name.trim(),
      code: code || null,
    });
    setSaving(false);

    if (error) {
      alert("สร้างห้อง/ยูนิตไม่สำเร็จ: " + error.message);
      return;
    }

    alert("สร้างห้อง/ยูนิตสำเร็จ");
    setName(""); setCode("");
  };

  return (
    <Card title="🚪 สร้างห้อง/ยูนิต (Unit)">
      <form className="space-y-3" onSubmit={submit}>
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return alert("เลือกองค์กรก่อน");
    if (!projectId) return alert("เลือกโครงการก่อน");
    if (!siteId) return alert("เลือกสาขา/ที่ดินก่อน");
    if (!buildingId) return alert("เลือกอาคารก่อน");
    if (!floorId) return alert("เลือกชั้นก่อน");
    if (!name.trim()) return alert("กรุณากรอกชื่อสินทรัพย์");

    setSaving(true);
    const { error } = await supabase.from("assets").insert({
      org_id: orgId,
      project_id: projectId,
      site_id: siteId,
      building_id: buildingId,
      floor_id: floorId,
      unit_id: unitId || null,
      name: name.trim(),
      brand: brand || null,
      model: model || null,
      serial_number: serialNumber || null,
    });
    setSaving(false);

    if (error) {
      alert("สร้างสินทรัพย์ไม่สำเร็จ: " + error.message);
      return;
    }

    alert("สร้างสินทรัพย์สำเร็จ");
    setName(""); setBrand(""); setModel(""); setSerialNumber(""); setUnitId("");
  };

  return (
    <Card title="📦 สร้างสินทรัพย์ (Asset)">
      <form className="space-y-3" onSubmit={submit}>
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
