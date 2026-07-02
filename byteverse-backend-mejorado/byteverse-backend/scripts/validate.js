const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const files = [];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(target);
    else if (entry.name.endsWith('.js')) files.push(target);
  }
}

collect(root);
for (const file of files) execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
console.log(`Sintaxis validada en ${files.length} archivos JavaScript.`);
