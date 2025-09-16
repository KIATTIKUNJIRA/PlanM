import React, { PropsWithChildren, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import { Home, FileText, Settings } from "lucide-react";

type Props = {
  title?: string;
  children?: React.ReactNode;
};

export default function DashboardLayout({ title, children }: PropsWithChildren<Props>) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email?: string | null } | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
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
    load();
    return () => { mounted = false; };
  }, []);

  async function signOut() {
    const maybeSignOut = (supabase as any).auth?.signOut;
    try {
      if (maybeSignOut) await (supabase as any).auth.signOut();
      else if ((supabase as any).auth?.sign_out) await (supabase as any).auth.sign_out();
      router.push("/");
    } catch (err) {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar (slide-over) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative flex w-64 flex-col bg-white pb-4">
            <div className="flex items-center justify-between p-4">
              <div className="font-semibold">PlanM</div>
              <button onClick={() => setMobileOpen(false)} className="text-gray-600">✕</button>
            </div>
            <nav className="px-2">
              <Link href="/" className="block px-3 py-2 rounded hover:bg-gray-100">หน้าแรก</Link>
              <Link href="/projects" className="block px-3 py-2 rounded hover:bg-gray-100">โครงการ</Link>
              <Link href="/settings" className="block px-3 py-2 rounded hover:bg-gray-100">ตั้งค่า</Link>
            </nav>
            <div className="mt-auto px-4 pt-4 border-t">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">U</div>
                <div>
                  <div className="text-sm">{currentUser?.email ?? 'ผู้ใช้'}</div>
                  <button onClick={signOut} className="text-sm text-red-600">ออกจากระบบ</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Static sidebar for desktop */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r">
          <div className="flex h-16 items-center px-4 font-semibold">PlanM</div>
          <nav className="flex-1 px-2 py-4 overflow-y-auto">
            <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100">
              <span className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center"><Home size={16} /></span>
              <span className="ml-2">หน้าแรก</span>
            </Link>
            <Link href="/projects" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100">
              <span className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center"><FileText size={16} /></span>
              <span className="ml-2">โครงการ</span>
            </Link>
            <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100">
              <span className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center"><Settings size={16} /></span>
              <span className="ml-2">ตั้งค่า</span>
            </Link>
          </nav>

          <div className="px-4 py-4 border-t">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">U</div>
              <div className="flex-1">
                <div className="text-sm">{currentUser?.email ?? 'ผู้ใช้'}</div>
                <button onClick={signOut} className="text-sm text-red-600">ออกจากระบบ</button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex flex-1 flex-col md:pl-64">
          <header className="sticky top-0 z-10 bg-white border-b">
            <div className="mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex h-14 items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded hover:bg-gray-100">☰</button>
                  {title ? <h1 className="text-lg font-semibold">{title}</h1> : null}
                </div>

                <div className="flex items-center gap-3">
                  {/* placeholder for actions */}
                </div>
              </div>
            </div>
          </header>

          <main className="px-4 sm:px-6 lg:px-8 py-4">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
