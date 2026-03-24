#!/usr/bin/env node
/**
 * Wait for the API server (EXPRESS_PORT) to be ready, then start Vite dev server with VITE_DEV_PORT and proxy to EXPRESS_PORT.
 * Usage: node scripts/wait-and-dev-client.js
 */
const path = require('path');
const { spawn } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const port = parseInt(process.env.EXPRESS_PORT, 10) || 3000;
const viteDevPort = parseInt(process.env.VITE_DEV_PORT, 10) || 5173;
const MAX_PORT_OFFSET = 25;

const projectRoot = path.join(__dirname, '..');
const clientDir = path.join(projectRoot, 'client');

async function detectExpressPort(preferredPort) {
  const maxAttempts = 60; // 60 x 500ms = 30s
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    for (let p = preferredPort; p <= preferredPort + MAX_PORT_OFFSET; p += 1) {
      try {
        const res = await fetch(`http://localhost:${p}/api/config`, { method: 'GET' });
        if (res.ok) return p;
      } catch {
        // keep polling
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

(async () => {
  const detectedExpressPort = await detectExpressPort(port);
  if (!detectedExpressPort) {
    console.error(
      `[wait-and-dev-client] Could not find Express /api/config on ports ${port}-${port + MAX_PORT_OFFSET}.`
    );
    process.exit(1);
  }
  if (detectedExpressPort !== port) {
    console.warn(
      `[wait-and-dev-client] EXPRESS_PORT ${port} was busy; using detected port ${detectedExpressPort} for Vite proxy.`
    );
  }

  const env = {
    ...process.env,
    VITE_DEV_PORT: String(viteDevPort),
    VITE_API_PORT: String(detectedExpressPort),
  };
  spawn('npm', ['run', 'dev'], {
    cwd: clientDir,
    stdio: 'inherit',
    env,
    shell: true,
  }).on('exit', (code) => process.exit(code ?? 0));
})();
