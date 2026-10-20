import fs from 'fs';

const en = JSON.parse(fs.readFileSync('./src/i18n/locales/en.json', 'utf8'));
const hi = JSON.parse(fs.readFileSync('./src/i18n/locales/hi.json', 'utf8'));

function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(flattenKeys(v, full));
    } else {
      keys.push({ key: full, val: v });
    }
  }
  return keys;
}

const enKeys = flattenKeys(en);
const hiKeys = flattenKeys(hi);

const enKeySet = new Set(enKeys.map(k => k.key));
const hiKeySet = new Set(hiKeys.map(k => k.key));

const missingInHi = enKeys.filter(k => !hiKeySet.has(k.key)).map(k => k.key);
const missingInEn = hiKeys.filter(k => !enKeySet.has(k.key)).map(k => k.key);
const emptyInEn = enKeys.filter(k => typeof k.val === 'string' && k.val.trim() === '').map(k => k.key);
const emptyInHi = hiKeys.filter(k => typeof k.val === 'string' && k.val.trim() === '').map(k => k.key);

console.log('=== PennyPath i18n Verification ===');
console.log(`Total EN keys: ${enKeys.length}`);
console.log(`Total HI keys: ${hiKeys.length}`);
console.log(`Missing in HI: ${missingInHi.length}`);
console.log(`Missing in EN: ${missingInEn.length}`);
console.log(`Empty values in EN: ${emptyInEn.length}`);
console.log(`Empty values in HI: ${emptyInHi.length}`);

if (missingInHi.length > 0) {
  console.error('\n[FAIL] Keys present in EN but missing in HI:');
  missingInHi.slice(0, 30).forEach(k => console.error('  - ' + k));
  if (missingInHi.length > 30) console.error(`  ... and ${missingInHi.length - 30} more`);
}

if (missingInEn.length > 0) {
  console.error('\n[FAIL] Keys present in HI but missing in EN:');
  missingInEn.slice(0, 30).forEach(k => console.error('  - ' + k));
  if (missingInEn.length > 30) console.error(`  ... and ${missingInEn.length - 30} more`);
}

if (emptyInEn.length > 0 || emptyInHi.length > 0) {
  console.error('\n[FAIL] Empty translation strings detected!');
}

const passed = missingInHi.length === 0 && missingInEn.length === 0 && emptyInEn.length === 0 && emptyInHi.length === 0;

if (passed) {
  console.log('\n✅ [PASS] i18n parity check passed with ZERO missing keys and ZERO empty strings!');
  process.exit(0);
} else {
  console.error('\n❌ [FAIL] i18n parity check failed.');
  process.exit(1);
}
