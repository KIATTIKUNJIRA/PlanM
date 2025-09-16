export interface ParsedLatLng { lat: number | null; lng: number | null; errors: string[]; }

// Parse and validate latitude/longitude strings. Blank => null. Returns errors (Thai) if invalid range/format.
export function parseLatLng(latStr: string, lngStr: string): ParsedLatLng {
  const errors: string[] = [];
  const trimLat = latStr.trim();
  const trimLng = lngStr.trim();
  let lat: number | null = null;
  let lng: number | null = null;
  if (trimLat !== '') {
    const v = Number(trimLat);
    if (Number.isNaN(v)) errors.push('ละติจูดไม่ใช่ตัวเลข');
    else if (v < -90 || v > 90) errors.push('ละติจูดต้องอยู่ระหว่าง -90 ถึง 90');
    else lat = v;
  }
  if (trimLng !== '') {
    const v = Number(trimLng);
    if (Number.isNaN(v)) errors.push('ลองจิจูดไม่ใช่ตัวเลข');
    else if (v < -180 || v > 180) errors.push('ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180');
    else lng = v;
  }
  return { lat, lng, errors };
}
