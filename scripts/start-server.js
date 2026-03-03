#!/usr/bin/env node
/**
 * Kill any process on EXPRESS_PORT from .env, then start the server.
 * Usage: node scripts/start-server.js
 */
const path = require('path');
const { spawnSync, spawn } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const port = parseInt(process.env.EXPRESS_PORT, 10) || 3000;

const projectRoot = path.join(__dirname, '..');
spawnSync('npx', ['kill-port', String(port)], { cwd: projectRoot, stdio: 'inherit', shell: true });
spawn('node', ['scripts/run-with-venv.js', 'node', 'server.js'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: process.env,
  shell: false,
}).on('exit', (code) => process.exit(code ?? 0));
