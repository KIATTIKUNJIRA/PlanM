import { describe, it, expect } from 'vitest';
import { friendlyDbMessage } from './dbErrors';

describe('friendlyDbMessage', () => {
  const labels = { code: 'รหัสโครงการ', type: 'ประเภทโครงการ', latitude: 'ละติจูด', longitude: 'ลองจิจูด' };

  it('maps 23505 (duplicate) composite org_id,code -> ซ้ำในองค์กร', () => {
    const err = {
      code: '23505',
      details: 'Key (org_id, code)=(..., TT-001) already exists',
      message: 'duplicate key value violates unique constraint'
    };
    expect(friendlyDbMessage(err, { entity: 'โครงการ', labels }))
      .toBe('รหัสโครงการซ้ำในองค์กร');
  });

  it('maps 23505 duplicate single column', () => {
    const err = {
      code: '23505',
      details: 'Key (code)=(TT-001) already exists',
      message: 'duplicate key value violates unique constraint'
    };
    expect(friendlyDbMessage(err, { entity: 'โครงการ', labels }))
      .toBe('รหัสโครงการซ้ำในระบบ');
  });

  it('maps 22P02 (invalid enum project_type)', () => {
    const err = {
      code: '22P02',
      message: 'invalid input value for enum project_type: "villa"'
    };
    expect(friendlyDbMessage(err, { entity: 'โครงการ', labels }))
      .toBe('ประเภทโครงการไม่ถูกต้อง');
  });

  it('maps 23514 latitude range check', () => {
    const err = { code: '23514', message: 'new row for relation "projects" violates check constraint "projects_lat_range"' };
    expect(friendlyDbMessage(err, { entity: 'โครงการ', labels }))
      .toBe('ละติจูดอยู่นอกช่วง (-90..90)');
  });

  it('falls back to message for unknown code', () => {
    const err = { code: '99999', message: 'weird error' };
    expect(friendlyDbMessage(err, { entity: 'โครงการ', labels }))
      .toBe('weird error');
  });
});
