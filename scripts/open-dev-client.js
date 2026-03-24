#!/usr/bin/env node
/**
 * Wait for Vite dev server (VITE_DEV_PORT) to be ready, then open the app in the system default browser.
 * Usage: node scripts/open-dev-client.js
 */
const path = require('path');
const { spawn } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const viteDevPort = parseInt(process.env.VITE_DEV_PORT, 10) || 5173;
const MAX_PORT_OFFSET = 25;

const projectRoot = path.join(__dirname, '..');

(async () => {
  // Brief delay so dev server and Vite have a head start
  await new Promise((r) => setTimeout(r, 3000));

  // Vite auto-picks the next free port when VITE_DEV_PORT is busy.
  // Scan the same range and open the first responsive port (retry up to 30s).
  let resolvedPort = null;
  for (let attempt = 0; attempt < 60 && !resolvedPort; attempt += 1) {
    for (let p = viteDevPort; p <= viteDevPort + MAX_PORT_OFFSET; p += 1) {
      try {
        const res = await fetch(`http://localhost:${p}`, { method: 'GET' });
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
    console.error(
      `[open-dev-client] Could not find Vite server on ports ${viteDevPort}-${viteDevPort + MAX_PORT_OFFSET}.`
    );
    process.exit(1);
  }
  if (resolvedPort !== viteDevPort) {
    console.warn(`[open-dev-client] VITE_DEV_PORT ${viteDevPort} was busy; opening ${resolvedPort}.`);
  }
  const url = `http://localhost:${resolvedPort}`;

  const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(openCmd, [url], { stdio: 'ignore', shell: true }).on('exit', (code) => process.exit(code ?? 0));
})();
