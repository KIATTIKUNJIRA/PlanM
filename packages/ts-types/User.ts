export interface User {
  id: string; // UUID from Supabase Auth
  email: string;
  full_name?: string;
  role: 'ADMIN' | 'AREA_MANAGER' | 'STORE_MANAGER' | 'TECHNICIAN';
}