import { useEffect, useState } from 'react';
import { THAI_PROVINCES } from '@/constants/thaiProvinces';

// ตามคำขอ: ใช้ลิงก์นี้เพียงลิงก์เดียวในการดึงข้อมูลจังหวัด
// https://codesandbox.io/p/sandbox/thailand-province-demo-api-k3st7
// (ถ้าลิงก์นี้ไม่ให้ JSON จริง hook จะ fallback เป็นค่าคงที่ THAI_PROVINCES เหมือนเดิม)
const REMOTE_PROVINCE_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_PROVINCES_URL) 
  || 'https://codesandbox.io/p/sandbox/thailand-province-demo-api-k3st7';

export function useThaiProvinces() {
  const [provinces, setProvinces] = useState<string[]>(THAI_PROVINCES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(REMOTE_PROVINCE_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        let data: any;
        const ct = res.headers.get('content-type') || '';
        if (/json/i.test(ct)) data = await res.json();
        else {
          // พยายาม parse JSON ถึงแม้ content-type จะไม่ใช่ application/json
            try { data = await res.json(); }
            catch { throw new Error('Response not JSON'); }
        }
        // Flexible shape: either array of strings or object with provinces field.
        let list: string[] | undefined;
        if (Array.isArray(data)) list = data as string[];
        else if (data && Array.isArray((data as any).provinces)) list = (data as any).provinces;
        if (!list || !list.length) throw new Error('Invalid province payload');
        // Basic normalization: trim & dedupe while preserving order.
        const seen = new Set<string>();
        const cleaned: string[] = [];
        list.forEach(p => {
          const name = (p || '').toString().trim();
            if (name && !seen.has(name)) { seen.add(name); cleaned.push(name); }
        });
        if (!cancelled && cleaned.length) {
          setProvinces(cleaned);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'fetch failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { provinces, loading, error };
}

export default useThaiProvinces;
