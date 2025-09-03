import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { COMMAND_CATALOG, CommandItem } from '@/constants/commandCatalog';
import { X, Search, ArrowRight } from 'lucide-react';
import Fuse from 'fuse.js';

interface PaletteCommand {
  id: string;
  label: string;
  route?: string;
  desc?: string;
  section: string;
}

const flatten = (): PaletteCommand[] => {
  const out: PaletteCommand[] = [];
  for (const sec of COMMAND_CATALOG) {
    if (sec.children && sec.children.length) {
      for (const ch of sec.children) {
        out.push({ id: ch.id, label: ch.label, route: ch.route, desc: ch.desc, section: sec.label });
      }
    } else {
      out.push({ id: sec.id, label: sec.label, route: sec.route, desc: sec.desc, section: sec.label });
    }
  }
  return out;
};

interface Props { open: boolean; onClose(): void; }

export const CommandPalette: React.FC<Props> = ({ open, onClose }) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const HISTORY_KEY = 'commandPalette.queryHistory.v1';
  const commands = useMemo(() => flatten(), []);
  type ResultMatch = { indices: [number, number][]; key?: string; value?: string };
  type ResultItem = { item: PaletteCommand; matches?: ResultMatch[] };

  const fuseResults = useMemo<ResultItem[] | null>(() => {
    if (!query.trim()) return null;
    const fuse = new Fuse(commands, {
      includeMatches: true,
      keys: [
        { name: 'label', weight: 0.5 },
        { name: 'desc', weight: 0.3 },
        { name: 'route', weight: 0.2 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 1,
    });
    return fuse.search(query).slice(0, 50) as unknown as ResultItem[];
  }, [commands, query]);

  const filtered: ResultItem[] = useMemo(() => {
    if (!fuseResults) return commands.slice(0, 30).map(c => ({ item: c }));
    return fuseResults;
  }, [fuseResults, commands]);

  const highlight = (text: string, matches: ResultMatch[] | undefined, key: string) => {
    if (!matches || !query.trim()) return <span>{text}</span>;
    const matchFor = matches.find(m => m.key === key && m.value === text);
    if (!matchFor || !matchFor.indices.length) return <span>{text}</span>;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    matchFor.indices.forEach(([start, end]: [number, number], i: number) => {
      if (start > lastIndex) parts.push(<span key={`n-${i}-${lastIndex}`}>{text.slice(lastIndex, start)}</span>);
      parts.push(<span data-testid="cp-highlight" key={`h-${i}-${start}`} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(start, end + 1)}</span>);
      lastIndex = end + 1;
    });
    if (lastIndex < text.length) parts.push(<span key={`n-tail-${lastIndex}`}>{text.slice(lastIndex)}</span>);
    return <span>{parts}</span>;
  };

  useEffect(() => { if (index >= filtered.length) setIndex(0); }, [filtered, index]);
  useEffect(() => {
    if (!open) {
      if (query.trim()) {
        setHistory(h => {
          const next = [query.trim(), ...h.filter(q => q !== query.trim())].slice(0, 20);
          try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
          return next;
        });
      }
      setQuery('');
      setIndex(0);
      setHistoryIdx(-1);
    } else {
      try {
        const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        if (Array.isArray(stored)) setHistory(stored);
      } catch {}
    }
  }, [open]);

  useEffect(() => { setHistoryIdx(-1); }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(filtered.length - 1, i + 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(0, i - 1)); }
      // Vim style shortcuts
      if (e.ctrlKey && (e.key === 'n' || e.key === 'N')) { e.preventDefault(); setIndex(i => Math.min(filtered.length - 1, i + 1)); }
      if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); setIndex(i => Math.max(0, i - 1)); }
      // Page navigation
      if (e.key === 'PageDown') { e.preventDefault(); setIndex(i => Math.min(filtered.length - 1, i + 5)); }
      if (e.key === 'PageUp') { e.preventDefault(); setIndex(i => Math.max(0, i - 5)); }
      // Home / End
      if (e.key === 'Home') { e.preventDefault(); setIndex(0); }
      if (e.key === 'End') { e.preventDefault(); setIndex(filtered.length - 1); }
      // Query history (Ctrl + ArrowUp/ArrowDown)
      if (e.ctrlKey && e.key === 'ArrowUp') {
        e.preventDefault();
        setHistoryIdx(i => {
          const next = Math.min(history.length - 1, i + 1);
          const q = history[next];
          if (q) setQuery(q);
          return next;
        });
      }
      if (e.ctrlKey && e.key === 'ArrowDown') {
        e.preventDefault();
        setHistoryIdx(i => {
          const next = Math.max(-1, i - 1);
          if (next === -1) setQuery(''); else {
            const q = history[next]; if (q) setQuery(q);
          }
          return next;
        });
      }
      if (e.key === 'Enter') {
  const res = filtered[index];
  const cmd = res?.item;
  if (cmd?.route) {
          onClose();
          router.push(cmd.route);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, index, onClose, router, history]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-lg shadow-lg bg-white border overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="พิมพ์เพื่อค้นหา commands..."
            className="flex-1 text-sm outline-none"
          />
          <button onClick={onClose} className="text-gray-500 hover:text-black p-1"><X className="w-4 h-4" /></button>
        </div>
        <ul className="max-h-96 overflow-auto divide-y">
          {filtered.length === 0 && (
            <li className="p-4 text-xs text-gray-500">ไม่พบคำสั่ง</li>
          )}
          {filtered.map((res, i) => {
            const cmd = res.item;
            return (
            <li
              key={cmd.id}
              data-label={cmd.label}
              data-active={i === index ? 'true' : 'false'}
              className={`p-3 text-sm flex flex-col gap-0.5 cursor-pointer select-none ${i === index ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
              onMouseEnter={() => setIndex(i)}
              onClick={() => { if (cmd.route) { onClose(); router.push(cmd.route); } }}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">{highlight(cmd.label, res.matches, 'label')}</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div className="flex items-center gap-2">
                {cmd.route && <code className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{highlight(cmd.route, res.matches, 'route')}</code>}
                <span className="text-[10px] text-gray-500 truncate">{cmd.section}</span>
              </div>
              {cmd.desc && <p className="text-[11px] text-gray-500 line-clamp-2">{highlight(cmd.desc, res.matches, 'desc')}</p>}
            </li>
            );
          })}
        </ul>
        <div className="px-3 py-2 border-t bg-gray-50 flex justify-between items-center">
          <span className="text-[10px] text-gray-500">Enter เปิด • Esc ปิด • ↑↓ / Ctrl+N/P • PgUp/PgDn • Home/End • Ctrl+↑↓ history</span>
          <span className="text-[10px] text-gray-400">Ctrl+K</span>
        </div>
      </div>
    </div>
  );
};
