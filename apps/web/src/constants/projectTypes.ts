export const PROJECT_TYPE_OPTIONS = [
  { value: 'house',      label: 'บ้าน/ที่อยู่อาศัย' },
  { value: 'condo',      label: 'คอนโด' },
  { value: 'office',     label: 'สำนักงาน' },
  { value: 'factory',    label: 'โรงงาน' },
  { value: 'warehouse',  label: 'โกดัง' },
  { value: 'mixed_use',  label: 'ผสมผสาน' },
] as const;

export type ProjectTypeCode = typeof PROJECT_TYPE_OPTIONS[number]['value'];

export const typeToLabel = (t?: string | null) =>
  PROJECT_TYPE_OPTIONS.find(o => o.value === t)?.label ?? (t ?? '-');
