#!/usr/bin/env node
/**
 * Load port numbers from a .env file. Use from scripts or programmatically.
 *
 * Node usage:
 *   const { getPortsFromEnv } = require('./scripts/env-ports.js');
 *   const ports = getPortsFromEnv('/path/to/project/.env', { EXPRESS_PORT: 3000, VITE_DEV_PORT: 5173 });
 */

const path = require('path');
const fs = require('fs');

/**
 * Load .env from envPath (or cwd), parse it, and return port values for the given keys.
 * @param {string} [envPath] - Path to .env file. If omitted, uses .env in process.cwd().
 * @param {Record<string, number>} defaults - Map of env var name -> default port if missing/invalid.
 * @returns {Record<string, number>} Map of env var name -> port number (integer).
 */
function getPortsFromEnv(envPath, defaults = {}) {
  const resolved = envPath
    ? path.resolve(envPath)
    : path.join(process.cwd(), '.env');

  if (fs.existsSync(resolved)) {
    const content = fs.readFileSync(resolved, 'utf8');
    const env = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      env[key] = val;
    }
    for (const key of Object.keys(defaults)) {
      const raw = env[key];
      const num = raw != null ? parseInt(raw, 10) : NaN;
      env[key] = Number.isInteger(num) && num > 0 && num < 65536 ? num : defaults[key];
    }
    return Object.fromEntries(
      Object.keys(defaults).map((k) => [k, env[k] ?? defaults[k]])
    );
  }

  return { ...defaults };
}

/**
 * Convenience: load .env with dotenv then return ports (mutates process.env).
 * Use when you want process.env to be set (e.g. for child processes).
 */
function loadEnvAndGetPorts(envPath, defaults = {}) {
  const resolved = envPath
    ? path.resolve(envPath)
    : path.join(process.cwd(), '.env');
  try {
    require('dotenv').config({ path: resolved });
  } catch (_) {}
  const result = {};
  for (const [key, def] of Object.entries(defaults)) {
    const raw = process.env[key];
    const num = raw != null ? parseInt(raw, 10) : NaN;
    result[key] = Number.isInteger(num) && num > 0 && num < 65536 ? num : def;
  }
  return result;
}

module.exports = { getPortsFromEnv, loadEnvAndGetPorts };
