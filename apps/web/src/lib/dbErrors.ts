// Generic Postgres/Supabase error -> user friendly Thai message utilities
// Works with supabase-js v2 PostgrestError shape

export type FieldLabels = Record<string, string>;

type PgErr = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

// Extract column list from unique violation detail: Key (col1, col2)=(...) already exists.
const DUP_RE = /Key \((.+)\)=\(.+\) already exists/;

function prettyColumns(cols: string, labels?: FieldLabels) {
  const list = cols.split(",").map(s => s.trim());
  const mapped = list.map(c => labels?.[c] ?? c);
  // If at least one column was translated (label differs) and there are untranslated technical columns
  // prefer showing only the translated ones (common case: (org_id, code) => show just รหัสโครงการ)
  const translatedOnly = mapped.filter(m => !list.includes(m));
  if (translatedOnly.length === 1) return translatedOnly[0];
  if (translatedOnly.length > 1) return translatedOnly.join(" + ");
  return mapped.join(" + ");
}

export function friendlyDbMessage(
  err: unknown,
  opts?: { entity?: string; labels?: FieldLabels }
): string {
  const e = (err as PgErr) ?? {};
  const entity = opts?.entity ?? "ข้อมูล";
  const L = opts?.labels;

  switch (e.code) {
    case "23505": { // unique_violation
      const m = (e.details ?? "").match(DUP_RE);
      if (m) {
        const cols = m[1];
        if (/(^|\s)org_id\s*,\s*code/.test(cols) && L?.code) {
          return `${L.code}ซ้ำในองค์กร`;
        }
        return `${prettyColumns(cols, L)}ซ้ำในระบบ`;
      }
      return `ข้อมูลซ้ำ (${entity})`;
    }
    case "22P02": { // invalid_text_representation (e.g. enum)
      if ((e.message ?? "").includes("enum project_type")) {
        return L?.["type"] ? `${L["type"]}ไม่ถูกต้อง` : "ค่าประเภทไม่ถูกต้อง";
      }
      return "รูปแบบข้อมูลไม่ถูกต้อง";
    }
    case "23503": // foreign_key_violation
      return "อ้างอิงข้อมูลที่ไม่มีอยู่ (สิทธิ์/ความสัมพันธ์ไม่ถูกต้อง)";
    case "23514": { // check_violation
      if ((e.message ?? "").includes("projects_lat_range")) {
        return L?.["latitude"] ? `${L["latitude"]}อยู่นอกช่วง (-90..90)` : "Latitude อยู่นอกช่วง (-90..90)";
      }
      if ((e.message ?? "").includes("projects_lon_range")) {
        return L?.["longitude"] ? `${L["longitude"]}อยู่นอกช่วง (-180..180)` : "Longitude อยู่นอกช่วง (-180..180)";
      }
      return "ข้อมูลไม่ผ่านเงื่อนไขที่กำหนด";
    }
    case "23502": // not_null_violation
      return "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน";
    case "42501":
    case "PGRST301":
    case "PGRST302":
      return "คุณไม่มีสิทธิ์ทำรายการนี้";
    default:
      return e.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
  }
}

// Convenience helper for forms: translate and toast the message. Returns true if error existed.
export function showPgErrorToast(
  err: unknown,
  toastFn: (msg: string) => void,
  opts?: { entity?: string; labels?: FieldLabels }
): boolean {
  if (!err) return false;
  toastFn(friendlyDbMessage(err, opts));
  return true;
}
