// Thai hierarchical locations (scaffold). Fill full dataset via public JSON to avoid huge bundle.
// Structure: province (จังหวัด), district (อำเภอ/เขต), subdistrict (ตำบล/แขวง), postal code.

export interface ThaiLocationEntry {
	province: string;
	district: string;
	subdistrict: string;
	postal: string; // 5-digit TH postal code
}

// Minimal seed subset (replace / extend at runtime). Keep very small to reduce initial JS payload.
export const THAI_LOCATION_ENTRIES: ThaiLocationEntry[] = [
	{ province: 'กรุงเทพมหานคร', district: 'ปทุมวัน', subdistrict: 'ลุมพินี', postal: '10330' },
	{ province: 'กรุงเทพมหานคร', district: 'บางรัก', subdistrict: 'สีลม', postal: '10500' }
];

export function extendThaiLocations(extra: ThaiLocationEntry[]) {
	if (!Array.isArray(extra)) return;
	const key = (e: ThaiLocationEntry) => `${e.province}__${e.district}__${e.subdistrict}`;
	const existing = new Set(THAI_LOCATION_ENTRIES.map(key));
	for (const row of extra) {
		if (!row.province || !row.district || !row.subdistrict) continue;
		const k = key(row);
		if (!existing.has(k)) { THAI_LOCATION_ENTRIES.push(row); existing.add(k); }
	}
}

export function getDistrictsByProvince(province: string): string[] {
	return Array.from(new Set(THAI_LOCATION_ENTRIES.filter(e => e.province === province).map(e => e.district))).sort();
}
export function getSubdistricts(province: string, district: string): string[] {
	return Array.from(new Set(THAI_LOCATION_ENTRIES.filter(e => e.province === province && e.district === district).map(e => e.subdistrict))).sort();
}
export function getPostal(province: string, district: string, subdistrict: string): string | '' {
	const f = THAI_LOCATION_ENTRIES.find(e => e.province === province && e.district === district && e.subdistrict === subdistrict);
	return f?.postal || '';
}

// Helper to detect if dataset looks complete (rough heuristic ~ 7000+ rows)
export function isDatasetLikelyComplete() { return THAI_LOCATION_ENTRIES.length > 7000; }
