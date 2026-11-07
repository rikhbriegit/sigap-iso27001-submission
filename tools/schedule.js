#!/usr/bin/env node
// SIGAP v5 — deterministic clock + schedule validation. Never compute times by hand.
// Usage:
//   node tools/schedule.js now
//   node tools/schedule.js at +3            -> ISO time now+3 min (WIB offset) for automation scheduledAt
//   node tools/schedule.js future <iso>     -> exit 1 if <iso> is not at least 60 s in the future
//   node tools/schedule.js slot --date 2026-11-06 --start 09:00 --end 10:00 --zone WIB --contacts c03,c04
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const ZONES = { WIB: 7, WITA: 8, WIT: 9 };
const NAMES = { WIB: 'Asia/Jakarta', WITA: 'Asia/Makassar', WIT: 'Asia/Jayapura' };
const pad = n => String(n).padStart(2, '0');

function fmt(ms, zone) {
  const off = ZONES[zone];
  const d = new Date(ms + off * 3600e3);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+${pad(off)}:00`;
}
function parseLocal(date, hhmm, zone) {
  const [h, m] = hhmm.split(':').map(Number);
  const [Y, M, D] = date.split('-').map(Number);
  return Date.UTC(Y, M - 1, D, h, m) - ZONES[zone] * 3600e3;
}
function local(ms, zone) { const d = new Date(ms + ZONES[zone] * 3600e3); return { dow: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes(), date: d.toISOString().slice(0, 10), hm: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` }; }
const overlap = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };

const cmd = args[0];
if (cmd === 'now') {
  const n = Date.now();
  console.log(JSON.stringify({ utc: new Date(n).toISOString(), WIB: fmt(n, 'WIB'), WITA: fmt(n, 'WITA'), WIT: fmt(n, 'WIT') }, null, 1));
} else if (cmd === 'at') {
  const min = Number(String(args[1] || '+2').replace('+', ''));
  if (!(min >= 1)) { console.error('minutes must be >= 1'); process.exit(2); }
  console.log(fmt(Date.now() + min * 60e3, 'WIB'));
} else if (cmd === 'future') {
  const t = Date.parse(args[1]);
  const ok = t - Date.now() >= 60e3;
  console.log(ok ? 'OK future' : `NOT FUTURE: ${args[1]} (now ${fmt(Date.now(), 'WIB')}) — recompute with "at" and re-preview`);
  process.exit(ok ? 0 : 1);
} else if (cmd === 'slot') {
  const zone = opt('zone') || 'WIB';
  const s = parseLocal(opt('date'), opt('start'), zone), e = parseLocal(opt('date'), opt('end'), zone);
  const contacts = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mock/contacts.json'), 'utf8')).contacts;
  const rules = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mock/operational-rules.json'), 'utf8'));
  const ids = (opt('contacts') || '').split(',').filter(Boolean);
  const rows = []; let verdict = 'OK';
  for (const id of ids) {
    const c = contacts.find(x => x.id === id);
    if (!c) { rows.push({ id, error: 'unknown contact' }); verdict = 'FAIL'; continue; }
    const z = c.tz; const a = local(s, z), b = local(e, z); const issues = [];
    if (a.dow === 0 || a.dow === 6) issues.push('akhir pekan');
    if (a.min < 480 || b.min > 1020 || a.date !== b.date) issues.push('di luar jam kerja 08:00–17:00 lokal');
    if (overlap(a.min, b.min, 720, 780)) issues.push('istirahat 12:00–13:00 lokal');
    if (a.dow === 5 && overlap(a.min, b.min, 690, 780)) issues.push('salat Jumat 11:30–13:00 lokal');
    for (const h of rules.public_holidays_around_assessment || []) {
      if (h.date === a.date) issues.push(/perkiraan|cek/i.test(h.name) ? `LIBUR BELUM TERVERIFIKASI: ${h.name}` : `libur: ${h.name}`);
    }
    if (issues.length) verdict = issues.some(i => i.startsWith('LIBUR BELUM')) && verdict === 'OK' ? 'UNVERIFIED' : 'FAIL';
    rows.push({ id, nama: c.name, zona: `${z} (${NAMES[z]}, UTC+${ZONES[z]})`, lokal: `${a.date} ${a.hm}–${b.hm} ${z}`, issues });
  }
  const unverified = (rules.public_holidays_around_assessment || []).filter(h => /perkiraan|cek/i.test(h.name)).map(h => `${h.date} ${h.name}`);
  console.log(JSON.stringify({ usulan: `${opt('date')} ${opt('start')}–${opt('end')} ${zone}`, utc: `${new Date(s).toISOString()}–${new Date(e).toISOString()}`, verdict, peserta: rows, catatan_libur_belum_terverifikasi: unverified }, null, 1));
  process.exit(verdict === 'FAIL' ? 1 : 0);
} else {
  console.log('usage: now | at +N | future <iso> | slot --date --start --end --zone --contacts');
  process.exit(2);
}
