import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

// Landing redirect: decide based on current auth session (client-side)
export default function IndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (data.user) router.replace('/home');
      else router.replace('/login');
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
      กำลังตรวจสอบสถานะผู้ใช้...
    </div>
  );
}