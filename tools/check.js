/* ============================================================
   Monster Wheels — syntax check for every JS file.
   Usage: node tools/check.js   (or npm run check)
   Runs `node --check` on each .js file under js/ and tools/.
   ============================================================ */
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIRS = ['js', 'tools'];

function collect(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
}

const files = [];
for (const d of DIRS) {
  const full = path.join(ROOT, d);
  if (fs.existsSync(full)) collect(full, files);
}

let failed = 0;
for (const f of files) {
  const rel = path.relative(ROOT, f);
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    console.log('OK   ' + rel);
  } catch (e) {
    failed++;
    console.error('FAIL ' + rel);
    console.error(String(e.stderr || e.message));
  }
}

console.log('\n' + (files.length - failed) + '/' + files.length + ' files passed.');
process.exit(failed ? 1 : 0);
