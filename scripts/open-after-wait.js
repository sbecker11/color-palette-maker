#!/usr/bin/env node
/**
 * Wait for server at EXPRESS_PORT to be ready, then open http://localhost:EXPRESS_PORT in Chrome.
 * Used for start:open (built app).
 */
const path = require('path');
const { spawnSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const port = parseInt(process.env.EXPRESS_PORT, 10) || 3000;
const MAX_PORT_OFFSET = 25;

const projectRoot = path.join(__dirname, '..');

(async () => {
  let resolvedPort = null;
  for (let attempt = 0; attempt < 60 && !resolvedPort; attempt += 1) {
    for (let p = port; p <= port + MAX_PORT_OFFSET; p += 1) {
      try {
        const res = await fetch(`http://localhost:${p}/api/config`, { method: 'GET' });
        if (res.ok) {
          resolvedPort = p;
          break;
        }
      } catch {
        // keep polling
      }
    }
    if (!resolvedPort) await new Promise((r) => setTimeout(r, 500));
  }
  if (!resolvedPort) {
    console.error(`[open-after-wait] Could not find server on ports ${port}-${port + MAX_PORT_OFFSET}.`);
    process.exit(1);
  }
  const url = `http://localhost:${resolvedPort}`;
  spawnSync('open', ['-a', 'Google Chrome', url], { stdio: 'inherit', shell: false });
  process.exit(0);
})();
