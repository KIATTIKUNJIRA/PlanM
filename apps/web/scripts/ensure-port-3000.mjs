#!/usr/bin/env node
import detect from 'detect-port';

// Allow overriding the port via environment, default to 3000
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

(async () => {
  console.log(`Checking port ${PORT}...`);
  const free = await detect(PORT);
  if (free !== PORT) {
    console.error(`\n❌ Port ${PORT} is in use. Please free it and run again.`);
    console.error(`Tip: close other dev servers or run: npx kill-port ${PORT}`);
    process.exit(1);
  } else {
    console.log(`✅ Port ${PORT} is free.`);
  }
})();
