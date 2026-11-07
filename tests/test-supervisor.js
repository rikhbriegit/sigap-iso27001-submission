// Offline tests for the Pengawas (tools/supervisor.js) with a simulated WorkBuddy state (SIGAP_WBSTATE_FILE).
'use strict';
const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..'); const RUN = 'ISO270001-99';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sigap-sup-')); const runs = path.join(tmp, 'runs'); const rd = path.join(runs, RUN);
fs.mkdirSync(path.join(rd, 'outbox'), { recursive: true });
const wbf = path.join(tmp, 'wb.json'); const env = Object.assign({}, process.env, { SIGAP_RUNS: runs, SIGAP_AUDIT: path.join(tmp, 'audit.json'), SIGAP_SEAL: path.join(tmp, 'seal'), SIGAP_WBSTATE_FILE: wbf });
fs.writeFileSync(env.SIGAP_AUDIT, '[]');
const node = (...a) => { const r = spawnSync(process.execPath, ['--no-warnings', ...a], { cwd: ROOT, env, encoding: 'utf8' }); return { rc: r.status, out: (r.stdout || '') + (r.stderr || '') }; };
let pass = 0, fail = 0; const check = (name, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || !extra ? '' : ' — ' + String(extra).slice(0, 200))); };
const now = Date.now(); const iso = ms => new Date(ms + 7 * 3600e3).toISOString().slice(0, 19) + '+07:00';
fs.writeFileSync(path.join(rd, 'proposal.json'), JSON.stringify({ fokus: [{ item: 'A.8.13', task_pengumpul: 'dc-server' }, { item: 'A.5.23', task_pengumpul: 'manager' }] }));
const gate = { id: 'GATE-001', kind: 'gate', title: 'GATE 1', status: 'EXECUTED', sha256: 'x', payload: { fase: 'GATE 1' }, history: [{ at: iso(now - 20 * 60e3), executed: 'x' }] };
fs.writeFileSync(path.join(rd, 'outbox', 'GATE-001.json'), JSON.stringify(gate));
// v5.4 (R16-F4): from run 17 the kickoff invitation approved in GATE 1 must be sent; this fixture run has it sent already
const KICK = { id: 'CALENDAR-002', kind: 'calendar', title: 'Undangan kickoff', status: 'EXECUTED', result: 'gmail:1a1b4251a014bf23', sha256: 'k', payload: { jenis: 'undangan_kickoff' }, history: [] };
fs.writeFileSync(path.join(rd, 'outbox', 'CALENDAR-002.json'), JSON.stringify(KICK));
const STAFF = { id: 'aaa', name: RUN + ' Staf IT Data Center & Server', status: 'ACTIVE', schedule: 'once', scheduledMs: now - 10 * 60e3, promptSha: 'P1', running: false, lastRun: null };
const AUD = { id: 'bbb', name: RUN + ' Auditor', status: 'ACTIVE', schedule: 'once', scheduledMs: now - 60 * 60e3, promptSha: 'P2', running: false, lastRun: { success: true, failure: null, retryable: false, startedMs: now - 50 * 60e3, endedMs: now - 45 * 60e3 } };
const PG = { id: 'ccc', name: RUN + ' Pengawas', status: 'ACTIVE', schedule: 'recurring', promptSha: 'P3', running: false, lastRun: null };
const setWb = arr => fs.writeFileSync(wbf, JSON.stringify(arr));
const plan = () => JSON.parse(node('tools/supervisor.js', 'plan', '--run', RUN).out);

setWb([STAFF, AUD, PG]);
let p = plan();
check('staff never fired past its schedule -> one re-arm (attempt 1/3)', p.actions.length === 1 && p.actions[0].name === STAFF.name && p.actions[0].attempt === 1, JSON.stringify(p));
check('re-run = WorkBuddy Run now of the SAME automation, executed by the server', p.actions[0].via === 'trigger' && p.actions[0].automation_id === 'aaa');
check('Auditor is not woken in FASE 3 while staff have not released', !p.actions.some(a => a.name === AUD.name));
let r = node('tools/supervisor.js', 'record', '--run', RUN, '--id', 'aaa', '--scheduledAt', iso(now + 90e3));
check('record counts the attempt and audits it as system actor', r.rc === 0 && /"attempt":1/.test(r.out) && /sistem \(pengawas\)/.test(fs.readFileSync(env.SIGAP_AUDIT, 'utf8')), r.out);

setWb([Object.assign({}, STAFF, { running: true, runningSince: now - 60e3 }), AUD, PG]);
p = plan(); check('a task is running -> no re-arm (one task at a time)', p.actions.length === 0 && p.working.length === 1, JSON.stringify(p));

setWb([Object.assign({}, STAFF, { lastRun: { failure: 'automation-rate-limited', failurePlain: 'model penuh', retryable: true, startedMs: now - 5 * 60e3, endedMs: now - 60e3 } }), AUD, PG]);
p = plan(); check('rate-limited 1 min ago -> waits (back-off), no immediate retry', p.actions.length === 0, JSON.stringify(p));
setWb([Object.assign({}, STAFF, { lastRun: { failure: 'automation-rate-limited', failurePlain: 'model penuh', retryable: true, startedMs: now - 9 * 60e3, endedMs: now - 4 * 60e3 } }), AUD, PG]);
p = plan(); check('rate-limited 4 min ago -> retry attempt 2', p.actions.length === 1 && p.actions[0].attempt === 2, JSON.stringify(p));
node('tools/supervisor.js', 'record', '--run', RUN, '--id', 'aaa', '--scheduledAt', iso(now + 90e3));
node('tools/supervisor.js', 'record', '--run', RUN, '--id', 'aaa', '--scheduledAt', iso(now + 90e3));
setWb([Object.assign({}, STAFF, { lastRun: { failure: 'automation-rate-limited', failurePlain: 'model penuh', retryable: true, startedMs: now - 30 * 60e3, endedMs: now - 20 * 60e3 } }), AUD, PG]);
p = plan(); const esk = fs.readdirSync(path.join(rd, 'outbox')).filter(f => /^ESKALASI-/.test(f));
check('after 3 retries -> no more retries, one escalation item for the person', p.actions.length === 0 && p.escalated.length === 1 && esk.length === 1, JSON.stringify(p) + ' ' + esk);
plan(); check('escalation is created only once', fs.readdirSync(path.join(rd, 'outbox')).filter(f => /^ESKALASI-/.test(f)).length === 1);

setWb([Object.assign({}, STAFF, { promptSha: 'CHANGED' }), AUD, PG]);
p = plan(); check('task prompt changed after approval -> never retried, escalated', !p.actions.length && p.escalated.some(e => /berubah/.test(e.reason)), JSON.stringify(p));

fs.writeFileSync(path.join(rd, 'evidence-index.json'), JSON.stringify([{ owner: 'dc-server', file: 'x.md', item: 'A.8.13' }]));
setWb([STAFF, AUD, PG]);
p = plan(); check('staff released, Manager item missing -> staff idle, Auditor due for FASE 4 (stopped run woken)', !p.actions.some(a => a.name === STAFF.name) && p.actions.some(a => a.name === AUD.name), JSON.stringify(p));
const pend = { id: 'KLARIFIKASI-002', kind: 'klarifikasi', title: 'k', status: 'PENDING_APPROVAL', sha256: 'y', payload: {}, history: [] };
fs.writeFileSync(path.join(rd, 'outbox', 'KLARIFIKASI-002.json'), JSON.stringify(pend));
p = plan(); check('a decision waits for the person -> Auditor not woken', !p.actions.some(a => a.name === AUD.name) && p.waiting.some(w => w.name === AUD.name), JSON.stringify(p));

// outbox guards for the Pengawas item and for wake tasks after GATE 1
const pr = node('tools/supervisor.js', 'prompt', '--run', RUN).out.trim();
const pf = path.join(tmp, 'pg.json');
fs.writeFileSync(pf, JSON.stringify({ name: RUN + ' Pengawas', prompt: pr + ' extra', scheduleType: 'recurring', rrule: 'FREQ=HOURLY;INTERVAL=1', connectorIds: ['google-drive'] }));
check('Pengawas item with an edited prompt is refused', node('tools/outbox.js', 'create', '--run', RUN, '--kind', 'automation', '--title', 'Pengawas', '--file', pf).rc === 1);
fs.writeFileSync(pf, JSON.stringify({ name: RUN + ' Pengawas', prompt: pr, scheduleType: 'recurring', rrule: 'FREQ=HOURLY;INTERVAL=1', connectorIds: ['google-drive'] }));
check('Pengawas item with the exact tool prompt is accepted', node('tools/outbox.js', 'create', '--run', RUN, '--kind', 'automation', '--title', 'Pengawas', '--file', pf).rc === 0);
fs.writeFileSync(pf, JSON.stringify({ name: RUN + ' Auditor — Resume F5', prompt: 'x', scheduleType: 'once', scheduledAt: iso(now + 9e5), connectorIds: [] }));
check('after GATE 1 a Manager-made wake task for the Auditor is refused', node('tools/outbox.js', 'create', '--run', RUN, '--kind', 'automation', '--title', 'wake', '--file', pf).rc === 1);

// R16-F4: kickoff invitation not sent after GATE 1 -> the Auditor is due (reason says so); once it is pending for a person -> waits
fs.rmSync(path.join(rd, 'outbox', 'CALENDAR-002.json'));
for (const f of fs.readdirSync(path.join(rd, 'outbox')).filter(f => f !== 'GATE-001.json')) fs.rmSync(path.join(rd, 'outbox', f)); // only GATE 1 executed, nothing else
fs.writeFileSync(path.join(rd, 'evidence-index.json'), JSON.stringify([{ owner: 'dc-server', file: 'x.md' }]));
setWb([STAFF, AUD, PG]);
p = plan(); { const a = p.actions.find(x => x.name === AUD.name);
  check('kickoff invitation not sent after GATE 1 -> Auditor re-armed with reason "mengirim undangan rapat kickoff"', a && /mengirim undangan rapat kickoff/.test(a.reason), JSON.stringify(p)); }
fs.rmSync(tmp, { recursive: true, force: true });
console.log(pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
