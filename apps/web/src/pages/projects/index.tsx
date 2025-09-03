import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { typeToLabel } from "@/constants/projectTypes";

type ProjectRow = {
  id: string;
  name: string;
  code: string | null;
  type: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

export default function ProjectsListPage() {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // แสดงเฉพาะโปรเจกต์ที่ user เป็น member ของ org (RLS จะกรองให้อัตโนมัติถ้าตั้งไว้)
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, code, type, address, latitude, longitude, created_at")
        .order("created_at", { ascending: false });
      if (!error) setRows(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">โครงการของฉัน</h1>
        <Link
          href="/create"
          className="inline-flex items-center rounded-lg bg-black text-white px-3 py-2 text-sm hover:opacity-90"
        >
          สร้างใหม่
        </Link>
      </div>
      {loading ? (
        <p>กำลังโหลด...</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-600">ยังไม่มีโครงการ</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((p) => (
            <li key={p.id} className="border rounded-lg px-4 py-3 hover:bg-gray-50">
              <Link href={`/projects/${p.id}`} className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-gray-500">{typeToLabel(p.type || undefined)}</span>
                {p.code ? <span className="text-gray-500">— {p.code}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}