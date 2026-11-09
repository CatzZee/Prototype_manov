// Priora — asersi Priority Engine (SDD 3.3.1).
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const D = require(join(ROOT, 'js/data.js'));
const E = require(join(ROOT, 'js/engine.js'));

const TASKS = E.enrich(D);
const byId = Object.fromEntries(TASKS.map(t => [t.id, t]));

const expect = { laporan: ['Q1', 91.45], uas: ['Q2', 53.25], berkas: ['Q3', 52.42], catatan: ['Q4', 17.62] };
for (const [id, [q, s]] of Object.entries(expect)) {
  if (byId[id].quadrant !== q || byId[id].score !== s) {
    throw new Error(`Engine tidak cocok dengan SDD untuk ${id}: ${byId[id].quadrant} ${byId[id].score} (diharapkan ${q} ${s})`);
  }
}
console.log('OK: Engine lulus asersi SDD (91.45 / 53.25 / 52.42 / 17.62).');

