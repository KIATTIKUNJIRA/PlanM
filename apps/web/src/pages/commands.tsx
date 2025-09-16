import React, { useEffect, useMemo, useState } from 'react';
import { COMMAND_CATALOG, CommandItem, Role, Status } from '@/constants/commandCatalog';
import { canAccess } from '@/lib/access';
import { Lock } from 'lucide-react';
import { useRouter } from 'next/router';
import useOrgs from '@/hooks/useOrgs';
import { useOrgRoles } from '@/hooks/useOrgRoles';

interface FlatItem extends CommandItem { sectionId: string }

type StatusState = Record<string, Status>;

// Local hook (scoped per org) handling persistence of command statuses.
function useCommandStatuses(orgId?: string) {
  const key = `commandChecklist.v1${orgId ? `.org.${orgId}` : ''}`;
  const read = () => {
    if (typeof window === 'undefined') return {} as StatusState;
    try { return JSON.parse(localStorage.getItem(key) || '{}') as StatusState; }
    catch { return {} as StatusState; }
  };
  const [statuses, setStatuses] = useState<StatusState>(read);

  // Reload when org changes (key changes)
  useEffect(() => { setStatuses(read()); }, [key]);

  const write = (next: StatusState) => {
    setStatuses(next);
    if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(next));
  };

  const cycle = (id: string) => {
    setStatuses(prev => {
      const current = prev[id] || 'todo';
      const next: Status = current === 'todo' ? 'wip' : current === 'wip' ? 'done' : 'todo';
      const merged = { ...prev, [id]: next };
      if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(merged));
      return merged;
    });
  };

  const clearAll = () => write({});
  const markAll = (ids: string[], status: Status = 'done') => write(Object.fromEntries(ids.map(i => [i, status])) as StatusState);

  return { statuses, cycle, clearAll, markAll, get: (id: string) => (statuses[id] || 'todo') as Status };
}

function flatten(commands: CommandItem[]): FlatItem[] {
  const out: FlatItem[] = [];
  for (const c of commands) {
    if (c.children && c.children.length) {
      for (const child of c.children) out.push({ ...child, sectionId: c.id });
    } else {
      out.push({ ...c, sectionId: c.id });
    }
  }
  return out;
}

export default function CommandsChecklistPage() {
  const router = useRouter();
  const { orgs, loading: orgLoading } = useOrgs();
  const [orgId, setOrgId] = useState<string>(() => (orgs && orgs.length ? orgs[0].id : ''));
  useEffect(() => { if (!orgLoading && orgs.length && !orgId) setOrgId(orgs[0].id); }, [orgLoading, orgs, orgId]);
  const { role } = useOrgRoles(orgId);

  const { statuses, cycle, markAll, clearAll, get } = useCommandStatuses(orgId);

  // UI filters
  const [search, setSearch] = useState('');
  const [showStatus, setShowStatus] = useState<Status | 'all'>('all');
  const [showRoleRestricted, setShowRoleRestricted] = useState<'all' | 'restricted' | 'public'>('all');

  const toggleStatus = cycle;

  const flat = useMemo(() => flatten(COMMAND_CATALOG), []);

  // Show all items; access controls only disable interaction.
  const visibleByRole = (_item: CommandItem): boolean => true;

  const filtered = flat.filter(it => {
    if (!visibleByRole(it)) return false;
  const s = (statuses[it.id] || it.status || 'todo') as Status;
    if (showStatus !== 'all' && s !== showStatus) return false;
    if (showRoleRestricted === 'restricted' && !(it.roles && it.roles.length)) return false;
    if (showRoleRestricted === 'public' && it.roles && it.roles.length) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(it.label.toLowerCase().includes(q) || (it.desc || '').toLowerCase().includes(q) || (it.route || '').toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const grouped = useMemo(() => {
    const map: Record<string, FlatItem[]> = {};
    for (const it of filtered) {
      (map[it.sectionId] = map[it.sectionId] || []).push(it);
    }
    return map;
  }, [filtered]);

  const sectionMeta = useMemo(() => {
    const m: Record<string, CommandItem> = {};
    for (const sec of COMMAND_CATALOG) m[sec.id] = sec;
    return m;
  }, []);

  const statusColor = (s: Status) => s === 'done' ? 'bg-green-100 text-green-700' : s === 'wip' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600';

  return (
    <div className="max-w-7xl mx-auto p-6 flex flex-col lg:flex-row gap-6">
      <aside className="w-full lg:w-64 lg:sticky top-4 h-fit bg-white border rounded-lg p-4 text-base space-y-4">
        <h2 className="font-semibold text-gray-800 text-2xl tracking-tight">Command Catalog</h2>
        <div className="space-y-2">
          <input
            placeholder="ค้นหา..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border rounded px-3 py-2 text-base"
          />
          <select value={showStatus} onChange={e => setShowStatus(e.target.value as any)} className="w-full border rounded px-3 py-2 text-base">
            <option value="all">ทุกสถานะ</option>
            <option value="todo">TODO</option>
            <option value="wip">WIP</option>
            <option value="done">DONE</option>
          </select>
          <select value={showRoleRestricted} onChange={e => setShowRoleRestricted(e.target.value as any)} className="w-full border rounded px-3 py-2 text-base">
            <option value="all">บทบาททั้งหมด</option>
            <option value="public">เฉพาะ public</option>
            <option value="restricted">เฉพาะจำกัดบทบาท</option>
          </select>
          <div className="text-xs text-gray-500 leading-relaxed">
            คลิกที่สถานะของแต่ละรายการเพื่อวน: TODO → WIP → DONE
          </div>
        </div>
        <div className="border-t pt-3 mt-3 space-y-2">
      {COMMAND_CATALOG.map(sec => (
            <div key={sec.id} className="space-y-1">
        <a href={`#section-${sec.id}`} className="block font-medium text-gray-700 hover:text-black text-base">{sec.label}</a>
              <div className="flex flex-wrap gap-1">
                {(sec.children || []).slice(0,6).map(ch => {
                  const st = (statuses[ch.id] || ch.status || 'todo') as Status;
                  return <span key={ch.id} className={`px-2 py-0.5 rounded text-xs ${statusColor(st)}`}>{ch.label}</span>;
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="pt-4 space-y-2 border-t mt-4">
          <button onClick={() => markAll(flat.map(f => f.id), 'done')} className="w-full text-sm px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 font-medium">Mark All Done</button>
          <button onClick={() => clearAll()} className="w-full text-sm px-3 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium">Clear All</button>
        </div>
      </aside>
      <main className="flex-1 space-y-10">
        {Object.keys(grouped).length === 0 && (
          <p className="text-base text-gray-500">ไม่พบรายการที่ตรงเงื่อนไข</p>
        )}
        {Object.entries(grouped).map(([secId, items]) => {
          const secMeta = sectionMeta[secId];
          return (
            <section key={secId} id={`section-${secId}`} className="space-y-4 scroll-mt-24">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold tracking-tight">{secMeta?.label || secId}</h3>
                {secMeta?.importance === 'primary' && <span className="text-sm px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-700">Primary</span>}
              </div>
              <div className="border rounded-lg divide-y bg-white">
                {items.map(it => {
                  const st = (statuses[it.id] || it.status || 'todo') as Status;
                  const restricted = it.roles && it.roles.length;
                  const userRoles = role ? [role] : [];
                  const locked = restricted && !canAccess(it.roles, userRoles);
                  const needsId = it.route?.includes('[id]');
                  const disabled = locked || !it.route || needsId;
                  return (
                    <div key={it.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-base truncate" title={it.label}>{it.label}</span>
                          {restricted && <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-600">{it.roles?.join('/')}</span>}
                        </div>
                        {it.desc && <p className="text-sm text-gray-600 mt-1 leading-snug">{it.desc}</p>}
                        {it.route && <a className="text-sm text-blue-600 hover:underline" href={it.route}>{it.route}</a>}
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <button
                          onClick={() => toggleStatus(it.id)}
                          className={`text-sm font-medium px-3 py-1.5 rounded-md ${statusColor(st)} hover:opacity-90`}
                          title="คลิกเพื่อเปลี่ยนสถานะ"
                        >{st.toUpperCase()}</button>
                        <button
                          type="button"
                          disabled={disabled}
                          aria-disabled={disabled}
                          onClick={() => { if (!disabled && it.route) router.push(it.route); }}
                          title={locked ? 'ต้องเป็น admin/owner' : needsId ? 'ต้องระบุไอดีในที่ใช้งานจริง' : !it.route ? 'ยังไม่มีเส้นทาง (route)' : 'ไปหน้าใช้งาน'}
                          className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 border text-sm font-medium transition bg-white hover:bg-gray-50 disabled:hover:bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >ไปหน้าใช้งาน {locked && <Lock className="h-3.5 w-3.5" />}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
