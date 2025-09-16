import { useEffect, useState, useMemo } from 'react';

/*
 Hierarchical Thai administrative divisions (Province -> Amphure/District -> Tambon/Sub-district)
 Source dataset (requested):
   https://raw.githubusercontent.com/kongvut/thai-province-data/master/api_province_with_amphure_tambon.json
 Repository: https://github.com/kongvut/thai-province-data
*/

export interface Tambon {
  id: number;
  name_th: string;
  name_en: string;
  zip_code?: string | number | null;
  [k: string]: any;
}
export interface Amphure {
  id: number;
  name_th: string;
  name_en: string;
  tambon: Tambon[];
  [k: string]: any;
}
export interface ProvinceHier {
  id: number;
  name_th: string;
  name_en: string;
  amphure: Amphure[];
  [k: string]: any;
}

const DATA_URL = 'https://raw.githubusercontent.com/kongvut/thai-province-data/master/api_province_with_amphure_tambon.json';

export function useThaiProvinceHierarchy() {
  const [provinces, setProvinces] = useState<ProvinceHier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(DATA_URL, { cache: 'force-cache' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid data shape');
        if (!cancelled) setProvinces(data as ProvinceHier[]);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'fetch failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { provinces, loading, error };
}

export function useAmphures(provinces: ProvinceHier[], provinceId?: number) {
  return useMemo(() => {
    if (!provinceId) return [] as Amphure[];
    return provinces.find(p => p.id === provinceId)?.amphure || [];
  }, [provinces, provinceId]);
}

export function useTambons(amphures: Amphure[], amphureId?: number) {
  return useMemo(() => {
    if (!amphureId) return [] as Tambon[];
    return amphures.find(a => a.id === amphureId)?.tambon || [];
  }, [amphures, amphureId]);
}

export default useThaiProvinceHierarchy;
