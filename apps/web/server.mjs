#!/usr/bin/env node
import next from 'next';
import http from 'http';
import detect from 'detect-port';

const requestedPort = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev: true });
const handle = app.getRequestHandler();

async function start(p) {
  try {
    await app.prepare();
    const server = http.createServer((req, res) => handle(req, res));
    server.listen(p, () => {
      console.log(`> Dev server ready on http://localhost:${p}`);
    });
  } catch (err) {
    console.error('Start error', err);
    process.exit(1);
  }
}

async function bootstrap() {
  const free = await detect(requestedPort);
  if (free !== requestedPort) {
    console.error(
      `\n❌ Port ${requestedPort} is in use. Please free it and run again.\n` +
        `Tip: close other dev servers or run: npx kill-port ${requestedPort}\n`
    );
    process.exit(1);
  } else {
    console.log(`✅ Port ${requestedPort} is free. Starting dev server...`);
    await start(requestedPort);
  }
}

bootstrap();
