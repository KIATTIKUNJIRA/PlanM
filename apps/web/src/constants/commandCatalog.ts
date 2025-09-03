export type Role = 'member' | 'admin' | 'owner';
export type Status = 'done' | 'wip' | 'todo';

export type CommandItem = {
  id: string;
  label: string;
  route?: string;
  desc?: string;
  icon?: string; // ชื่อไอคอนจาก lucide-react เช่น "Home", "FolderKanban"
  importance?: 'primary' | 'secondary' | 'tertiary';
  roles?: Role[];      // ถ้าไม่ใส่ = ทุกบทบาทเห็นได้
  status?: Status;     // สำหรับเช็คลิสต์แผนงาน
  children?: CommandItem[];
};

// หมวดหมู่ระดับบน = section แสดงใน TOC
export const COMMAND_CATALOG: CommandItem[] = [
  { id: 'home', label: 'Home Dashboard', route: '/home', icon: 'Home', importance: 'primary', status: 'done' },
  {
    id: 'projects', label: 'Projects', icon: 'FolderKanban', importance: 'primary',
    children: [
      { id: 'projects-new', label: 'Create Project', route: '/projects/new', status: 'done' },
      { id: 'projects-list', label: 'Project List', route: '/projects', status: 'wip' },
      { id: 'projects-detail', label: 'Project Detail', route: '/projects/[id]', desc: 'ตัวอย่าง route ไดนามิก', status: 'wip' },
      { id: 'projects-edit', label: 'Update Project', route: '/projects/[id]/edit', importance: 'secondary', status: 'todo' },
    ]
  },
  { id: 'map', label: 'Map', icon: 'Map', importance: 'primary', children: [
      { id: 'map-overview', label: 'All Projects Map', route: '/map', status: 'todo' },
    ]
  },
  {
    id: 'org', label: 'Organization', icon: 'Building2', importance: 'primary',
    children: [
      { id: 'org-switch', label: 'Switch Organization', desc: 'อยู่ที่ header', status: 'done' },
      { id: 'org-members', label: 'Manage Members', route: '/org/members', roles: ['admin','owner'], status: 'todo' },
      { id: 'org-invite', label: 'Invite Member', route: '/org/invite', roles: ['admin','owner'], status: 'todo' },
    ]
  },
  {
    id: 'admin', label: 'Admin / Diagnostics', icon: 'Activity', roles: ['admin','owner'],
    children: [
  { id: 'db-health', label: 'DB Health', route: '/admin/db-health', status: 'done' },
  { id: 'open-health-drawer', label: 'เปิดสถานะระบบ', desc: 'Open system health drawer (no navigation)', status: 'done' },
    ]
  },
  {
    id: 'account', label: 'Account', icon: 'User',
    children: [
      { id: 'login', label: 'Login', route: '/login', status: 'done' },
      { id: 'profile', label: 'Profile', route: '/account', status: 'todo' },
    ]
  },
];
