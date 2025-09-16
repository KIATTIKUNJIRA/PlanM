#!/usr/bin/env node
/**
 * Fetch full Thailand geography JSON repo and build a compact list used by the app.
 * Output: apps/web/public/data/thaiLocations.full.json
 */
import fs from 'fs';
import path from 'path';
import https from 'https';

const REPO_BASE = 'https://raw.githubusercontent.com/thailand-geography-data/thailand-geography-json/main/src';
const FILES = ['geography.json']; // use aggregated file -> less network

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode + ' ' + url));
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e){ reject(e); }
      });
    }).on('error', reject);
  });
}

(async () => {
  try {
    console.log('Downloading Thailand geography dataset...');
    const geo = await fetchJson(`${REPO_BASE}/geography.json`);
    if (!Array.isArray(geo)) throw new Error('Unexpected geography.json format');
    // Transform only required fields for our app
    const compact = geo.map(r => ({
      province: r.provinceNameTh,
      district: r.districtNameTh,
      subdistrict: r.subdistrictNameTh,
      postal: String(r.postalCode || '')
    }));
    // Sort for deterministic order
    compact.sort((a,b) => a.province.localeCompare(b.province,'th') || a.district.localeCompare(b.district,'th') || a.subdistrict.localeCompare(b.subdistrict,'th'));

    const outDir = path.join(process.cwd(), 'apps', 'web', 'public', 'data');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'thaiLocations.full.json');
    fs.writeFileSync(outFile, JSON.stringify(compact));
    console.log('Wrote', compact.length, 'rows to', outFile);
  } catch (e) {
    console.error('Failed:', e);
    process.exit(1);
  }
})();
