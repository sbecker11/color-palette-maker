#!/usr/bin/env node
/**
 * Start the dev server on EXPRESS_PORT from .env. Kills any process on that port first.
 * Usage: node scripts/dev-server.js
 */
const path = require('path');
const { spawnSync, spawn } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const port = parseInt(process.env.EXPRESS_PORT, 10) || 3000;

const projectRoot = path.join(__dirname, '..');
spawnSync('npx', ['kill-port', String(port)], { cwd: projectRoot, stdio: 'inherit', shell: true });
spawn('node', ['scripts/run-with-venv.js', 'nodemon', 'server.js'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: process.env,
  shell: false,
}).on('exit', (code) => process.exit(code ?? 0));
