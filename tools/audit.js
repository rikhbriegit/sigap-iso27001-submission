#!/usr/bin/env node
// SIGAP v5 — append-only audit log: runtime timestamp, hash chain, sealed copy (tools/integrity.js), validation after every write.
// Usage:
//   node tools/audit.js append --run ISO270001-08 --fase "FASE 2" --aktor auditor --aksi usulan_kickoff \
//        --input "..." --output "..." --approval "card:GATE1=Setujui sesuai preview (outbox G1-...)" --ref "runs/.../proposal.json"
//   node tools/audit.js validate     (JSON + hash chain)
//   node tools/audit.js guard        (restore the log from its seal if it was edited/deleted outside this tool)
//   node tools/audit.js tail [n]
// Rules (R09-F19):
//   - actors "dashboard…", "sistem…", "operator…" are reserved for the dashboard server / operator (env SIGAP_SYSTEM=1);
//   - an agent may not log that it changed a decision item (outbox records are immutable);
//   - an agent entry that mentions a decision item gets the item's real status attached (status_sistem);
//   - test runs (SIGAP_RUNS set) never write the real log.
'use strict';
const fs = require('fs');
const path = require('path');
const { sha, writeProtected, sealExisting, guardFile } = require('./integrity');
const ROOT = path.resolve(__dirname, '..');
const TEST = !!process.env.SIGAP_RUNS && !process.env.SIGAP_AUDIT;
const FILE = process.env.SIGAP_AUDIT || (process.env.SIGAP_RUNS ? path.join(path.dirname(path.resolve(process.env.SIGAP_RUNS)), 'audit-entries.json') : path.join(ROOT, 'audit-log', 'entries.json'));
const RUNS = process.env.SIGAP_RUNS || path.join(ROOT, 'runs');
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
function nowWIB() { const d = new Date(Date.now() + 7 * 3600e3); return `${d.toISOString().slice(0, 19)}+07:00`; }
if (TEST && !fs.existsSync(FILE)) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, '[]'); }

function load() {
  const a = JSON.parse(fs.readFileSync(FILE, 'utf8')); // throws if corrupt -> caller must stop and report
  if (!Array.isArray(a)) throw new Error('entries.json is not an array');
  return a;
}
const entryHash = e => { const c = Object.assign({}, e); delete c.hash; return sha(JSON.stringify(c)); };
function chainErrors(a) {
  const errs = [];
  a.forEach((e, i) => {
    if (!e.hash) return;
    if (entryHash(e) !== e.hash) errs.push(`#${e.id}: isi berubah (hash tidak cocok)`);
    const prev = a[i - 1]; const want = prev ? (prev.hash || sha(JSON.stringify(prev))) : 'GENESIS';
    if (e.prev !== want) errs.push(`#${e.id}: rantai putus (entri sebelumnya diubah/dihapus)`);
  });
  return errs;
}
function guard() {
  const r = guardFile(FILE, path.join(path.dirname(FILE), 'tamper'));
  if (r === 'unsealed') sealExisting(FILE);
  return r;
}
function write(a) {
  const text = JSON.stringify(a, null, 1); JSON.parse(text);
  writeProtected(FILE, text); load();
}
function push(a, fields) {
  const last = a[a.length - 1];
  const maxId = a.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
  const e = Object.assign({ id: String(maxId + 1), timestamp: nowWIB() }, fields, { prev: last ? (last.hash || sha(JSON.stringify(last))) : 'GENESIS' });
  e.hash = entryHash(e); a.push(e); return e;
}

const ID_RE = /\b[A-Z][A-Z_]*-\d{3}\b/g;
const CHANGE_RE = /\b(diperluas|dimodifikasi|direkonsiliasi|rekonsiliasi|rekonkonsiliasi|disunting|diedit|ditimpa)\b|cakupan\s+\S+\s+diperluas/i; // claims of editing a decision item
function statusOf(run, id) {
  try { const o = JSON.parse(fs.readFileSync(path.join(RUNS, run, 'outbox', id + '.json'), 'utf8')); return id + ': ' + o.status + (o.answer ? ' (' + o.answer + ')' : '') + (o.payload && Array.isArray(o.payload.artefak) ? ', ' + o.payload.artefak.length + ' berkas' : ''); }
  catch (e) { return null; }
}

const cmd = args[0];
if (cmd === 'validate') {
  const a = load(); const errs = chainErrors(a);
  if (errs.length) die('CHAIN BROKEN:\n' + errs.join('\n'));
  console.log(`OK ${a.length} entries, chain intact (${a.filter(e => e.hash).length} chained)`);
} else if (cmd === 'guard') {
  const r = guard();
  if (r === 'restored') { const a = load(); push(a, { run: opt('run') || '-', fase: '-', aktor: 'sistem (penjaga integritas)', aksi: 'pemulihan_otomatis_log_audit', input: 'log audit diubah/dihapus di luar tools/audit.js', output: 'dipulihkan dari salinan tersegel; versi yang diubah disimpan di audit-log/tamper/', approval: 'n/a', ref: 'tools/integrity.js' }); write(a); }
  console.log(JSON.stringify({ log: r }));
} else if (cmd === 'tail') {
  const a = load(); console.log(JSON.stringify(a.slice(-Number(args[1] || 5)), null, 1));
} else if (cmd === 'append') {
  for (const k of ['run', 'fase', 'aktor', 'aksi']) if (!opt(k)) die('missing --' + k, 2);
  const aktor = opt('aktor');
  const system = /^(dashboard|sistem|operator)/i.test(aktor.trim());
  if (system && process.env.SIGAP_SYSTEM !== '1') die('BLOCKED: aktor "' + aktor + '" is reserved for the dashboard server/operator. Agents log under their own role.');
  const text = [opt('aksi'), opt('input'), opt('output')].join(' ');
  const flatText = text.replace(/_/g, ' ');
  const ids = [...new Set((flatText.match(/\b[A-Z][A-Z ]*-\d{3}\b/g) || []).map(x => x.trim().replace(/ /g, '_')))];
  if (!system && ids.length && CHANGE_RE.test(flatText)) die('BLOCKED: decision items (' + ids.join(', ') + ') are immutable — agents cannot change them or log such a change. Create a new outbox item instead (SKILL §0 rule 11).');
  const restored = guard();
  const a = load();
  const chainErr = chainErrors(a); if (chainErr.length) die('BLOCKED: audit log chain broken — ' + chainErr.join('; '));
  if (restored === 'restored') push(a, { run: opt('run'), fase: '-', aktor: 'sistem (penjaga integritas)', aksi: 'pemulihan_otomatis_log_audit', input: 'log audit diubah/dihapus di luar tools/audit.js', output: 'dipulihkan dari salinan tersegel sebelum entri baru ditulis', approval: 'n/a', ref: 'tools/integrity.js' });
  const fields = { run: opt('run'), fase: opt('fase'), aktor, aksi: opt('aksi'), input: opt('input') || '', output: opt('output') || '', approval: opt('approval') || 'n/a', ref: opt('ref') || '' };
  if (!system && ids.length) { const st = ids.map(id => statusOf(opt('run'), id)).filter(Boolean); if (st.length) fields.status_sistem = st.join('; '); }
  const e = push(a, fields);
  write(a);
  console.log(JSON.stringify(e));
} else {
  console.log('usage: append --run --fase --aktor --aksi [--input --output --approval --ref] | validate | guard | tail [n]');
  process.exit(2);
}
