import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";

export default function Logout() {
  const router = useRouter();
  useEffect(() => {
    (async () => { await supabase.auth.signOut(); router.replace("/login"); })();
  }, [router]);
  return null;
}
