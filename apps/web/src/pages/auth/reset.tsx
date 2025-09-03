import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [ok, setOk] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // เมื่อมาถึงหน้านี้ด้วยลิงก์รีเซ็ต Supabase จะถือว่า auth อยู่ในสถานะ recovery อยู่แล้ว
    // เราแค่รับรหัสใหม่ไปอัปเดต
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return setMsg("กรอกรหัสผ่านใหม่");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setMsg(error.message);
    setOk(true);
    setMsg("ตั้งรหัสผ่านใหม่สำเร็จ");
    setTimeout(()=>router.replace("/login"), 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-4">ตั้งรหัสผ่านใหม่</h1>
        <form className="space-y-3" onSubmit={submit}>
          <input className="w-full rounded-lg border px-3 py-2"
            type="password" placeholder="รหัสผ่านใหม่" value={password}
            onChange={e=>setPassword(e.target.value)} />
          {msg && <p className={`text-sm ${ok?"text-green-700":"text-amber-700"}`}>{msg}</p>}
          <button className="w-full rounded-lg bg-black text-white px-4 py-2 hover:opacity-90">ยืนยัน</button>
        </form>
      </div>
    </div>
  );
}
