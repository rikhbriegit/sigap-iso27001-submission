#!/usr/bin/env node
// SIGAP v5 — outbox: every outward action (email, calendar, automation create/update/delete, file release, report issue)
// is stored as an exact payload with a sha256. A card answer is bound to that hash. Execution is allowed only when
// `verify` passes; any change to the payload changes the hash and voids the approval.
// Usage:
//   node tools/outbox.js create  --run R --kind email|calendar|automation|release|report|gate --title "..." --file payload.json
//   node tools/outbox.js show    --run R --id ID          (prints the exact payload to put in the preview card)
//   node tools/outbox.js decide  --run R --id ID --sha SHA --option "<card option label>" --actor "<role>"
//   node tools/outbox.js verify  --run R --id ID          (exit 0 only if APPROVED, hash unchanged, not executed)
//   node tools/outbox.js done    --run R --id ID --result "<msgId / automation id / path>"
//   node tools/outbox.js list    --run R
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
const APPROVE = ['Setujui sesuai preview'];
const NEGATIVE = { 'Revisi': 'REVISION', 'Tolak': 'REJECTED', 'Tunda': 'PENDING_APPROVAL' };
const canon = v => JSON.stringify(v, Object.keys(flat(v)).sort());
function flat(o, acc = {}) { if (o && typeof o === 'object') for (const k of Object.keys(o)) { acc[k] = 1; flat(o[k], acc); } return acc; }
const sha = v => crypto.createHash('sha256').update(canon(v)).digest('hex');
const now = () => `${new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 19)}+07:00`;
const RUNS = process.env.SIGAP_RUNS || path.join(ROOT, 'runs');
const dir = run => { const d = path.join(RUNS, run, 'outbox'); fs.mkdirSync(d, { recursive: true }); return d; };
const load = (run, id) => JSON.parse(fs.readFileSync(path.join(dir(run), id + '.json'), 'utf8'));
const integrity = require('./integrity');
// records are written only here: read-only on disk + sealed copy outside the workspace (R09-F19)
const save = (run, rec) => integrity.writeProtected(path.join(dir(run), rec.id + '.json'), JSON.stringify(rec, null, 1));
const DECK = run => 'Presentasi-Hasil-Audit-' + run + '.pptx';
const GMAIL_ID = /^(gmail:)?[0-9a-f]{12,24}$/i; // Gmail API message ids are hex
const PENGAWAS_RRULE = 'FREQ=HOURLY;INTERVAL=1';
// restore any record changed or deleted outside this tool; seal records written before the guard existed
function guardRun(run) {
  const d = dir(run); const res = { restored: [], sealed: [], tampered_unsealed: [] };
  const files = new Set(fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => path.join(d, f)));
  integrity.sealedUnder(d).forEach(f => files.add(f));
  for (const f of files) {
    const g = integrity.guardFile(f, path.join(RUNS, run, 'tamper'));
    if (g === 'restored') res.restored.push(path.basename(f, '.json'));
    else if (g === 'unsealed') {
      let o = null; try { o = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {}
      if (o && o.payload && sha(o.payload) === o.sha256) { integrity.sealExisting(f); res.sealed.push(o.id); } else res.tampered_unsealed.push(path.basename(f, '.json'));
    }
  }
  if (res.restored.length) require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'audit.js'), 'append', '--run', run, '--fase', '-', '--aktor', 'sistem (penjaga integritas)', '--aksi', 'pemulihan_otomatis_item_keputusan',
    '--input', 'diubah/dihapus di luar tools/outbox.js: ' + res.restored.join(', '), '--output', 'dipulihkan dari salinan tersegel; versi yang diubah disimpan di runs/' + run + '/tamper/', '--ref', 'tools/integrity.js'], { env: Object.assign({}, process.env, { SIGAP_SYSTEM: '1' }), stdio: 'ignore' });
  return res;
}
const die = (m, c = 1) => { console.error(m); process.exit(c); };
// per-item verdicts such as "A.8.13 (...) → Minor NC", "KL-01 ... → Minor NC", "butir 1 & 3 → Conform"
const STATUS = '(Conform|Conformity|Minor NC|Major NC|OFI|N\\/A|Sesuai|Tidak sesuai|Compliant)';
const ITEM = '(A\\.\\d+\\.\\d+|Klausul\\s*\\d+(\\.\\d+)*|KL-\\d+|butir\\s*\\d+)';
function verdictsIn(t) {
  const re = new RegExp(ITEM + '[^;\\n]{0,160}?(→|->|=>|=|:|menjadi|dinilai|jadi)\\s*\\**' + STATUS + '\\b', 'gi');
  return (t.match(re) || []).map(s => s.replace(/\s+/g, ' ').slice(-90));
}

function isReportDistribution(run, r) {
  if (r.payload && r.payload.jenis === 'distribusi_laporan') return true;
  const hasReport = fs.readdirSync(dir(run)).filter(f => f.endsWith('.json')).some(f => { const o = JSON.parse(fs.readFileSync(path.join(dir(run), f), 'utf8')); return o.kind === 'report' && o.status === 'EXECUTED'; });
  return hasReport && /laporan/i.test(String(r.title || '') + ' ' + String((r.payload || {}).subject || ''));
}
const cmd = args[0]; const run = opt('run');
if (!run && cmd !== undefined) die('missing --run', 2);
const guarded = run ? guardRun(run) : null;
if (cmd === 'create') {
  const payload = JSON.parse(fs.readFileSync(opt('file'), 'utf8'));
  // v5.3: every address (to/cc/bcc/participants/from) must be EXACTLY one of the aliases in data/mock/contacts.json
  const CONTACTS = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mock', 'contacts.json'), 'utf8')).contacts.map(c => String(c.email).toLowerCase()); } catch (e) { return []; } })();
  const rcpt = [].concat(payload.to || [], payload.cc || [], payload.bcc || [], payload.peserta || [], payload.attendees || [], payload.participants || [], payload.from || [])
    .map(x => typeof x === 'string' ? x : (x && x.email) || '').filter(Boolean);
  for (const a of rcpt) {
    if (!CONTACTS.includes(String(a).toLowerCase())) die(`BLOCKED: ${a} is not in data/mock/contacts.json (allowed: ${CONTACTS.join(', ')}). The Manager is rikh.brie@gmail.com.`);
  }
  if (opt('kind') === 'report') {
    // R11-F11: a report item only ISSUES the report (DRAFT + FINAL hashes); distribution is a separate `email` item later
    if (payload.to || payload.cc || payload.bcc || payload.jenis === 'distribusi_laporan' || payload.subject)
      die('BLOCKED: a `report` item only issues the report. Remove to/cc/subject/jenis; create the distribution later as kind `email` (payload.jenis "distribusi_laporan") AFTER the Manager accepts the handover (SKILL FASE 7).');
    const files = (payload.artefak || []).map(a => String(a.file || ''));
    if (!files.some(f => /\.pptx$/i.test(f)) && !payload.tambahan_dari) die('BLOCKED: a report must include the presentation deck ' + DECK(run) + ' among its artefak (SKILL FASE 7).');
    const wrong = files.filter(f => /\.pptx$/i.test(f) && f !== DECK(run));
    if (wrong.length) die('BLOCKED: presentation deck must be named exactly ' + DECK(run) + ' (got ' + wrong.join(', ') + ').');
    const noFinal = (payload.artefak || []).filter(a => !/^[0-9a-f]{64}$/.test(String(a.sha256_final || '')));
    if (noFinal.length) die('BLOCKED: every artefak needs file + sha256_draft + sha256_final (build the FINAL variant before the card, as in SKILL FASE 7). Missing sha256_final for: ' + noFinal.map(a => a.file).join(', '));
  }
  if (opt('kind') === 'release') {
    // R12: duplicate releases are refused by the procedure itself (e.g. a re-armed staff task repeating its work)
    const relFiles = Array.isArray(payload.files) ? payload.files.map(f => path.basename(String(f))) : Object.keys(payload.sha256 || {});
    const others = fs.readdirSync(dir(run)).filter(f => f.endsWith('.json')).map(f => { try { return JSON.parse(fs.readFileSync(path.join(dir(run), f), 'utf8')); } catch (e) { return null; } })
      .filter(o => o && o.kind === 'release' && ['PENDING_APPROVAL', 'APPROVED'].includes(o.status) && (o.payload || {}).owner === payload.owner); // EXECUTED counts only via the evidence index (R12-F4)
    const covered = new Set(); others.forEach(o => (Array.isArray(o.payload.files) ? o.payload.files.map(f => path.basename(String(f))) : Object.keys(o.payload.sha256 || {})).forEach(f => covered.add(f)));
    let indexed = []; try { indexed = JSON.parse(fs.readFileSync(path.join(RUNS, run, 'evidence-index.json'), 'utf8')).filter(e => e.owner === payload.owner).map(e => e.file); } catch (e) {}
    indexed.forEach(f => covered.add(f));
    const dup = relFiles.filter(f => covered.has(f));
    if (relFiles.length && dup.length === relFiles.length)
      die('BLOCKED (duplikat): semua berkas rilis ini sudah dirilis/menunggu untuk ' + payload.owner + ' (' + dup.join(', ') + '; item ' + others.map(o => o.id + ' ' + o.status).join(', ') + '). Jangan buat rilis ulang; tulis status "sudah dirilis" dan berhenti. Rilis tambahan hanya untuk berkas BARU.');
    if (dup.length) die('BLOCKED (sebagian duplikat): ' + dup.join(', ') + ' sudah dirilis untuk ' + payload.owner + '. Ajukan rilis tambahan hanya berisi berkas baru: ' + relFiles.filter(f => !covered.has(f)).join(', '));
  }
  if (opt('kind') === 'serah_terima') {
    // R11-F11: handover covers only FINAL files already published in reports/<RUN>/ (the server normally creates it itself)
    const rdir = path.join(ROOT, 'reports', run);
    const bad = (payload.artefak || []).filter(a => { const f = path.join(rdir, String(a.file || '')); if (!fs.existsSync(f)) return true;
      return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') !== (a.sha256_final || a.sha256); });
    if (!(payload.artefak || []).length || bad.length) die('BLOCKED: handover only after the report is issued — FINAL files must be in reports/' + run + '/ with the approved sha256 (not found/different: ' + (bad.map(a => a.file).join(', ') || 'artefak list is empty') + '). Get the `report` item approved, copy FINAL, run done; the dashboard server then creates the handover automatically.');
  }
  if (opt('kind') === 'automation' && / Pengawas$/.test(String(payload.name || ''))) {
    // the supervisor task runs a fixed, tool-generated prompt only (no agent-written instructions), every 5 minutes, no Gmail
    const want = require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'supervisor.js'), 'prompt', '--run', run], { encoding: 'utf8' }).trim();
    if (String(payload.prompt || '').trim() !== want) die('BLOCKED: the Pengawas prompt must be exactly the output of `node tools/supervisor.js prompt --run ' + run + '` (copy it verbatim).');
    if (payload.scheduleType !== 'recurring' || payload.rrule !== PENGAWAS_RRULE) die('BLOCKED: Pengawas needs scheduleType "recurring" and rrule "' + PENGAWAS_RRULE + '".');
    if ((payload.connectorIds || []).some(c => /gmail/i.test(c))) die('BLOCKED: Pengawas gets no Gmail connector.');
  } else if (opt('kind') === 'automation' && fs.readdirSync(dir(run)).some(f => /^GATE-/.test(f) && JSON.parse(fs.readFileSync(path.join(dir(run), f), 'utf8')).status === 'EXECUTED')
    && /(auditor|staf)/i.test(String(payload.name || '')) && !/cleanup|hapus|delete/i.test(String(opt('title') || '') + ' ' + String(payload.mode || ''))) {
    // R12-F2/F3: after GATE 1 no new wake/re-arm tasks — the Pengawas re-arms the SAME approved task (same prompt) itself
    die('BLOCKED: after GATE 1 the Manager does not create wake/re-arm tasks for the Auditor or staff. The Pengawas re-arms the existing task automatically (node tools/supervisor.js plan). End the turn with the LANJUT FASE card.');
  }
  // R11-F4: assessment is the external Auditor's authority. A Manager-written task/wake prompt for the Auditor may point to
  // state only; it must not pre-assign a conformity status to any item (listing the §5 scale itself is allowed).
  if (opt('kind') === 'automation' && /auditor/i.test(String(payload.name || '') + ' ' + String(opt('title') || ''))) {
    const v = verdictsIn(String(payload.prompt || ''));
    if (v.length) die('BLOCKED (SOD): the Auditor prompt pre-assigns conformity statuses: ' + v.slice(0, 4).join(' | ') + '. Remove every per-item status; the Auditor decides in FASE 5 from evidence (SKILL §1, §5).');
  }
  const n = fs.readdirSync(dir(run)).filter(f => f.endsWith('.json')).length + 1;
  const id = `${(opt('kind') || 'x').toUpperCase()}-${String(n).padStart(3, '0')}`;
  const rec = { id, kind: opt('kind'), title: opt('title') || '', created: now(), status: 'PENDING_APPROVAL', sha256: sha(payload), payload, history: [] };
  save(run, rec);
  console.log(JSON.stringify({ id, sha256: rec.sha256, status: rec.status }));
} else if (cmd === 'show') {
  const r = load(run, opt('id')); console.log(JSON.stringify({ id: r.id, kind: r.kind, title: r.title, status: r.status, sha256: r.sha256, payload: r.payload }, null, 1));
} else if (cmd === 'decide') {
  const r = load(run, opt('id')); const o = opt('option');
  if (sha(r.payload) !== r.sha256) die('HASH MISMATCH: payload changed after preview — create a new outbox item and re-preview.');
  if (opt('sha') !== r.sha256) die('SHA does not match the previewed payload — re-preview.');
  // user rule (6 Nov): every email that will be sent is reviewed and decided in the dashboard (Keputusan), never by a chat card
  if ((r.kind === 'email' || r.kind === 'calendar') && opt('channel') !== 'dashboard')
    die('BLOCKED: email and calendar-invite items are decided only in the dashboard http://localhost:4173/#approvals (tab Keputusan), where the person reviews the exact recipients, subject, body and attachments. Do not show a chat card for it: tell the Manager "buka dashboard → Keputusan" and end the turn with the LANJUT FASE card.');
  if (r.status === 'EXECUTED') die('already executed');
  const opts = Array.isArray(r.payload.options) ? r.payload.options : null;
  if (opts) {
    if (!opts.includes(o)) die(`"${o}" is not one of this card's options.`);
    if (APPROVE.includes(o)) r.status = 'APPROVED';
    else { r.status = NEGATIVE[o] || 'ANSWERED'; r.answer = o; }
  }
  else if (APPROVE.includes(o)) r.status = 'APPROVED';
  else if (NEGATIVE[o]) r.status = NEGATIVE[o];
  else die(`"${o}" is not a card option. Free text never approves; treat it as Revisi.`);
  // R16-F3: the person's fixed-choice reason for Revisi/Tolak travels with the decision (never free text)
  const REASON = opt('reason') || '';
  r.history.push(Object.assign({ at: now(), option: o, actor: opt('actor') || '', channel: opt('channel') || 'card' }, REASON ? { reason: REASON } : {})); save(run, r);
  if (REASON) console.log('ALASAN PEMILIK: ' + REASON);
  console.log(JSON.stringify({ id: r.id, status: r.status }));
  // R11-F12: the reason for a Revisi/Tolak/clarification must reach the agent without hints — print the automatic checks
  if (['REVISION', 'REJECTED'].includes(r.status) || o === 'Minta klarifikasi auditor') {
    try {
      const ck = require(path.join(ROOT, 'progress-dashboard', 'checks.js')).checkItem(run, Object.assign({}, r, { status: 'PENDING_APPROVAL' }));
      const bad = (ck.checks || []).filter(x => !x.ok);
      console.log('ALASAN (pemeriksaan otomatis): ' + (bad.length ? bad.map(x => x.text).join(' | ') : 'tidak ada pemeriksaan yang gagal — tanyakan pemilik keputusan lewat kartu.'));
      console.log('YANG HARUS DILAKUKAN: ' + require(path.join(ROOT, 'progress-dashboard', 'checks.js')).nextAfter(o, ck));
    } catch (e) {}
  }
} else if (cmd === 'verify') {
  const r = load(run, opt('id'));
  if (r.status !== 'APPROVED') die(`NOT APPROVED (${r.status}) — do not execute.`);
  // R11-F10: an approved automation whose scheduledAt has passed is stale (a newer revision may already have run): never execute
  if (r.kind === 'automation' && r.payload && r.payload.scheduledAt && Date.parse(r.payload.scheduledAt) < Date.now())
    die(`STALE: scheduledAt ${r.payload.scheduledAt} is in the past — do not execute; create a new item with a future time if still needed.`);
  if (r.kind === 'email' && isReportDistribution(run, r)) {
    const all = fs.readdirSync(dir(run)).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(dir(run), f), 'utf8')));
    const finals = []; all.filter(o => o.kind === 'report' && o.status === 'EXECUTED').forEach(o => (o.payload.artefak || []).forEach(a => finals.push(a.file)));
    const covered = new Set(); const tampered = all.filter(o => o.id && sha(o.payload) !== o.sha256).map(o => o.id);
    if (tampered.length) die('BLOCKED: TAMPERED outbox record(s) ' + tampered.join(', ') + ' — payload changed after decision (hash mismatch).');
    all.filter(o => o.kind === 'serah_terima' && o.status === 'ANSWERED' && o.answer === 'Terima laporan dan susun CAP').forEach(o => (o.payload.artefak || []).forEach(a => covered.add(a.file)));
    if (!finals.includes(DECK(run))) die('BLOCKED: report distribution requires the presentation deck ' + DECK(run) + ' to be published first.');
    const missing = finals.filter(f => !covered.has(f));
    if (missing.length) die('BLOCKED: report distribution requires the Manager to accept the handover of: ' + missing.join(', '));
  }
  if (sha(r.payload) !== r.sha256) die('HASH MISMATCH — do not execute.');
  console.log(JSON.stringify({ ok: true, id: r.id, execute_exactly: r.payload }, null, 1));
} else if (cmd === 'done') {
  const r = load(run, opt('id')); if (r.status !== 'APPROVED') die(`cannot mark done: ${r.status}`);
  if (['email', 'calendar'].includes(r.kind) && !GMAIL_ID.test(String(opt('result') || '').trim())) {
    // R14-F1: an email/invitation is EXECUTED only with the message id returned by the Gmail connector (it must really be sent)
    die('BLOCKED: email/calendar items are done only with the Gmail message id returned by the Gmail send call (e.g. --result gmail:18c2f0a9b1d2e3f4). Send it first via the Gmail connector exactly as approved (calendar = invitation email to every participant), then run done with that id.');
  }
  if (r.kind === 'release') {
    // R12-F4: a release is EXECUTED only when every file is really in the run's evidence index (no false "done")
    const files = Array.isArray(r.payload.files) ? r.payload.files.map(f => path.basename(String(f))) : Object.keys(r.payload.sha256 || {});
    let idx = []; try { idx = JSON.parse(fs.readFileSync(path.join(RUNS, run, 'evidence-index.json'), 'utf8')); } catch (e) {}
    const missing = files.filter(f => !idx.some(e => e.owner === r.payload.owner && e.file === f));
    if (missing.length) die('BLOCKED: release not executed yet — not in the evidence index for ' + r.payload.owner + ': ' + missing.join(', ') + '. Run `node tools/evidence.js add --run ' + run + ' --src "<sumber_folder>/<file>" --owner ' + r.payload.owner + ' --approval ' + r.id + '` for each file first.');
  }
  r.status = 'EXECUTED'; r.result = opt('result') || ''; r.history.push({ at: now(), executed: r.result }); save(run, r);
  console.log(JSON.stringify({ id: r.id, status: r.status, result: r.result }));
} else if (cmd === 'guard') {
  console.log(JSON.stringify(guarded));
} else if (cmd === 'list') {
  for (const f of fs.readdirSync(dir(run)).filter(f => f.endsWith('.json'))) { const r = load(run, f.slice(0, -5)); console.log(`${r.id}\t${r.status}\t${r.kind}\t${r.title}`); }
} else {
  die('usage: create|show|decide|verify|done|list|guard (see header)', 2);
}
