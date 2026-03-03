#!/usr/bin/env node
/**
 * Wait for the API server (EXPRESS_PORT) to be ready, then start Vite dev server with VITE_DEV_PORT and proxy to EXPRESS_PORT.
 * Usage: node scripts/wait-and-dev-client.js
 */
const path = require('path');
const { spawnSync, spawn } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const port = parseInt(process.env.EXPRESS_PORT, 10) || 3000;
const viteDevPort = parseInt(process.env.VITE_DEV_PORT, 10) || 5173;

const projectRoot = path.join(__dirname, '..');
const clientDir = path.join(projectRoot, 'client');

const waitResult = spawnSync(
  'npx',
  ['wait-on', '-t', '60000', `http://localhost:${port}/api/config`],
  { cwd: projectRoot, stdio: 'inherit', shell: true }
);
if (waitResult.status !== 0) process.exit(waitResult.status);

const env = { ...process.env, VITE_DEV_PORT: String(viteDevPort), VITE_API_PORT: String(port) };
spawn('npm', ['run', 'dev'], {
  cwd: clientDir,
  stdio: 'inherit',
  env,
  shell: true,
}).on('exit', (code) => process.exit(code ?? 0));
