// SIGAP R09-F18/F19/F20 integration test on a temp copy of run 09 (never touches real runs/, audit-log/ or the real seal).
// Run: node tests/test-integrity.js
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const realLog = JSON.parse(fs.readFileSync(ROOT + '/audit-log/entries.json', 'utf8')).length;
const T = fs.mkdtempSync(path.join(os.tmpdir(), 'sigap-int-'));
const RUNS = path.join(T, 'runs'); fs.mkdirSync(path.join(RUNS, 'ISO270001-09'), { recursive: true });
fs.cpSync(ROOT + '/runs/ISO270001-09/outbox', path.join(RUNS, 'ISO270001-09', 'outbox'), { recursive: true });
for (const f of fs.readdirSync(path.join(RUNS, 'ISO270001-09', 'outbox'))) fs.chmodSync(path.join(RUNS, 'ISO270001-09', 'outbox', f), 0o644);
const env = Object.assign({}, process.env, { SIGAP_RUNS: RUNS }); delete env.SIGAP_AUDIT; delete env.SIGAP_SYSTEM; delete env.SIGAP_SEAL;
const run = (tool, ...a) => { const r = spawnSync(process.execPath, [ROOT + '/tools/' + tool, ...a], { cwd: ROOT, env, encoding: 'utf8' }); return { rc: r.status, out: (r.stdout || '') + (r.stderr || '') }; };
let pass = 0, fail = 0; const ok = (n, c, extra) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  -> ' + String(extra || '').slice(0, 300))); };
const OB = path.join(RUNS, 'ISO270001-09', 'outbox');

let r = run('outbox.js', 'guard', '--run', 'ISO270001-09'); const g = JSON.parse(r.out);
ok('first guard seals all intact records', g.sealed.length >= 10 && !g.tampered_unsealed.length, r.out);
const f19 = path.join(OB, 'SERAH_TERIMA-019.json');
let wr = true; try { fs.writeFileSync(f19, 'x'); } catch (e) { wr = false; }
ok('record is read-only on disk (direct write fails)', !wr);
fs.chmodSync(f19, 0o644); const o = JSON.parse(fs.readFileSync(f19, 'utf8')); o.payload.catatan += ' diperluas'; fs.writeFileSync(f19, JSON.stringify(o));
r = run('outbox.js', 'guard', '--run', 'ISO270001-09');
ok('edited record restored from seal', JSON.parse(r.out).restored.includes('SERAH_TERIMA-019'), r.out);
ok('restored content equals original', fs.readFileSync(f19).equals(fs.readFileSync(ROOT + '/runs/ISO270001-09/outbox/SERAH_TERIMA-019.json')));
ok('tampered copy kept as evidence', fs.readdirSync(path.join(RUNS, 'ISO270001-09', 'tamper')).length === 1);
fs.chmodSync(path.join(OB, 'EMAIL-018.json'), 0o644); fs.unlinkSync(path.join(OB, 'EMAIL-018.json'));
r = run('outbox.js', 'list', '--run', 'ISO270001-09');
ok('deleted record restored on next tool call', fs.existsSync(path.join(OB, 'EMAIL-018.json')) && /EMAIL-018/.test(r.out), r.out);
const testLog = path.join(T, 'audit-entries.json');
ok('test run writes its own audit log', fs.existsSync(testLog) && JSON.parse(fs.readFileSync(testLog, 'utf8')).some(e => e.aksi === 'pemulihan_otomatis_item_keputusan'));
r = run('audit.js', 'append', '--run', 'ISO270001-09', '--fase', 'X', '--aktor', 'dashboard (manusia)', '--aksi', 'palsu');
ok('agent cannot use a reserved system actor', r.rc === 1 && /reserved/.test(r.out), r.out);
r = run('audit.js', 'append', '--run', 'ISO270001-09', '--fase', 'FASE 7', '--aktor', 'Auditor (agen)', '--aksi', 'serah_terima_SERAH_TERIMA-019_diperluas_cakup_presentasi', '--output', 'blok terbuka');
ok('agent cannot log a change to a decision item', r.rc === 1 && /immutable/.test(r.out), r.out);
r = run('audit.js', 'append', '--run', 'ISO270001-09', '--fase', 'FASE 7', '--aktor', 'Auditor (agen)', '--aksi', 'cek_distribusi', '--output', 'blok distribusi terbuka; EMAIL-018 siap');
ok('agent entry mentioning an item gets the real status attached', r.rc === 0 && /EMAIL-018: EXECUTED/.test(JSON.parse(r.out).status_sistem || ''), r.out);
r = run('audit.js', 'append', '--run', 'ISO270001-09', '--fase', 'FASE 3', '--aktor', 'Staf Cyber Security (agen)', '--aksi', 'bukti_ditambahkan', '--output', '3 berkas ditambahkan, status requests.json diubah (RELEASE-006)');
ok('normal agent wording is still accepted', r.rc === 0, r.out);
fs.chmodSync(testLog, 0o644); const L = JSON.parse(fs.readFileSync(testLog, 'utf8')); L[0].output = 'dipalsukan'; fs.writeFileSync(testLog, JSON.stringify(L));
r = run('audit.js', 'guard', '--run', 'ISO270001-09');
ok('edited audit log restored from seal', /restored/.test(r.out) && JSON.parse(fs.readFileSync(testLog, 'utf8'))[0].output !== 'dipalsukan', r.out);
r = run('audit.js', 'validate'); ok('audit chain intact after restore', r.rc === 0, r.out);
const pj = path.join(T, 'rep.json'); fs.writeFileSync(pj, JSON.stringify({ artefak: [{ file: 'SoA.xlsx' }, { file: 'Presentasi-Audit-ISO270001-09.pptx' }] }));
r = run('outbox.js', 'create', '--run', 'ISO270001-09', '--kind', 'report', '--file', pj);
ok('report with wrongly named deck refused', r.rc === 1 && /named exactly Presentasi-Hasil-Audit-ISO270001-09\.pptx/.test(r.out), r.out);
ok('real audit log untouched', JSON.parse(fs.readFileSync(ROOT + '/audit-log/entries.json', 'utf8')).length === realLog);
const realIdx = path.join(process.env.LOCALAPPDATA, 'sigap-seal', 'index.txt');
ok('real seal root untouched by the test', !fs.existsSync(realIdx) || !fs.readFileSync(realIdx, 'utf8').includes(path.basename(T)));
console.log(pass + '/' + (pass + fail) + ' passed');
for (const p of [OB, path.join(T, 'seal')]) { try { for (const f of fs.readdirSync(p)) fs.chmodSync(path.join(p, f), 0o644); } catch (e) {} }
try { fs.chmodSync(testLog, 0o644); } catch (e) {}
fs.rmSync(T, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
