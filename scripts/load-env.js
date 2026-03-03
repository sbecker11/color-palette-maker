#!/usr/bin/env node
/**
 * Load root .env so scripts can use EXPRESS_PORT, VITE_DEV_PORT, etc.
 * Usage: const { expressPort, viteDevPort } = require('./scripts/load-env.js');
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  expressPort: parseInt(process.env.EXPRESS_PORT, 10) || 3000,
  viteDevPort: parseInt(process.env.VITE_DEV_PORT, 10) || 5173,
};
