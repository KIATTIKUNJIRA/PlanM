// Centralized Postgres -> user friendly Thai messages for project operations
export type PgErr = { code?: string | null; message: string; details?: string | null; hint?: string | null };

export function friendlyProjectError(err: PgErr): string {
  switch (err.code) {
    case '23505': // unique violation
      if (err.message?.includes('projects_org_id_code')) return 'รหัสโครงการซ้ำในองค์กร';
      return 'ข้อมูลซ้ำ';
    case '23514': // check constraint violation
      if (err.message?.includes('projects_lat_range')) return 'ละติจูดต้องอยู่ระหว่าง -90 ถึง 90';
      if (err.message?.includes('projects_lon_range')) return 'ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180';
      return 'ข้อมูลไม่ผ่านเงื่อนไข';
    case '22P02': // invalid enum / text representation
      return 'ประเภทโครงการไม่ถูกต้อง';
    case '23503': // foreign key
      return 'องค์กรที่เลือกไม่ถูกต้องหรือถูกลบไปแล้ว';
    case '42501': // insufficient privilege / RLS blocked
      return 'คุณไม่มีสิทธิ์ทำรายการนี้';
    default:
      return err.message || 'เกิดข้อผิดพลาด';
  }
}
