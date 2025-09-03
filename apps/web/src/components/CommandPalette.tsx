import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { COMMAND_CATALOG, CommandItem } from '@/constants/commandCatalog';
import { useHealth } from '@/hooks/useHealthMonitor';
import { useRouter } from 'next/router';
import { Search, X, Lock, ArrowRight, Shield, Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import useOrgs from '@/hooks/useOrgs';
import { useOrgRoles } from '@/hooks/useOrgRoles';

type PaletteEntry = {
  id: string;
  label: string;
  desc?: string;
  route?: string;
  roles?: CommandItem['roles'];
  importance?: CommandItem['importance'];
  status?: CommandItem['status'];
  section: string; // top-level section label
};

// Flatten source of truth
function flatten(): PaletteEntry[] {
  const out: PaletteEntry[] = [];
  for (const sec of COMMAND_CATALOG) {
    if (sec.children && sec.children.length) {
      for (const ch of sec.children) {
        out.push({ id: ch.id, label: ch.label, desc: ch.desc, route: ch.route, roles: ch.roles, importance: ch.importance, status: ch.status, section: sec.label });
      }
    } else {
      out.push({ id: sec.id, label: sec.label, desc: sec.desc, route: sec.route, roles: sec.roles, importance: sec.importance, status: sec.status, section: sec.label });
    }
  }
  return out;
}

// Context API
interface CommandPaletteContextValue {
  open: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
}
const CommandPaletteContext = createContext<CommandPaletteContextValue | undefined>(undefined);

export const useCommandPalette = () => {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  return ctx;
};

export const CommandPaletteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const openCommandPalette = useCallback(() => setOpen(true), []);
  const closeCommandPalette = useCallback(() => setOpen(false), []);
  const toggleCommandPalette = useCallback(() => setOpen(o => !o), []);

  // Global hotkey Ctrl/Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleCommandPalette]);

  return (
    <CommandPaletteContext.Provider value={{ open, openCommandPalette, closeCommandPalette, toggleCommandPalette }}>
      {children}
      <PaletteDialog open={open} onClose={closeCommandPalette} />
    </CommandPaletteContext.Provider>
  );
};

interface PaletteDialogProps { open: boolean; onClose(): void; }

export const PaletteDialog: React.FC<PaletteDialogProps> = ({ open, onClose }) => {
  const router = useRouter();
  const entries = useMemo(() => flatten(), []);
  const { setOpen: openHealth } = useHealth();
  const { orgs } = useOrgs();
  const orgId = orgs && orgs.length ? orgs[0].id : undefined; // assumption
  const { role } = useOrgRoles(orgId || '');
  const userRoles = role ? [role] : [];
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build fuse instance
  const fuse = useMemo(() => new Fuse(entries, {
    includeMatches: true,
    threshold: 0.45,
    ignoreLocation: true,
    minMatchCharLength: 1,
    keys: [
      { name: 'label', weight: 0.6 },
      { name: 'desc', weight: 0.2 },
      { name: 'route', weight: 0.1 },
      { name: 'section', weight: 0.1 },
    ]
  }), [entries]);

  const results = useMemo(() => {
    if (!query.trim()) return entries.map(e => ({ item: e }));
    return fuse.search(query).map(r => ({ ...r }));
  }, [entries, fuse, query]);

  useEffect(() => { if (active >= results.length) setActive(0); }, [results, active]);
  useEffect(() => { if (open) { setTimeout(() => inputRef.current?.focus(), 0); } else { setQuery(''); setActive(0); } }, [open]);

  // Close on route change
  useEffect(() => {
    const handle = () => onClose();
    router.events.on('routeChangeComplete', handle);
    return () => { router.events.off('routeChangeComplete', handle); };
  }, [router, onClose]);

  // Focus trap (keep focus inside)
  useEffect(() => {
    if (!open) return;
    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', trap, true);
    return () => window.removeEventListener('keydown', trap, true);
  }, [open]);

  const isLocked = (entry: PaletteEntry) => !!(entry.roles && entry.roles.length && !entry.roles.some(r => userRoles.includes(r)));
  const isDynamic = (route?: string) => !!route && route.includes('[');
  const fallbackRoute = (route?: string) => {
    if (!route) return undefined;
    const parts = route.split('/').filter(Boolean).filter(seg => !seg.startsWith('['));
    if (!parts.length) return '/';
    const base = '/' + parts.join('/');
    return base === route ? undefined : base;
  };
  const appendOrg = (route?: string) => {
    if (!route) return undefined;
    if (!orgId) return route;
    return route + (route.includes('?') ? '&' : '?') + 'orgId=' + encodeURIComponent(orgId);
  };

  const highlight = (text: string, matches: any[] | undefined, key: string) => {
    if (!matches) return text;
    const m = matches.find(m => m.key === key && m.value === text);
    if (!m || !m.indices.length) return text;
    const parts: React.ReactNode[] = [];
    let last = 0; let i = 0;
    for (const [start, end] of m.indices) {
      if (start > last) parts.push(<span key={'n'+i}>{text.slice(last, start)}</span>);
      parts.push(<span key={'h'+i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(start, end+1)}</span>);
      last = end + 1; i++;
    }
    if (last < text.length) parts.push(<span key={'t'}>{text.slice(last)}</span>);
    return <>{parts}</>;
  };

  const sections = useMemo(() => {
    // group results by section preserving order of COMMAND_CATALOG sections
    const map: Record<string, typeof results> = {};
    for (const r of results) {
      const sec = r.item.section;
      (map[sec] = map[sec] || []).push(r);
    }
    return map;
  }, [results]);

  const flatResults = useMemo(() => results.map(r => r.item.id), [results]);
  const activeResult = results[active];

  const trigger = (entry: PaletteEntry, matches: any[] | undefined) => {
    const locked = isLocked(entry);
    const dyn = isDynamic(entry.route);
    if (locked) {
      toast.error('ต้องเป็น admin/owner');
      return;
    }
    if (dyn && !fallbackRoute(entry.route)) {
      toast('ต้องระบุไอดี');
      return;
    }
    // Non-route command: open health drawer
    if (entry.id === 'open-health-drawer') {
      onClose();
      openHealth(true);
      return;
    }
    const target = dyn ? fallbackRoute(entry.route) : entry.route;
    if (!target) return;
    const withOrg = appendOrg(target);
    onClose();
    router.push(withOrg || '/');
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(results.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeResult) trigger(activeResult.item, (activeResult as any).matches); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  if (!open) return null;

  return (
    <div data-testid="command-palette-overlay" className="fixed inset-0 z-[999] flex items-start justify-center bg-black/40 backdrop-blur-sm p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} data-testid="command-palette" role="dialog" aria-modal="true" aria-labelledby="cmdp-title" className="w-full max-w-5xl bg-white rounded-lg shadow-lg border flex flex-col overflow-hidden">
        <h2 id="cmdp-title" className="sr-only">Command Palette</h2>
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-gray-50">
          <Search className="w-4 h-4 text-gray-500" />
          <input data-testid="command-palette-input" ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setActive(0); }} onKeyDown={onKey} placeholder="พิมพ์เพื่อค้นหา (Ctrl+K เพื่อปิด)" className="flex-1 bg-transparent outline-none text-sm" />
          {query && <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600" aria-label="Clear"><X className="w-4 h-4" /></button>}
          <button onClick={onClose} className="text-gray-500 hover:text-black" aria-label="Close palette"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex min-h-[420px]">
          <div ref={listRef} className="w-full md:w-2/3 max-h-[420px] overflow-auto divide-y">
            {Object.keys(sections).length === 0 && (
              <div className="p-6 text-sm text-gray-500">ไม่พบคำสั่ง</div>
            )}
            {Object.entries(sections).map(([sec, items]) => (
              <div key={sec} className="py-1">
                <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1">{sec}</div>
                <ul role="listbox" aria-label={sec} className="">
                  {items.map(r => {
                    const entry = r.item;
                    const idx = flatResults.indexOf(entry.id);
                    const focused = idx === active;
                    const locked = isLocked(entry);
                    const dyn = isDynamic(entry.route);
                    const disabled = locked || (!entry.route) || (dyn && !fallbackRoute(entry.route));
                    return (
                      <li
                        key={entry.id}
                        id={`cmdp-${entry.id}`}
                        data-active={focused}
                        className={`px-3 py-2 text-sm cursor-pointer select-none flex items-start gap-3 ${focused ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                        aria-selected={focused}
                        role="option"
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => trigger(entry, (r as any).matches)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 truncate">{highlight(entry.label, (r as any).matches, 'label')}</span>
                            {locked && <Lock className="w-3.5 h-3.5 text-rose-500" />}
                            {entry.importance === 'primary' && <Shield className="w-3.5 h-3.5 text-indigo-500" />}
                            {entry.importance === 'secondary' && <Shield className="w-3.5 h-3.5 text-slate-400" />}
                            {entry.importance === 'tertiary' && <Bookmark className="w-3.5 h-3.5 text-slate-300" />}
                            {entry.status && <span className={`text-[10px] px-1.5 py-0.5 rounded ${entry.status==='done'?'bg-green-100 text-green-700':entry.status==='wip'?'bg-amber-100 text-amber-700':'bg-gray-200 text-gray-600'}`}>{entry.status.toUpperCase()}</span>}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">{entry.section}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {entry.route && <code className="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-600 max-w-[140px] truncate">{highlight(entry.route, (r as any).matches, 'route')}</code>}
                          {(locked || dyn) && <span className="text-[10px] text-rose-600">{locked ? 'ล็อกสิทธิ์' : 'ต้องระบุไอดี'}</span>}
                          {dyn && fallbackRoute(entry.route) && <button onClick={(e)=>{e.stopPropagation(); const fb = fallbackRoute(entry.route); if (fb) { router.push(appendOrg(fb)!); onClose(); } }} className="text-[10px] text-blue-600 hover:underline">เปิดรายการทั้งหมด</button>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <aside className="hidden md:flex md:w-1/3 border-l flex-col p-4 gap-3 bg-gray-50">
            {activeResult ? (
              <div className="space-y-3 text-sm">
                <div className="font-semibold text-gray-800 flex items-center gap-2">
                  {activeResult.item.label}
                  {isLocked(activeResult.item) && <Lock className="w-4 h-4 text-rose-500" />}
                </div>
                {activeResult.item.desc && <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{highlight(activeResult.item.desc, (activeResult as any).matches, 'desc')}</p>}
                {activeResult.item.route && <div className="text-[11px] text-gray-500">Route: <code className="bg-white border px-1 py-0.5 rounded">{activeResult.item.route}</code></div>}
                <div className="text-[11px] text-gray-400">Roles: {activeResult.item.roles?.join(', ') || 'public'}</div>
                <div className="text-[11px] text-gray-400">Importance: {activeResult.item.importance || '-'}</div>
                <div className="text-[11px] text-gray-400">Status: {activeResult.item.status || '-'}</div>
                <div className="pt-2 flex gap-2">
                  <button
                    className="text-xs px-2 py-1 rounded bg-indigo-600 text-white disabled:opacity-40"
                    disabled={isLocked(activeResult.item) || !activeResult.item.route}
                    onClick={()=>trigger(activeResult.item, (activeResult as any).matches)}
                  >เปิด</button>
                  {isDynamic(activeResult.item.route) && fallbackRoute(activeResult.item.route) && (
                    <button
                      className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700"
                      onClick={()=>{ const fb = fallbackRoute(activeResult.item.route); if (fb) { router.push(appendOrg(fb)!); onClose(); } }}
                    >เปิดรายการทั้งหมด</button>
                  )}
                </div>
              </div>
            ) : <div className="text-xs text-gray-500">ไม่มีรายการ</div>}
          </aside>
        </div>
        <div className="px-3 py-2 border-t bg-gray-50 flex flex-wrap gap-4 items-center text-[10px] text-gray-500">
          <span>↑↓ / Ctrl+N,P เลื่อน</span>
          <span>Enter เปิด</span>
          <span>Esc ปิด</span>
          <span>Ctrl+K Toggle</span>
          <span>Locked แสดง 🔒</span>
          <span>Dynamic แสดง เปิดรายการทั้งหมด</span>
        </div>
      </div>
    </div>
  );
};
