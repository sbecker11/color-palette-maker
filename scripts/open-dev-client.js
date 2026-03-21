#!/usr/bin/env node
/**
 * Wait for Vite dev server (VITE_DEV_PORT) to be ready, then open the app in the system default browser.
 * Usage: node scripts/open-dev-client.js
 */
const path = require('path');
const { spawnSync, spawn } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const viteDevPort = parseInt(process.env.VITE_DEV_PORT, 10) || 5173;

const projectRoot = path.join(__dirname, '..');
const url = `http://localhost:${viteDevPort}`;

(async () => {
  // Brief delay so dev server and Vite have a head start
  await new Promise((r) => setTimeout(r, 3000));

  const waitResult = spawnSync(
    'npx',
    ['wait-on', '-t', '60000', url],
    { cwd: projectRoot, stdio: 'inherit', shell: true }
  );
  if (waitResult.status !== 0) process.exit(waitResult.status);

  const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(openCmd, [url], { stdio: 'ignore', shell: true }).on('exit', (code) => process.exit(code ?? 0));
})();
