#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'SKILLS');
const target = path.join(os.homedir(), '.agents', 'skills');

if (!fs.existsSync(source)) {
  console.error(`Skills folder not found: ${source}`);
  process.exit(1);
}

fs.mkdirSync(target, { recursive: true });

for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const from = path.join(source, entry.name);
  const to = path.join(target, entry.name);
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
  console.log(`installed ${entry.name} -> ${to}`);
}
