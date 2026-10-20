import fs from 'fs';
import path from 'path';

function getFiles(dir, files = []) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== 'dist' && f !== '.git') getFiles(full, files);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

const files = getFiles('./src');
const keyRegex = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
const foundKeys = new Set();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = keyRegex.exec(content)) !== null) {
    foundKeys.add(m[1]);
  }
}

// Also check seedData and other files for dynamic keys like titleKey, categoryKey, etc.
const keyPropRegex = /\b(?:titleKey|tagKey|summaryKey|contentKey|takeawayKey|questionKey|explanationKey|categoryKey|roleTitleKey|bioKey|labelKey|nameKey):\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = keyPropRegex.exec(content)) !== null) {
    foundKeys.add(m[1]);
  }
}

// Also string arrays like optionsKeys
const arrayOptRegex = /optionsKeys:\s*\[([^\]]+)\]/g;
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = arrayOptRegex.exec(content)) !== null) {
    const inner = m[1];
    const itemRegex = /['"]([a-zA-Z0-9_.-]+)['"]/g;
    let im;
    while ((im = itemRegex.exec(inner)) !== null) {
      foundKeys.add(im[1]);
    }
  }
}

const en = JSON.parse(fs.readFileSync('./src/i18n/locales/en.json', 'utf8'));
const hi = JSON.parse(fs.readFileSync('./src/i18n/locales/hi.json', 'utf8'));

function getNested(obj, keyPath) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur === undefined || cur === null) return undefined;
    cur = cur[p];
  }
  return cur;
}

const missingInEn = [];
const missingInHi = [];

for (const k of Array.from(foundKeys).sort()) {
  if (getNested(en, k) === undefined) missingInEn.push(k);
  if (getNested(hi, k) === undefined) missingInHi.push(k);
}

fs.writeFileSync('./scripts/missing_keys.json', JSON.stringify({
  totalUsedKeys: foundKeys.size,
  missingInEn,
  missingInHi
}, null, 2));

console.log('Done! Total used keys:', foundKeys.size, 'Missing in EN:', missingInEn.length, 'Missing in HI:', missingInHi.length);
