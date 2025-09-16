import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import { typeToLabel } from "@/constants/projectTypes";
import DashboardLayout from "@/components/DashboardLayout";
import { Pencil, Trash2 } from "lucide-react";

/* -------------------- Types -------------------- */
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

/* -------------------- Main Page -------------------- */
export default function ProjectsListPage() {
  /* ---------- State ---------- */
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1); // 1-based
  const [pageSize, setPageSize] = useState(100);
  const [total, setTotal] = useState(0);

  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const router = useRouter();
  const listRef = useRef<HTMLUListElement | null>(null);
  const [currentUser, setCurrentUser] = useState<{ email?: string | null } | null>(null);

  /* ---------- Derived Values ---------- */
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pageNumbers = useMemo(() => {
    const nums: (number | "…")[] = [];
    const maxButtons = 7;

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) nums.push(i);
    } else {
      const left = Math.max(1, page - 2);
      const right = Math.min(totalPages, page + 2);

      if (left > 1) {
        nums.push(1);
        if (left > 2) nums.push("…");
      }

      for (let i = left; i <= right; i++) nums.push(i);

      if (right < totalPages) {
        if (right < totalPages - 1) nums.push("…");
        nums.push(totalPages);
      }
    }
    return nums;
  }, [page, totalPages]);

  /* ---------- Data Fetch ---------- */
  const fetchPage = useCallback(async (pg: number, size: number, q = "") => {
    setLoading(true);
    setError(null);

    const from = (pg - 1) * size;
    const to = from + size - 1;

    let queryBuilder = supabase
      .from("projects")
      .select(
        "id, name, code, type, address, latitude, longitude, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (q.trim()) {
      const like = `%${q.trim().replace(/%/g, "\\%")}%`;
      queryBuilder = (queryBuilder as any).ilike("name", like);
    }

    const { data, error, count } = await queryBuilder;

    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows(data || []);
      setTotal(count || 0);
    }

    setLoading(false);
  }, []);

  const refresh = useCallback(() => fetchPage(page, pageSize, query), [fetchPage, page, pageSize, query]);

  /* ---------- Delete Handler ---------- */
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("ลบโครงการนี้?")) return;

    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      alert("ลบไม่สำเร็จ: " + error.message);
      return;
    }

    const newTotal = total - 1;
    const lastPage = Math.max(1, Math.ceil(newTotal / pageSize));

    if (page > lastPage) setPage(lastPage);
    else refresh();
  }, [page, pageSize, refresh, total]);

  /* ---------- Effects ---------- */
  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      try {
        const maybeGetUser = (supabase as any).auth?.getUser;
        if (maybeGetUser) {
          const { data } = await (supabase as any).auth.getUser();
          if (mounted) setCurrentUser(data?.user || null);
        } else if ((supabase as any).auth?.user) {
          const u = (supabase as any).auth.user();
          if (mounted) setCurrentUser(u || null);
        }
      } catch (err) {
        // ignore
      }
    }
    loadUser();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    fetchPage(page, pageSize, query);
  }, [page, pageSize, query, fetchPage]);

  // debounce query
  useEffect(() => {
    const t = setTimeout(() => setPage(1), 250);
    return () => clearTimeout(t);
  }, [query]);

  // adjust page when pageSize changes
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // close menu when clicking outside
  useEffect(() => {
    function onBody(e: MouseEvent) {
      if (menuOpen && listRef.current && !listRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", onBody);
    return () => document.removeEventListener("mousedown", onBody);
  }, [menuOpen]);

  /* ---------- Render ---------- */
  return (
    <DashboardLayout title="โครงการทั้งหมด">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1" />
          <Link href="/projects/new" className="rounded-lg bg-black text-white px-3 py-2 hover:opacity-90">สร้างใหม่</Link>
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาโครงการ..."
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200 w-full mb-4"
        />

        {/* Content area */}
        {loading ? (
          <p>กำลังโหลด...</p>
        ) : error ? (
          <p className="text-red-600">เกิดข้อผิดพลาด: {error}</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-600 text-center">ไม่พบข้อมูลโครงการ</p>
        ) : (
          <>
            <ul className="space-y-2 mb-4" ref={listRef}>
              {rows.map((p) => (
                <li key={p.id} className="border rounded-lg px-4 py-3 bg-white flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between relative">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 min-w-0">
                    <Link href={`/projects/${p.id}`} className="font-medium text-lg truncate max-w-[240px] sm:max-w-xs hover:underline">
                      {p.code || ""} - {p.name}
                    </Link>

                    {p.type && (
                      <span className="text-gray-500 whitespace-nowrap">{typeToLabel(p.type || undefined)}</span>
                    )}
                  </div>

                  <div className="flex gap-2 items-center shrink-0">
                    <Link href={`/projects/${p.id}?edit=1`} className="p-2 rounded border hover:bg-gray-100 flex items-center justify-center" aria-label="แก้ไข">
                      <Pencil size={16} />
                    </Link>
                    <button onClick={() => handleDelete(p.id)} className="p-2 rounded border text-red-600 hover:bg-red-50 flex items-center justify-center" aria-label="ลบ">
                      <Trash2 size={16} />
                    </button>
                  </div>

                </li>
              ))}
            </ul>

            {/* Pagination */}
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button className="px-3 py-1 rounded border disabled:opacity-40" disabled={!canPrev || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>ก่อนหน้า</button>

              {pageNumbers.map((n, i) => n === "…" ? (
                <span key={i} className="px-2 text-gray-400 select-none">…</span>
              ) : (
                <button key={i} onClick={() => setPage(n)} className={`min-w-[36px] h-9 px-3 rounded border ${n === page ? "bg-black text-white border-black" : "hover:bg-gray-50"}`} disabled={loading}>{n}</button>
              ))}

              <button className="px-3 py-1 rounded border disabled:opacity-40" disabled={!canNext || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>ถัดไป</button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
