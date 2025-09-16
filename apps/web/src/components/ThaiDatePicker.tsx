import React, { useCallback, useEffect, useRef, useState } from 'react';

// Month names in Thai
const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

export function formatThai(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate().toString().padStart(2,'0');
  const month = (d.getMonth()+1).toString().padStart(2,'0');
  const yearBE = d.getFullYear() + 543;
  return `${day}/${month}/${yearBE}`;
}

export interface ThaiDatePickerProps {
  label?: string;
  value?: string; // ISO yyyy-mm-dd
  onChange?: (iso: string | '') => void;
  placeholder?: string;
  min?: string; max?: string;
  disabled?: boolean;
  id?: string;
}

export const ThaiDatePicker: React.FC<ThaiDatePickerProps> = ({ value, onChange, placeholder='วัน/เดือน/ปี', disabled, id }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [viewYear, setViewYear] = useState<number>(() => value ? new Date(value).getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => value ? new Date(value).getMonth() : new Date().getMonth());

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const weeks: (Date | null)[][] = [];
  let current: (Date | null)[] = [];
  // Pad leading blanks
  for (let i=0;i<firstDay;i++) current.push(null);
  for (let d=1; d<=daysInMonth; d++) {
    current.push(new Date(viewYear, viewMonth, d));
    if (current.length === 7) { weeks.push(current); current = []; }
  }
  if (current.length) { while (current.length<7) current.push(null); weeks.push(current); }

  // Build YYYY-MM-DD in local time (ไม่ใช้ toISOString เพื่อเลี่ยง -1 วัน จาก timezone)
  const toLocalISO = (d: Date) => {
    const y = d.getFullYear();
    const m = (d.getMonth()+1).toString().padStart(2,'0');
    const day = d.getDate().toString().padStart(2,'0');
    return `${y}-${m}-${day}`;
  };

  const selectDay = useCallback((d: Date) => {
    const iso = toLocalISO(d);
    onChange && onChange(iso);
    setOpen(false);
  }, [onChange]);

  const clear = useCallback(() => { onChange && onChange(''); setOpen(false); }, [onChange]);

  return (
    <div className="relative" ref={ref} id={id}>
      <input
        readOnly
        disabled={disabled}
        className="mt-1 w-full rounded-lg border px-3 py-2 cursor-pointer bg-white disabled:bg-gray-100"
        value={formatThai(value) || ''}
        placeholder={placeholder}
        onClick={() => !disabled && setOpen(o=>!o)}
      />
      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-72 rounded-xl border bg-white shadow-lg p-3 animate-fade-in">
          <div className="flex items-center justify-between mb-2 text-sm select-none">
            <button type="button" className="px-2 py-1 hover:bg-gray-100 rounded" onClick={() => setViewMonth(m => { if (m===0) { setViewYear(y=>y-1); return 11; } return m-1; })}>‹</button>
            <div className="font-medium">{THAI_MONTHS[viewMonth]} {viewYear + 543}</div>
            <button type="button" className="px-2 py-1 hover:bg-gray-100 rounded" onClick={() => setViewMonth(m => { if (m===11) { setViewYear(y=>y+1); return 0; } return m+1; })}>›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[11px] text-center text-gray-500 mb-1">
            {['อา','จ','อ','พ','พฤ','ศ','ส'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-sm">
            {weeks.flat().map((d,i) => d ? (
              <button
                key={i}
                type="button"
                onClick={() => selectDay(d)}
                className={"h-8 rounded flex items-center justify-center hover:bg-black/10 " + (value && toLocalISO(d) === value ? 'bg-black text-white hover:bg-black text-white' : '')}
              >{d.getDate()}</button>
            ) : <div key={i} />)}
          </div>
          <div className="flex justify-between mt-2">
            <button type="button" className="text-xs text-gray-500 hover:underline" onClick={clear}>ล้าง</button>
            <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => { const today = new Date(); setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); selectDay(today); }}>วันนี้</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThaiDatePicker;
