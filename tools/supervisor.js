#!/usr/bin/env node
// SIGAP — Pengawas (supervisor). Deterministic decisions about which run task must work now and whether it is stalled;
// the recurring "<RUN> Pengawas" WorkBuddy task only EXECUTES what `plan` prints (user, 6 Nov: when staff do not respond the
// workflow itself must follow up, never the person/operator).
//   node tools/supervisor.js prompt  --run R                       exact prompt for the Pengawas task (FASE 0 outbox item)
//   node tools/supervisor.js plan    --run R                       JSON {actions, waiting, escalated}; at most ONE re-arm per tick
//   node tools/supervisor.js record  --run R --id <automationId> --scheduledAt <ISO>   after automation_update (re-arm done)
//   node tools/supervisor.js status  --run R                       ledger + live state (dashboard)
// Policy (approved once with the Pengawas item in FASE 0): a task may be re-armed up to MAX times per phase, only by updating
// the SAME automation (same prompt — sha256 checked), only scheduledAt changes; one task at a time; back-off between tries;
// after MAX tries an `eskalasi` item is created for the person in the dashboard.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const RUNS = process.env.SIGAP_RUNS || path.join(ROOT, 'runs');
const wb = require('./wbstate');
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
const MAX = 3, DUE_GRACE_MS = 6 * 60e3, STALE_MS = 8 * 60e3, BACKOFF_MS = [0, 2 * 60e3, 5 * 60e3, 10 * 60e3];
const now = () => Date.now();
const iso = ms => new Date(ms + 7 * 3600e3).toISOString().slice(0, 19) + '+07:00';
const readJson = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; } };
const ledgerFile = run => path.join(RUNS, run, 'supervisor.json');
const loadLedger = run => readJson(ledgerFile(run)) || { run, workers: {}, ticks: 0 };
const saveLedger = (run, l) => { fs.mkdirSync(path.dirname(ledgerFile(run)), { recursive: true }); fs.writeFileSync(ledgerFile(run), JSON.stringify(l, null, 1)); };
function outbox(run) { const d = path.join(RUNS, run, 'outbox'); return fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => readJson(path.join(d, f))).filter(Boolean) : []; }
function audit(run, aksi, input, output) {
  try { execFileSync(process.execPath, [path.join(__dirname, 'audit.js'), 'append', '--run', run, '--fase', 'pengawas', '--aktor', 'sistem (pengawas)', '--aksi', aksi, '--input', input, '--output', output, '--ref', 'tools/supervisor.js'],
    { env: Object.assign({}, process.env, { SIGAP_SYSTEM: '1' }), stdio: 'ignore' }); } catch (e) {}
}

// which tasks of this run must be working now (from SIGAP state, not from agent prose)
function demand(run) {
  const { runInfo } = require(path.join(ROOT, 'progress-dashboard', 'runinfo.js'));
  const ri = runInfo(RUNS, path.join(ROOT, 'progress-dashboard', 'progress.json'), run);
  const ob = outbox(run);
  const proposal = readJson(path.join(RUNS, run, 'proposal.json')) || {};
  const index = readJson(path.join(RUNS, run, 'evidence-index.json')) || [];
  const pendingHuman = ob.filter(o => o.status === 'PENDING_APPROVAL' && o.kind !== 'eskalasi'); // an escalation about one task never blocks the others
  const LABEL = { 'network-user': 'Staf IT Network & User', 'dc-server': 'Staf IT Data Center & Server', 'sap-basis': 'Staf SAP Basis', 'cyber-security': 'Staf IT Cyber Security', 'app-dev': 'Staf IT Application Development', 'sap-fungsional': 'Staf SAP Functional' };
  const need = {}; const fase = ri.fase_no;
  const gate1 = ob.some(o => o.kind === 'gate' && o.status === 'EXECUTED');
  // staff: after GATE 1, until every focus item it owns is in the evidence index (or its release waits for a person)
  const owners = [...new Set((proposal.fokus || []).map(f => f.task_pengumpul).filter(t => t && t !== 'manager'))];
  for (const own of owners) {
    const items = proposal.fokus.filter(f => f.task_pengumpul === own).map(f => f.item);
    const released = index.some(e => e.owner === own);
    const waiting = pendingHuman.some(o => o.kind === 'release' && (o.payload || {}).owner === own);
    need[run + ' ' + (LABEL[own] || 'Staf ' + own)] = { key: 'fase3', needed: gate1 && !released && !waiting, why: 'mengumpulkan bukti ' + items.join(', '), waiting };
  }
  // Auditor: FASE 1 until the proposal exists; FASE 4-7 whenever no decision waits for a person
  const staffDone = owners.length && owners.every(own => index.some(e => e.owner === own));
  const aKey = 'fase' + (fase === 3 && staffDone ? 4 : fase);
  const aPhase = (fase === 1 && !proposal.fokus) || [4, 5, 6, 7].includes(fase) || (fase === 3 && staffDone);
  const handoverDone = ob.some(o => o.kind === 'serah_terima' && o.status === 'ANSWERED' && o.answer === 'Terima laporan dan susun CAP');
  // FASE 7 is finished for the Auditor only when the report distribution email was really sent (Gmail id), not at handover
  const distSent = ob.some(o => o.kind === 'email' && o.status === 'EXECUTED' && ((o.payload || {}).jenis === 'distribusi_laporan' || /distribusi/i.test(o.title || '')) && /^(gmail:)?[0-9a-f]{12,24}$/i.test(String(o.result || '').trim()));
  // R16-F4 (7 Nov): the kickoff meeting approved in GATE 1 must really be sent as an invitation (outbox calendar, jenis
  // "undangan_kickoff", Gmail id) by the Auditor right after GATE 1. Applies from run 17 (run 16 was already past this point).
  const KICKOFF_FROM_RUN = 17;
  const isKickoff = o => ['calendar', 'email'].includes(o.kind) && (o.payload || {}).jenis === 'undangan_kickoff';
  const kickoffSent = ob.some(o => isKickoff(o) && o.status === 'EXECUTED' && /^(gmail:)?[0-9a-f]{12,24}$/i.test(String(o.result || '').trim()));
  const kickoffOpen = ob.some(o => isKickoff(o) && ['PENDING_APPROVAL', 'APPROVED'].includes(o.status));
  const kickoffDue = Number(run.slice(-2)) >= KICKOFF_FROM_RUN && gate1 && !kickoffSent && !kickoffOpen;
  const auditorNeeded = (aPhase && !(fase === 7 && handoverDone && distSent)) || kickoffDue;
  need[run + ' Auditor'] = { key: kickoffDue && !aPhase ? 'kickoff' : aKey, needed: auditorNeeded && !pendingHuman.length, why: kickoffDue ? 'mengirim undangan rapat kickoff' : ({ fase1: 'menyusun usulan', fase4: 'cek kelengkapan', fase5: 'penilaian', fase6: 'QA', fase7: 'laporan & presentasi' }[aKey] || ''), waiting: !!pendingHuman.length };
  return { need, fase, pendingHuman };
}

function plan(run) {
  const L = loadLedger(run); L.ticks = (L.ticks || 0) + 1; L.lastTick = iso(now());
  const live = wb.read(run).filter(a => !/ Pengawas$/.test(a.name));
  const { need, fase } = demand(run);
  const out = { run, fase, at: iso(now()), actions: [], waiting: [], escalated: [], working: [], ok: [] };
  const anyRunning = live.some(a => a.running);
  for (const a of live) {
    const n = need[a.name]; if (!n) continue;
    const w = L.workers[a.id] = L.workers[a.id] || { name: a.name, promptSha: a.promptSha, attempts: {}, history: [] };
    if (w.promptSha !== a.promptSha) out.escalated.push({ name: a.name, reason: 'isi perintah task berubah dari yang disetujui (sha256) — tidak dicoba ulang' });
    // a 'Lanjut tanpa...' decision applies only to the phase it was taken in (legacy true = the phase of the escalation)
    if (w.skip && (w.skip === true ? (w.skipPhase || n.key) : w.skip) === n.key) { out.ok.push({ name: a.name, why: 'dilewati atas keputusan manusia untuk ' + n.key + ' (keterbatasan audit)' }); continue; }
    const tries = w.attempts[n.key] || 0;
    if (a.running) { out.working.push({ name: a.name, since: a.runningSince ? iso(a.runningSince) : null }); continue; }
    if (!n.needed) { (n.waiting ? out.waiting : out.ok).push({ name: a.name, why: n.waiting ? 'menunggu keputusan manusia' : 'tidak ada pekerjaan saat ini' }); continue; }
    const lr = a.lastRun; const due = a.scheduledMs || 0;
    let reason = null;
    if (!lr && due && now() > due + DUE_GRACE_MS) reason = 'belum pernah jalan sejak jadwal ' + iso(due).slice(11, 16);
    else if (lr && lr.failure && lr.retryable && now() > lr.endedMs + BACKOFF_MS[Math.min(tries, 3)]) reason = 'gagal: ' + lr.failurePlain;
    else if (lr && lr.failure && !lr.retryable) { out.escalated.push({ name: a.name, reason: 'gagal dan tidak bisa dicoba ulang otomatis: ' + lr.failurePlain }); continue; }
    else if (lr && !lr.failure && now() > Math.max(lr.endedMs, due) + STALE_MS) reason = 'berhenti sebelum pekerjaannya selesai (' + n.why + ')';
    else if (lr && due > lr.startedMs && now() > due + DUE_GRACE_MS) reason = 'jadwal ulang ' + iso(due).slice(11, 16) + ' tidak menyala';
    if (!reason) { out.ok.push({ name: a.name, why: 'menunggu jadwal / jeda percobaan ulang' }); continue; }
    if (tries >= MAX) { out.escalated.push({ name: a.name, reason: reason + ' — sudah ' + tries + 'x dicoba ulang' }); continue; }
    out.actions.push({ do: 'rearm', automation_id: a.id, name: a.name, attempt: tries + 1, max: MAX, reason, phase: n.key });
  }
  // one task at a time: the model is shared and saturates; staff before Auditor
  out.actions.sort((x, y) => (/Auditor$/.test(x.name) ? 1 : 0) - (/Auditor$/.test(y.name) ? 1 : 0));
  if (anyRunning) { out.deferred = out.actions.map(x => x.name); out.actions = []; }
  // executed by the dashboard server: wb.automations.trigger(<same automation id>) = WorkBuddy's own Run now (same prompt)
  out.actions = out.actions.slice(0, 1).map(x => Object.assign(x, { via: 'trigger', instruction: 'server: trigger automation ' + x.automation_id + ' sekarang, lalu record' }));
  // escalations become one dashboard item per task (created once) — run at the END, so Manager escalations are included
  const createEscalations = () => { for (const e of out.escalated) {
    const id = 'ESK-' + crypto.createHash('sha1').update(e.name + (need[e.name] || {}).key).digest('hex').slice(0, 6);
    L.escalations = L.escalations || {};
    if (L.escalations[id]) continue;
    const pf = path.join(RUNS, run, 'notes', 'eskalasi-' + id + '.json'); fs.mkdirSync(path.dirname(pf), { recursive: true });
    fs.writeFileSync(pf, JSON.stringify({ run, task: e.name, alasan: e.reason, kebijakan: 'Pengawas sudah mencoba ulang otomatis sesuai kebijakan yang disetujui di FASE 0.', options: ['Coba lagi', 'Lanjut tanpa pekerjaan task ini (dicatat sebagai keterbatasan audit)'] }, null, 1));
    try { const r = execFileSync(process.execPath, [path.join(__dirname, 'outbox.js'), 'create', '--run', run, '--kind', 'eskalasi', '--title', 'Eskalasi: ' + e.name + ' tidak berhasil', '--file', pf], { encoding: 'utf8' });
      L.escalations[id] = JSON.parse(r).id; audit(run, 'eskalasi_task', e.name, e.reason + ' -> ' + L.escalations[id]); } catch (err) {}
  } };
  // the Manager chat is not a WorkBuddy task: when the Manager still has its own work (its focus items are not in the
  // evidence index), no decision waits for a person and nothing happened for STALE_MS, the server sends the fixed wake text
  // into the Manager chat (same back-off/limit, logged). The server skips it while a card is open or the chat is busy.
  if (!out.actions.length) {
    const proposal = readJson(path.join(RUNS, run, 'proposal.json')) || {};
    const index = readJson(path.join(RUNS, run, 'evidence-index.json')) || [];
    const ob = outbox(run);
    const mItems = (proposal.fokus || []).filter(f => f.task_pengumpul === 'manager').map(f => f.item);
    const gate1 = ob.some(o => o.kind === 'gate' && o.status === 'EXECUTED');
    const mOpen = gate1 && mItems.length && !mItems.every(it => index.some(e => e.owner === 'manager' && (!e.item || String(e.item).startsWith(it))));
    const humanWaits = ob.some(o => o.status === 'PENDING_APPROVAL' && o.kind !== 'eskalasi');
    // approved emails/invitations that nobody sent yet (sending needs the agent's Gmail connector): wake the owner
    const approvedAt = o => Date.parse(((o.history || []).filter(h => h.option).slice(-1)[0] || {}).at || '') || 0;
    const mk = require('./mailkey');
    const unsent = ob.filter(o => ['email', 'calendar'].includes(o.kind) && ((o.status === 'APPROVED' && now() - approvedAt(o) > 2 * 60e3) || (o.status === 'EXECUTED' && !/^(gmail:)?[0-9a-f]{12,24}$/i.test(String(o.result || '').trim()))) && !mk.sentTwin(o, ob)); // resolved when an equivalent item was really sent
    const unsentAud = unsent.filter(o => (o.payload || {}).jenis === 'distribusi_laporan');
    const unsentMgr = unsent.filter(o => (o.payload || {}).jenis !== 'distribusi_laporan');
    if (unsentAud.length) { const aud = wb.read(run).find(a => / Auditor$/.test(a.name)); if (aud && !aud.running) out.actions.push({ do: 'rearm', automation_id: aud.id, name: aud.name, attempt: 1, max: MAX, phase: 'kirim', via: 'trigger', reason: 'distribusi yang sudah disetujui belum dikirim: ' + unsentAud.map(o => o.id).join(', ') }); }
    let last = 0; try { last = Math.max(...fs.readdirSync(path.join(RUNS, run, 'outbox')).map(f => fs.statSync(path.join(RUNS, run, 'outbox', f)).mtimeMs), fs.statSync(path.join(RUNS, run, 'requests.json')).mtimeMs); } catch (e) {}
    try { const a = JSON.parse(fs.readFileSync(process.env.SIGAP_AUDIT || path.join(ROOT, 'audit-log', 'entries.json'), 'utf8')).filter(e => e.run === run && /manager/i.test(e.aktor || '')); if (a.length) last = Math.max(last, Date.parse(a[a.length - 1].timestamp)); } catch (e) {}
    const key = 'manager-fase' + fase; const mw = L.manager = L.manager || { attempts: {}, history: [] }; const tries = mw.attempts[key] || 0;
    if (!out.actions.length && unsentMgr.length && now() - (mw.lastWake || 0) > 3 * 60e3) {
      if (tries >= MAX) out.escalated.push({ name: run + ' Manager', reason: 'email/undangan yang sudah disetujui belum dikirim (' + unsentMgr.map(o => o.id).join(', ') + ') setelah ' + tries + 'x diingatkan' });
      else out.actions.push({ do: 'wake-manager', name: run + ' Manager', attempt: tries + 1, max: MAX, phase: key, reason: unsentMgr.map(o => o.status === 'EXECUTED'
        ? o.id + ' ditandai terkirim TANPA bukti Gmail: buat item ' + o.kind + ' BARU dengan isi yang sama, minta review di dashboard, kirim lewat Gmail, lalu done dengan ID pesan Gmail'
        : o.id + ' sudah disetujui tetapi belum dikirim: kirim lewat Gmail persis isinya, lalu done dengan ID pesan Gmail').join('; ') });
    } else if (mOpen && !humanWaits && last && now() - last > STALE_MS && now() - (mw.lastWake || 0) > Math.max(STALE_MS, BACKOFF_MS[Math.min(tries, 3)])) {
      if (tries >= MAX) out.escalated.push({ name: run + ' Manager', reason: 'Manager tidak melanjutkan item miliknya (' + mItems.join(', ') + ') setelah ' + tries + 'x diingatkan' });
      else out.actions.push({ do: 'wake-manager', name: run + ' Manager', attempt: tries + 1, max: MAX, phase: key, reason: 'Manager berhenti tanpa menyelesaikan item miliknya (' + mItems.join(', ') + '), tidak ada aktivitas ' + Math.round((now() - last) / 60e3) + ' menit' });
    }
    saveLedger(run, L);
  }
  createEscalations(); saveLedger(run, L);
  return out;
}
function recordManager(run) {
  const L = loadLedger(run); const { fase } = demand(run); const key = 'manager-fase' + fase; const mw = L.manager = L.manager || { attempts: {}, history: [] };
  mw.attempts[key] = (mw.attempts[key] || 0) + 1; mw.lastWake = now(); mw.history.push({ at: iso(now()), phase: key, attempt: mw.attempts[key] }); saveLedger(run, L);
  audit(run, 'ingatkan_manager_otomatis', run + ' Manager', 'percobaan ' + mw.attempts[key] + '/' + MAX + ' (' + key + '): pesan pembangun tetap dikirim ke chat Manager');
  console.log(JSON.stringify({ ok: true, attempt: mw.attempts[key] }));
}

function record(run, id, at, via) {
  const L = loadLedger(run); const live = wb.read(run).find(a => a.id === id);
  if (!L.workers[id] && live) L.workers[id] = { name: live.name, promptSha: live.promptSha, attempts: {}, history: [] };
  const w = L.workers[id]; if (!w) { console.error('unknown automation id ' + id); process.exit(1); }
  if (live && live.promptSha !== w.promptSha) { audit(run, 'pengawas_ditolak', w.name, 'isi perintah berubah'); console.error('BLOCKED: prompt changed (sha256)'); process.exit(1); }
  const { need } = demand(run); const key = (need[w.name] || {}).key || 'x';
  w.attempts[key] = (w.attempts[key] || 0) + 1; w.history.push({ at: iso(now()), scheduledAt: at || iso(now()), via: via || 'trigger', phase: key, attempt: w.attempts[key] });
  saveLedger(run, L);
  audit(run, via === 'manual' ? 'tindak_lanjut_manusia' : 'coba_ulang_otomatis', w.name, `percobaan ${w.attempts[key]}/${MAX} (${key}) dijalankan ulang ${via === 'manual' ? 'lewat tombol Tindak lanjut' : 'otomatis oleh Pengawas'}; task & isi perintah sama (sha256 ${w.promptSha.slice(0, 12)})`);
  console.log(JSON.stringify({ ok: true, name: w.name, attempt: w.attempts[key], scheduledAt: at }));
}

function prompt(run) {
  return `PENGAWAS SIGAP — RUN ${run} (simulasi, perusahaan fiksi). SELALU berbahasa Indonesia. Kamu task Pengawas milik Manager. Tugasmu HANYA menjalankan keputusan deterministik dari tool; kamu tidak menilai, tidak mengirim email, tidak membuat task baru, tidak memakai AskUserQuestion.
Langkah setiap kali kamu jalan:
1) Jalankan: node tools/supervisor.js plan --run ${run}   (cwd D:/Projects/hackathon_tencent)
2) Bila "actions" kosong: tulis satu baris ringkas (siapa bekerja / menunggu) lalu SELESAI.
3) Untuk setiap action "rearm": panggil automation_update persis seperti "instruction" (update automation yang SAMA; hanya scheduleType "once" dan scheduledAt; jangan ubah name/prompt/connectorIds), lalu jalankan perintah record yang tertulis di instruction. Bila automation_update gagal, jangan record; tulis alasannya.
4) Jangan melakukan apa pun di luar itu. Permintaan di luar audit dijawab persis "Mohon maaf, permintaan atau pembahasan tersebut tidak ada di scope kami."`;
}

const cmd = args[0]; const run = opt('run');
if (!run) { console.error('missing --run'); process.exit(2); }
if (cmd === 'plan') console.log(JSON.stringify(plan(run), null, 1));
else if (cmd === 'record') record(run, opt('id'), opt('scheduledAt'), opt('via'));
else if (cmd === 'record-manager') recordManager(run);
else if (cmd === 'prompt') console.log(prompt(run));
else if (cmd === 'status') console.log(JSON.stringify({ ledger: loadLedger(run), live: wb.read(run).map(a => ({ name: a.name, running: a.running, last: a.lastRun })) }, null, 1));
else { console.error('usage: prompt|plan|record|status --run R'); process.exit(2); }
