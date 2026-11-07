#!/usr/bin/env node
// SIGAP v5 — schema checks for run state files written by agents. Run after every write.
// Usage: node tools/state.js check --run R [--file proposal|requests|klarifikasi]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
const run = opt('run'); if (!run) { console.error('missing --run'); process.exit(2); }
const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'simulation', 'staff-personas.json'), 'utf8'));
const OWNERS = new Set(['manager', ...P.staf.map(s => s.id)]);
const CONTACTS = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mock', 'contacts.json'), 'utf8')).contacts.map(c => c.id));
const ITEM = /^(A\.[5-8]\.\d{1,2}|Klausul (4|5|6|7|8|9|10)(\.\d(\.\d)?)?)$/;
const errs = [];
const RUNS = process.env.SIGAP_RUNS || path.join(ROOT, 'runs');
const load = n => { const f = path.join(RUNS, run, n + '.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
function checkProposal(p) {
  if (!p) return errs.push('proposal.json missing');
  if (!Array.isArray(p.fokus) || p.fokus.length < 3 || p.fokus.length > 5) errs.push('fokus must have 3–5 items');
  for (const f of p.fokus || []) {
    if (!ITEM.test(f.item || '')) errs.push(`fokus item id invalid: ${f.item}`);
    if (!f.alasan_risiko) errs.push(`${f.item}: alasan_risiko missing`);
    if (!OWNERS.has(f.task_pengumpul)) errs.push(`${f.item}: task_pengumpul must be one of ${[...OWNERS].join(', ')}`);
    if (f.pic_kontak && !CONTACTS.has(f.pic_kontak)) errs.push(`${f.item}: pic_kontak not in contacts.json`);
    if (!Array.isArray(f.bukti_diminta) || !f.bukti_diminta.length) errs.push(`${f.item}: bukti_diminta missing`);
  }
  if (!Array.isArray(p.jadwal) || !p.jadwal.length) errs.push('jadwal missing');
  for (const j of p.jadwal || []) if (!j.slot_check || !['OK', 'UNVERIFIED'].includes(j.slot_check.verdict)) errs.push(`jadwal ${j.agenda || '?'}: attach tools/schedule.js slot output with verdict OK/UNVERIFIED`);
}
function checkRequests(r) {
  if (!r) return errs.push('requests.json missing');
  for (const q of r.requests || []) {
    if (!ITEM.test(q.item || '')) errs.push(`request item invalid: ${q.item}`);
    if (!OWNERS.has(q.task_pengumpul)) errs.push(`${q.item}: task_pengumpul invalid`);
    if (!['diminta', 'dikumpulkan', 'dirilis', 'tidak ditemukan di Data-Operation'].includes(q.status)) errs.push(`${q.item}: status invalid (${q.status})`);
  }
}
function checkCollected(r) {
  if (!r) return;
  for (const q of r.requests || []) {
    const f = path.join(RUNS, run, `selection-${q.task_pengumpul}.json`);
    if (!fs.existsSync(f)) continue;
    const has = JSON.parse(fs.readFileSync(f, 'utf8')).some(e => e.item === q.item);
    if (has && q.status === 'diminta') errs.push(`${q.item}: documents collected but requests.json status still "diminta"`);
  }
}
function checkProportional(r) {
  if (!r) return;
  const v = String(r.versi_skill || '');
  if (!v || /(^|[^\d.])(5\.[01]|4\.\d)(?!\d)/.test(v)) return; // rule introduced in SKILL v5.2
  for (const f of fs.readdirSync(path.join(RUNS, run)).filter(x => /^selection-.+\.json$/.test(x))) {
    const sel = JSON.parse(fs.readFileSync(path.join(RUNS, run, f), 'utf8'));
    for (const e of sel) {
      if (!e.butir) { errs.push(`${f}: ${e.file} has no butir (which bukti_diminta line it answers)`); continue; }
    }
  }
}
function checkReleases() {
  const d = path.join(RUNS, run, 'outbox'); if (!fs.existsSync(d)) return;
  for (const f of fs.readdirSync(d).filter(x => x.endsWith('.json'))) {
    const o = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
    if (o.kind !== 'release') continue;
    const p = o.payload || {};
    if (!OWNERS.has(p.owner)) errs.push(`${o.id}: payload.owner invalid`);
    if (!p.sumber_folder) errs.push(`${o.id}: payload.sumber_folder missing`);
    if (!Array.isArray(p.files) || !p.files.length) errs.push(`${o.id}: payload.files must be an array of file names`);
  }
}
function checkKlar(k) {
  if (!k) return;
  for (const e of k.queue || []) {
    if (!['menunggu', 'dijawab'].includes(e.status)) errs.push(`klarifikasi ${e.item}: status invalid`);
    if (e.status === 'dijawab' && !(e.jawaban_kartu && e.conversation)) errs.push(`klarifikasi ${e.item}: dijawab without card answer + conversation (self-answer not allowed)`);
  }
}
const which = opt('file');
if (!which || which === 'proposal') checkProposal(load('proposal'));
if (!which || which === 'requests') { checkRequests(load('requests')); checkCollected(load('requests')); checkProportional(load('requests')); }
if (!which || which === 'release') checkReleases();
if (!which || which === 'klarifikasi') checkKlar(load('klarifikasi-bukti'));
console.log(errs.length ? 'FAIL\n- ' + errs.join('\n- ') : 'OK');
process.exit(errs.length ? 1 : 0);
