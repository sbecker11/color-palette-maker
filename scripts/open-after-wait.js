#!/usr/bin/env node
/**
 * Wait for server at EXPRESS_PORT to be ready, then open http://localhost:EXPRESS_PORT in Chrome.
 * Used for start:open (built app).
 */
const path = require('path');
const { spawnSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const port = parseInt(process.env.EXPRESS_PORT, 10) || 3000;

const projectRoot = path.join(__dirname, '..');
const url = `http://localhost:${port}`;
const apiUrl = `http://localhost:${port}/api/config`;

const w = spawnSync('npx', ['wait-on', '-t', '60000', apiUrl], { cwd: projectRoot, stdio: 'inherit', shell: true });
if (w.status !== 0) process.exit(w.status);
spawnSync('open', ['-a', 'Google Chrome', url], { stdio: 'inherit', shell: false });
process.exit(0);
