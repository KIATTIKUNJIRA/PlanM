#!/usr/bin/env node
import { spawn } from 'child_process';

const port = process.env.PORT ? String(parseInt(process.env.PORT, 10)) : '3000';

function runEnsurePort() {
  return new Promise((res, rej) => {
    // run the existing ensure-port script (it already reads process.env.PORT)
    const p = spawn('node', ['scripts/ensure-port-3000.mjs'], { stdio: 'inherit', shell: true, env: process.env });
    p.on('close', (code) => {
      if (code === 0) res();
      else rej(new Error('ensure-port exited with ' + code));
    });
  });
}

function runNext() {
  // Use npx to ensure the local next binary is used when available
  const proc = spawn('npx', ['next', 'dev', '-p', port], { stdio: 'inherit', shell: true, env: process.env });
  proc.on('close', (code) => process.exit(code));
}

(async () => {
  try {
    await runEnsurePort();
    runNext();
  } catch (err) {
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  }
})();
