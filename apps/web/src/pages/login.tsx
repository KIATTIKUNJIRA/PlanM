import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const signIn = async () => {
    setLoading(true); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setMsg(error.message);
    router.replace("/");
  };

  const signUp = async () => {
    setLoading(true); setMsg(null);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/auth/reset` },
    });
    setLoading(false);
    if (error) return setMsg(error.message);
    setMsg("ลงทะเบียนสำเร็จ โปรดตรวจอีเมลเพื่อยืนยัน (ถ้าระบบเปิดยืนยันอีเมลไว้)");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setMsg("กรอกอีเมลและรหัสผ่าน");
    if (mode === "signin") await signIn(); else await signUp();
  };

  const requestReset = async () => {
    if (!email) return setMsg("กรอกอีเมลก่อน");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    if (error) setMsg(error.message);
    else setMsg("ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-4">เข้าสู่ระบบ</h1>

        <div className="mb-4 flex gap-2">
          <button
            className={`px-3 py-1 rounded border ${mode==="signin"?"bg-black text-white":"bg-white"}`}
            onClick={() => setMode("signin")}
            type="button"
          >Sign In</button>
          <button
            className={`px-3 py-1 rounded border ${mode==="signup"?"bg-black text-white":"bg-white"}`}
            onClick={() => setMode("signup")}
            type="button"
          >Sign Up</button>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <label className="block">
            <span className="text-sm text-gray-600">อีเมล</span>
            <input className="mt-1 w-full rounded-lg border px-3 py-2"
              type="email" value={email} onChange={e=>setEmail(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">รหัสผ่าน</span>
            <input className="mt-1 w-full rounded-lg border px-3 py-2"
              type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          </label>

          {msg && <p className="text-sm text-amber-700">{msg}</p>}

          <button disabled={loading}
            className="w-full rounded-lg bg-black text-white px-4 py-2 hover:opacity-90 disabled:opacity-50">
            {loading ? "กำลังดำเนินการ..." : (mode==="signin" ? "เข้าสู่ระบบ" : "สมัครสมาชิก")}
          </button>
        </form>

        <button onClick={requestReset} className="mt-4 text-sm underline" type="button">
          ลืมรหัสผ่าน?
        </button>
      </div>
    </div>
  );
}
