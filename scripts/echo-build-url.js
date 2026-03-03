#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const port = process.env.EXPRESS_PORT || 3000;
console.log('');
console.log('  → View at: http://localhost:' + port + ' (run "npm start" first)');
console.log('');
