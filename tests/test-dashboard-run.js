// The dashboard must always show the ACTIVE run and never a stopped/finished one (user, 6 Nov: "dashboard itu paling fatal").
'use strict';
const fs = require('fs'); const path = require('path'); const os = require('os');
const ROOT = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sigap-dash-')); const runs = path.join(tmp, 'runs'); fs.mkdirSync(runs);
const counter = path.join(tmp, 'run-counter.json'); const prog = path.join(tmp, 'progress.json');
process.env.SIGAP_RUN_COUNTER = counter; process.env.SIGAP_AUDIT = path.join(tmp, 'audit.json'); fs.writeFileSync(process.env.SIGAP_AUDIT, '[]');
const load = () => { for (const m of ['progress-dashboard/runinfo.js', 'progress-dashboard/agents.js']) delete require.cache[path.join(ROOT, m)]; return require(path.join(ROOT, 'progress-dashboard', 'runinfo.js')); };
let pass = 0, fail = 0; const check = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : ' — ' + JSON.stringify(x).slice(0, 220))); };
const setCounter = h => fs.writeFileSync(counter, JSON.stringify({ run_terakhir: h[h.length - 1].no, riwayat: h }));
fs.mkdirSync(path.join(runs, 'ISO270001-12', 'outbox'), { recursive: true });
fs.writeFileSync(path.join(runs, 'ISO270001-12', 'proposal.json'), JSON.stringify({ fokus: [{ item: 'A.8.13', task_pengumpul: 'dc-server' }] }));
fs.writeFileSync(prog, JSON.stringify({ run: 'ISO270001-12', fase: 'FASE 3 — lama', sedang: { kontrol: 'run 12', aktivitas: 'LAMA' }, menunggu_kartu: [{ kartu: 'LAMA' }] }));

setCounter([{ no: 12, status: 'dihentikan user di FASE 3/4' }]);
let r = load().runInfo(runs, prog);
check('stopped last run -> shown read-only as ENDED (all data kept, never as running)', r.run === 'ISO270001-12' && r.ended === true && /dihentikan/.test(r.endedStatus) && r.agents.every(a => !a.action), r);

setCounter([{ no: 12, status: 'dihentikan' }, { no: 13, status: 'dibatalkan user' }]);
r = load().runInfo(runs, prog); check('cancelled last run -> still none (never falls back to run 12)', r.run === null && r.last.run === 'ISO270001-13', r);

setCounter([{ no: 12, status: 'dihentikan' }, { no: 13, status: 'dibatalkan' }, { no: 14, status: 'berjalan', mulai: '2026-11-06T15:00:00+07:00' }]);
r = load().runInfo(runs, prog);
check('new run allocated, folder not yet created -> run 14 shown at FASE 0, no old data', r.run === 'ISO270001-14' && r.starting && r.fase_no === 0 && !r.items.length && !r.menunggu_kartu.length && !/LAMA/.test(JSON.stringify(r)), r);

fs.mkdirSync(path.join(runs, 'ISO270001-14', 'outbox'), { recursive: true });
r = load().runInfo(runs, prog);
check('run 14 folder exists -> run 14 overview at FASE 0 (header chip shows the phase); progress.json of run 12 ignored', r.run === 'ISO270001-14' && !r.starting && r.fase_no === 0 && !/LAMA|run 12/.test(JSON.stringify(r.sedang) + JSON.stringify(r.menunggu_kartu)), r);
check('activeRun agrees (single source of truth for overview, decisions and Pengawas)', load().activeRun(runs).run === 'ISO270001-14');
fs.writeFileSync(path.join(runs, 'ISO270001-14', 'outbox', 'AUTOMATION-001.json'), JSON.stringify({ id: 'AUTOMATION-001', kind: 'automation', title: 'task Auditor', status: 'EXECUTED', sha256: 'x', payload: { name: 'ISO270001-14 Auditor' }, history: [] }));
r = load().runInfo(runs, prog); check('Auditor task created, no proposal yet -> FASE 1 (the Auditor turn, so the Pengawas wakes it if it never fires)', r.fase_no === 1, r.fase_no);

setCounter([{ no: 14, status: 'berjalan' }, { no: 15, status: 'dihentikan' }]);
check('an older "berjalan" entry below a stopped newer run is not active', load().activeRun(runs).run === null);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
