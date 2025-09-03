#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function walk(dir, acc=[]) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, acc); else acc.push(full);
  }
  return acc;
}

const root = path.join(__dirname, '..', 'src', 'pages');
if (fs.existsSync(root)) {
  const bad = walk(root).filter(f => /__tests__/.test(f) || /\.test\.[tj]sx?$/.test(f));
  if (bad.length) {
    console.error('\n❌ Test files inside pages/ are not allowed (they become routes):');
    bad.forEach(f => console.error(' - ' + path.relative(process.cwd(), f)));
    console.error('\nMove them to src/__tests__/pages/ and retry.');
    process.exit(1);
  }
}
