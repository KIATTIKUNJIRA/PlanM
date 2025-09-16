import { describe, it, expect } from 'vitest';
import { parseLatLng } from './validate';

describe('parseLatLng', () => {
  it('parses valid numbers', () => {
    const r = parseLatLng('13.5', '100.25');
    expect(r.lat).toBeCloseTo(13.5);
    expect(r.lng).toBeCloseTo(100.25);
    expect(r.errors.length).toBe(0);
  });
  it('returns nulls for blanks', () => {
    const r = parseLatLng('', '');
    expect(r.lat).toBeNull();
    expect(r.lng).toBeNull();
  });
  it('flags out of range', () => {
    const r = parseLatLng('91', '-181');
    expect(r.errors).toContain('ละติจูดต้องอยู่ระหว่าง -90 ถึง 90');
    expect(r.errors).toContain('ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180');
  });
  it('flags non-numeric', () => {
    const r = parseLatLng('abc', 'def');
    expect(r.errors).toContain('ละติจูดไม่ใช่ตัวเลข');
    expect(r.errors).toContain('ลองจิจูดไม่ใช่ตัวเลข');
  });
});
