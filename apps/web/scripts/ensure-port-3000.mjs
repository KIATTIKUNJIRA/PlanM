#!/usr/bin/env node
import detect from 'detect-port';

const PORT = 3000;

(async () => {
  const free = await detect(PORT);
  if (free !== PORT) {
    console.error(`\n❌ Port ${PORT} is in use. Please free it and run again.`);
    console.error(`Tip: close other dev servers or run: npx kill-port ${PORT}`);
    process.exit(1);
  } else {
    console.log(`✅ Port ${PORT} is free.`);
  }
})();
