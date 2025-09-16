import { useEffect, useState } from 'react';
import { extendThaiLocations, THAI_LOCATION_ENTRIES, ThaiLocationEntry } from '@/constants/thaiLocations';

// Loader: first try local generated file, fallback to remote GitHub raw geography.json
const LOCAL_URL = '/data/thaiLocations.full.json';
const REMOTE_URL = 'https://raw.githubusercontent.com/thailand-geography-data/thailand-geography-json/main/src/geography.json';

export function useThaiGeo(auto = false) {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (loaded || loading) return;
    setLoading(true);
    const tryUrls = [LOCAL_URL, REMOTE_URL];
    for (const url of tryUrls) {
      try {
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) throw new Error(res.status + ' ' + url);
        const data = await res.json();
        let list: ThaiLocationEntry[] = [];
        if (Array.isArray(data) && data.length && data[0].province) {
          // already compact
          list = data as ThaiLocationEntry[];
        } else if (Array.isArray(data) && data[0]?.provinceNameTh) {
          // full geography.json format
            list = data.map(r => ({
              province: r.provinceNameTh,
              district: r.districtNameTh,
              subdistrict: r.subdistrictNameTh,
              postal: String(r.postalCode || '')
            }));
        }
        if (list.length) {
          extendThaiLocations(list);
          setLoaded(true);
          setLoading(false);
          return;
        }
      } catch (e:any) {
        setError(e.message);
      }
    }
    setLoading(false);
  }

  useEffect(() => { if (auto) load(); }, [auto]);

  return { load, loaded, loading, error, entries: THAI_LOCATION_ENTRIES };
}

export function deriveDistricts(province: string) {
  return Array.from(new Set(THAI_LOCATION_ENTRIES.filter(e => e.province === province).map(e => e.district))).sort();
}
export function deriveSubdistricts(province: string, district: string) {
  return Array.from(new Set(THAI_LOCATION_ENTRIES.filter(e => e.province === province && e.district === district).map(e => e.subdistrict))).sort();
}
export function findPostal(province: string, district: string, subdistrict: string) {
  return THAI_LOCATION_ENTRIES.find(e => e.province === province && e.district === district && e.subdistrict === subdistrict)?.postal || '';
}

export default useThaiGeo;
