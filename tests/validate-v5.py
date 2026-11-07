# -*- coding: utf-8 -*-
"""SIGAP v5.0 offline validation. Not a live test: it checks configuration, data and deterministic tools.
Run: python -I tests/validate-v5.py
"""
import glob, json, os, re, shutil, subprocess, sys, tempfile
sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INSTALLED = r'C:\Users\rikh\.workbuddy-ai\skills'
DRIVE_OPS = 'G:/My Drive/Hackathon_Tencent/IT Operation'
DATA_OP = 'G:/My Drive/Hackathon_Tencent/Data-Operation'
results = []
def check(name, ok, detail=''):
    results.append((name, bool(ok), detail)); print(('PASS ' if ok else 'FAIL ') + name + (f' — {detail}' if detail else ''))
def read(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
def node(*a):
    r = subprocess.run(['node', *a], cwd=ROOT, capture_output=True, text=True, encoding='utf-8'); return r.returncode, r.stdout + r.stderr

skill = read('skills/iso27001-assessment-workflow/SKILL.md')
check('workflow skill version 5.2', re.search(r'^version:\s*5\.2', skill, re.M))
for s in ['iso27001-assessment-workflow', 'iso27001-knowledge-base', 'iso27001-report-generator']:
    a, b = os.path.join(ROOT, 'skills', s, 'SKILL.md'), os.path.join(INSTALLED, s, 'SKILL.md')
    check(f'installed copy in sync: {s}', os.path.exists(b) and open(a, 'rb').read() == open(b, 'rb').read())
check('no PM-Bispro skill folder (repo/installed)', not os.path.exists(os.path.join(ROOT, 'skills', 'agent-pm-bispro')) and not os.path.exists(os.path.join(INSTALLED, 'agent-pm-bispro')))
active = {p: read(p) for p in ['skills/iso27001-assessment-workflow/SKILL.md', 'skills/iso27001-knowledge-base/SKILL.md', 'skills/iso27001-report-generator/SKILL.md', 'simulation/staff-personas.json', 'simulation/REAL-ASSESSMENT-FLOW.md']}
body = {p: t.split('## Changelog')[0] for p, t in active.items()}
check('no patch rules "instruksi user run NN"', not any(re.search(r'instruksi user run 0\d', t) for t in body.values()))
check('no trigger patrol / wake-by-proxy / PM-Bispro in active rules', not any(re.search(r'Patroli Trigger|WAKE-BY-PROXY|arm trigger|agent-pm-bispro', t, re.I) for t in body.values()))
check('no "pesan apa pun = izin/aksi" rule', not any(re.search(r'pesan (user )?apa pun\s*=\s*(izin|resume \+ aksi|aksi|jawaban)', t, re.I) for t in body.values()))
check('no numeric scoring vocabulary in active rules', not any(re.search(r'\bskor\s*\d|\b[1-5]\s*/\s*5\b|severity\s*\((Critical|High)', t, re.I) for t in body.values()))
for lab in ['Conform', 'Minor NC', 'Major NC', 'OFI', 'N/A']:
    check(f'status label defined: {lab}', f'**{lab}**' in skill)
cat = re.findall(r'^\| OUTBOX.*$', skill, re.M)
check('OUTBOX card: executing option not first', cat and not cat[0].split('|')[3].strip().startswith('`Setujui'))
check('free text never approves (rule present)', 'tidak pernah menjadi approval' in skill)
pers = json.loads(active['simulation/staff-personas.json'])
check('staff tasks: google-drive only (no Gmail)', pers.get('connector_staf') == ['google-drive'])
check('auditor is EXTERNAL and sends report', pers['peran']['auditor']['pihak'] == 'EKSTERNAL' and any('distribusi' in x for x in pers['peran']['auditor']['tanggung_jawab']))
check('manager forbidden to publish audit results', any('mengirim hasil audit' in x for x in pers['peran']['manager']['dilarang']))
scope = read('data/mock/scope-demo.json')
check('scope-demo has no expected-result hints', not re.search(r'harus|sengaja|uji ', scope, re.I))
key = json.loads(read('data/mock/test-expected-results.json'))
check('answer key has expected_status_v5 for all 13', all('expected_status_v5' in c for c in key['expected_control_results']) and len(key['expected_control_results']) == 13)
do_files = [f for f in glob.glob(DATA_OP + '/*') if os.path.isfile(f)]
hint = [f for f in do_files if re.search(r'\bpenguji\b', open(f, encoding='utf-8', errors='ignore').read(), re.I)]
check('Data-Operation: 0 tester notes, no index.html', do_files and not hint and not os.path.exists(DATA_OP + '/index.html'), f'{len(do_files)} files')
man = json.load(open(os.path.join(ROOT, 'simulation', 'data-operation-manifest.json'), encoding='utf-8'))
check('Data-Operation manifest matches folder', len(man['files']) == len(do_files))
check('IT Operation empty before run', not [f for f in glob.glob(DRIVE_OPS + '/*/*') if os.path.isfile(f)])
check('SKILL: agents never create evidence + collect flow', 'Agen tidak pernah membuat bukti' in skill and 'evidence.js collect' in skill)
bad_json = []
for p in glob.glob(os.path.join(ROOT, 'data', '**', '*.json'), recursive=True) + glob.glob(os.path.join(ROOT, 'simulation', '*.json')) + [os.path.join(ROOT, 'progress-dashboard', 'progress.json'), os.path.join(ROOT, 'audit-log', 'entries.json')]:
    try: json.load(open(p, encoding='utf-8'))
    except Exception as e: bad_json.append(f'{os.path.relpath(p, ROOT)}: {e}')
check('all JSON valid', not bad_json, '; '.join(bad_json))
# tools
rc, out = node('tools/schedule.js', 'slot', '--date', '2026-11-06', '--start', '11:45', '--end', '12:30', '--zone', 'WIB', '--contacts', 'c03,c04')
check('schedule: Friday 11:45 WIB rejected for both zones', rc == 1 and out.count('salat Jumat') == 2)
rc, out = node('tools/schedule.js', 'slot', '--date', '2026-11-02', '--start', '09:00', '--end', '10:00', '--zone', 'WIB', '--contacts', 'c03')
check('schedule: estimated holiday flagged UNVERIFIED', '"UNVERIFIED"' in out)
rc, out = node('tools/schedule.js', 'slot', '--date', '2026-11-13', '--start', '10:45', '--end', '11:15', '--zone', 'WIB', '--contacts', 'c02,c03')
check('schedule: Friday 10:45 WIB rejected for the Makassar (WITA) contact only', rc == 1 and out.count('salat Jumat') == 1 and 'WITA' in out)
cts = json.loads(read('data/mock/contacts.json'))['contacts']
check('contacts v5.4: every contact named, exactly one Budi, two Pratama', all(c.get('name') and not c['name'].startswith('Auditor') for c in cts) and sum(c['name'].split()[0] == 'Budi' for c in cts) == 1 and sum(c['name'].endswith('Pratama') for c in cts) == 2)
rc, out = node('tools/schedule.js', 'future', '2026-11-05T07:30:52Z')
check('schedule: past scheduledAt rejected', rc == 1)
rc, out = node('tools/audit.js', 'validate'); check('audit log valid', rc == 0, out.strip())
tmp = tempfile.mkdtemp(); run = 'VALIDATE-V5'
os.environ['SIGAP_RUNS'] = os.path.join(tmp, 'runs')   # isolated copy: own runs dir, audit log and seal (R09-F20)
def rm_ro(p):
    import stat
    shutil.rmtree(p, onerror=lambda fn, x, e: (os.chmod(x, stat.S_IWRITE), fn(x)))
try:
    p1 = os.path.join(tmp, 'p1.json'); json.dump({'to': ['budi.pratama@ndp-fiction.co.id'], 'subject': 's', 'body': 'b'}, open(p1, 'w'))
    rc, out = node('tools/outbox.js', 'create', '--run', run, '--kind', 'email', '--file', p1); check('outbox: address outside the SIGAP aliases blocked', rc == 1)
    p2 = os.path.join(tmp, 'p2.json'); json.dump({'to': ['rikh.brie+direksi@gmail.com'], 'subject': 's', 'body': 'b'}, open(p2, 'w'))
    rc, out = node('tools/outbox.js', 'create', '--run', run, '--kind', 'email', '--file', p2); rec = json.loads(out)
    rc, _ = node('tools/outbox.js', 'verify', '--run', run, '--id', rec['id']); check('outbox: unapproved cannot execute', rc == 1)
    rc, _ = node('tools/outbox.js', 'decide', '--run', run, '--id', rec['id'], '--sha', rec['sha256'], '--option', 'ok kirim', '--actor', 't', '--channel', 'dashboard'); check('outbox: free text rejected', rc == 1)
    rc, _ = node('tools/outbox.js', 'decide', '--run', run, '--id', rec['id'], '--sha', rec['sha256'], '--option', 'Setujui sesuai preview', '--actor', 't', '--channel', 'dashboard')
    rc, _ = node('tools/outbox.js', 'verify', '--run', run, '--id', rec['id']); check('outbox: approved verifies', rc == 0)
    f = os.path.join(tmp, 'runs', run, 'outbox', rec['id'] + '.json')
    try: open(f, 'a').close(); writable = True
    except PermissionError: writable = False
    check('outbox: record is read-only on disk', not writable)
    import stat; os.chmod(f, stat.S_IWRITE); r = json.load(open(f)); r['payload']['to'] = ['rikh.brie+network@gmail.com']; json.dump(r, open(f, 'w'))
    rc, out = node('tools/outbox.js', 'verify', '--run', run, '--id', rec['id'])
    check('outbox: tampered payload restored from seal; only the approved payload executes', rc == 0 and 'rikh.brie+direksi@gmail.com' in out and 'rikh.brie+network' not in out, out[:160])
finally:
    del os.environ['SIGAP_RUNS']; rm_ro(tmp)
tmpf = os.path.join(DRIVE_OPS, 'Network & User', '__validator-fake.md')
try:
    open(tmpf, 'w', encoding='utf-8').write('dokumen buatan agen')
    os.makedirs(os.path.join(ROOT, 'runs', 'VALIDATE-EV', 'outbox'), exist_ok=True)
    json.dump({'id': 'RELEASE-001', 'kind': 'release', 'status': 'APPROVED', 'payload': {'files': ['__validator-fake.md']}}, open(os.path.join(ROOT, 'runs', 'VALIDATE-EV', 'outbox', 'RELEASE-001.json'), 'w'))
    rc, _ = node('tools/evidence.js', 'add', '--run', 'VALIDATE-EV', '--src', tmpf, '--owner', 'network-user', '--approval', 'RELEASE-001')
    check('evidence: agent-made file refused (not in manifest)', rc == 1)
finally:
    os.path.exists(tmpf) and os.remove(tmpf); shutil.rmtree(os.path.join(ROOT, 'runs', 'VALIDATE-EV'), ignore_errors=True)
if os.path.exists(os.path.join(ROOT, 'runs', 'ISO270001-07', 'penilaian-assesor-log.md')):
    rc, out = node('tools/evidence.js', 'check', '--run', 'ISO270001-07', '--file', 'runs/ISO270001-07/penilaian-assesor-log.md')
    check('evidence check catches run-07 log (off-index citations + scores)', rc == 1)

# owner model, no mock, schema tool, dashboard waiting cards, contact c02
sc2 = json.loads(read('data/mock/scope-demo.json'))
owners_ok = all(c.get('pic_kontak') and c.get('task_pengumpul') in (['manager'] + [s['id'] for s in pers['staf']]) for c in sc2['in_scope_controls'] + sc2['kandidat_klausul'])
check('scope items carry pic_kontak + valid task_pengumpul', owners_ok)
check('no mock generators in simulation/', not glob.glob(os.path.join(ROOT, 'simulation', 'generate-*.py')))
check('no mock evidence in data/mock/evidence (restricted only)', not [f for f in glob.glob(os.path.join(ROOT, 'data', 'mock', 'evidence', '*')) if os.path.isfile(f)])
check('SKILL: dashboard menunggu_kartu + state.js', 'menunggu_kartu' in skill and 'state.js check' in skill)
c02 = [c for c in json.loads(read('data/mock/contacts.json'))['contacts'] if c['id'] == 'c02'][0]
check('contact c02 no longer uses the auditor alias', '+assesor' not in c02['email'])
os.makedirs(os.path.join(ROOT, 'runs', 'VALIDATE-ST'), exist_ok=True)
try:
    json.dump({'fokus': [{'item': 'A.9.1', 'task_pengumpul': 'hr'}], 'jadwal': []}, open(os.path.join(ROOT, 'runs', 'VALIDATE-ST', 'proposal.json'), 'w'))
    json.dump({'queue': [{'item': 'A.6.3', 'status': 'dijawab'}]}, open(os.path.join(ROOT, 'runs', 'VALIDATE-ST', 'klarifikasi-bukti.json'), 'w'))
    rc, out = node('tools/state.js', 'check', '--run', 'VALIDATE-ST', '--file', 'proposal'); check('state: bad proposal rejected (A.9.1, <3 items, bad owner)', rc == 1 and 'A.9.1' in out)
    rc, out = node('tools/state.js', 'check', '--run', 'VALIDATE-ST', '--file', 'klarifikasi'); check('state: self-answered clarification rejected', rc == 1)
finally:
    shutil.rmtree(os.path.join(ROOT, 'runs', 'VALIDATE-ST'), ignore_errors=True)
arch = read('docs/ARSITEKTUR.html')
check('architecture doc v5: trust boundaries, no v4 concepts', 'BATAS 5' in arch and not re.search(r'PM-Bispro|(?<!tanpa )skor|QA Reviewer|Bukti tidak cukup', arch))

# v5.1 (run 08 fixes)
check('v5.1: task templates forbid AskUserQuestion, decisions via dashboard', skill.count('JANGAN memakai AskUserQuestion') >= 2 and '#approvals' in skill)
check('v5.1: SETELAH TOLAK card + every Manager turn ends with a card', 'SETELAH TOLAK' in skill and 'Setiap turn di chat Manager diakhiri kartu' in skill)
check('v5.1: Indonesian language rule at top + both templates', skill.split('## 0.')[0].count('Bahasa Indonesia') >= 1 and skill.count('SELALU berbahasa Indonesia') == 2)
import socket, urllib.request, time
tmp2 = tempfile.mkdtemp(); env = dict(os.environ, SIGAP_RUNS=os.path.join(tmp2, 'runs'), SIGAP_EVIDENCE_ROOT=os.path.join(tmp2, 'ev'), SIGAP_AUDIT=os.path.join(tmp2, 'audit.json'), SIGAP_DASH_PORT='4175')
open(env['SIGAP_AUDIT'], 'w').write('[]')
srv = None; staged = os.path.join(DRIVE_OPS, 'Data Center & Server', 'ev-a7-02-log-pengunjung.md')
staged_pre = os.path.exists(staged)  # R12: never delete a staff copy that existed before the test (run in progress)
try:
    def tool(*a): r = subprocess.run(['node', *a], cwd=ROOT, env=env, capture_output=True, text=True, encoding='utf-8'); return r.returncode, r.stdout + r.stderr
    tool('tools/evidence.js', 'collect', '--run', 'VD', '--owner', 'dc-server', '--file', 'ev-a7-02-log-pengunjung.md', '--item', 'A.7.2', '--reason', 'validator')
    pj = os.path.join(tmp2, 'p.json'); json.dump({'owner': 'dc-server', 'sumber_folder': os.path.dirname(staged), 'files': ['ev-a7-02-log-pengunjung.md']}, open(pj, 'w'))
    rc, out = tool('tools/outbox.js', 'create', '--run', 'VD', '--kind', 'release', '--title', 'v', '--file', pj); rec = json.loads(out)
    srv = subprocess.Popen(['node', 'progress-dashboard/server.js'], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1.5)
    pend = json.loads(urllib.request.urlopen('http://127.0.0.1:4175/api/pending').read())
    check('dashboard: pending item listed', any(x['id'] == rec['id'] for x in pend))
    req = urllib.request.Request('http://127.0.0.1:4175/api/decide', data=json.dumps({'run': 'VD', 'id': rec['id'], 'sha': rec['sha256'], 'option': 'Setujui sesuai preview'}).encode(), method='POST')
    res = json.loads(urllib.request.urlopen(req).read())
    rc, lst = tool('tools/evidence.js', 'list', '--run', 'VD')
    check('dashboard: approved release executed by server (indexed, EXECUTED)', res.get('ok') and 'ev-a7-02' in lst and json.load(open(os.path.join(tmp2, 'runs', 'VD', 'outbox', rec['id'] + '.json')))['status'] == 'EXECUTED')
    check('dashboard: decision audited as human UI actor', 'dashboard (manusia)' in open(env['SIGAP_AUDIT'], encoding='utf-8').read())
finally:
    srv and srv.kill(); (not staged_pre) and os.path.exists(staged) and os.remove(staged); shutil.rmtree(tmp2, ignore_errors=True)

# v5.2 proportional selection (R09-F1)
check('v5.2: language rule survives compression + templates reference installed version', skill.count('Setelah konteks dipadatkan, baca ulang SKILL') == 2 and 'SKILL.md v5.0' not in skill.split('## Changelog')[0])
check('v5.2: staff decompose bukti_diminta, no numeric cap per butir', 'pecah `bukti_diminta`' in skill and 'tanpa batas angka' in skill and 'alasan-lebih' not in skill)
tmp3 = tempfile.mkdtemp(); env3 = dict(os.environ, SIGAP_RUNS=os.path.join(tmp3, 'runs'))
os.makedirs(os.path.join(tmp3, 'runs', 'VP')); json.dump({'versi_skill': '5.2', 'requests': []}, open(os.path.join(tmp3, 'runs', 'VP', 'requests.json'), 'w'))
staged3 = os.path.join(DRIVE_OPS, 'Network & User', 'ev-a5-15-matriks-akses.md')
staged3_pre = os.path.exists(staged3)
try:
    def t3(*a): r = subprocess.run(['node', *a], cwd=ROOT, env=env3, capture_output=True, text=True, encoding='utf-8'); return r.returncode, r.stdout + r.stderr
    rc, _ = t3('tools/evidence.js', 'collect', '--run', 'VP', '--owner', 'network-user', '--file', 'ev-a5-15-matriks-akses.md', '--item', 'A.5.15', '--reason', 'x')
    check('v5.2: collect without --butir refused', rc == 1)
    for _ in range(3): t3('tools/evidence.js', 'collect', '--run', 'VP', '--owner', 'network-user', '--file', 'ev-a5-15-matriks-akses.md', '--item', 'A.5.15', '--butir', '1', '--reason', 'x')
    rc, _ = t3('tools/evidence.js', 'collect', '--run', 'VP', '--owner', 'network-user', '--file', 'ev-a5-15-matriks-akses.md', '--item', 'A.5.15', '--butir', '1', '--reason', 'x')
    check('v5.2: 4th document for one butir accepted (no numeric cap)', rc == 0)
finally:
    (not staged3_pre) and os.path.exists(staged3) and os.remove(staged3); shutil.rmtree(tmp3, ignore_errors=True)
rc, out = node('tools/state.js', 'check', '--run', 'ISO270001-09', '--file', 'requests')
check('v5.2 rule does not break running v5.1 run 09', rc == 0, out.strip()[:120])
# Four verbatim occurrences: §0 rule 9, §7 per-task memory, Auditor template, Staf template.
check('scope rule: exact out-of-scope reply for all roles + templates', skill.count('Mohon maaf, permintaan atau pembahasan tersebut tidak ada di scope kami.') == 4)
check('scope rule planted in per-task automation memory', 'memory/automations/<id-automation>/memory.md' in skill)
check('automation only by Manager via outbox (auditor/staff forbidden)', 'Auditor dan staf TIDAK PERNAH memanggil `automation_update`' in skill)
# Aturan 0 (6 Nov, masukan user): dashboard is a run-critical, always-on service.
rule0 = re.search(r'^0\. \*\*Dashboard = layanan kritikal run \(ATURAN PERTAMA\)\.\*\*', skill, re.M)
check('rule 0 is the first principle', bool(rule0) and rule0.start() < skill.index('1. **Sumber**'))
check('rule 0: fail-closed, netstat, one healthy instance, explicit IPv4', all(s in skill for s in ['fail-closed', 'netstat -ano | findstr :4173', 'hanya satu instance', '127.0.0.1:4173/?run=<RUN>#manager']))
check('rule 0: honest 0 ms limit is disclosed', 'target nol downtime bukan jaminan platform' in skill and 'instance redundan + proxy failover' in skill)
check('rule 0: watchdog exists and is wired into npm scripts', os.path.exists(os.path.join(ROOT, 'progress-dashboard', 'watchdog.js')) and '"watchdog": "node watchdog.js"' in read('progress-dashboard/package.json'))
node_wd = subprocess.run(['node', '--check', 'progress-dashboard/watchdog.js'], cwd=ROOT, capture_output=True, text=True)
check('rule 0: watchdog JavaScript parses', node_wd.returncode == 0, (node_wd.stdout + node_wd.stderr).strip()[:120])
# Trigger phrase also starts the dashboard (user, 6 Nov 14:54 WIB).
check('trigger: npm run ensure is the FIRST FASE 0 action, before RUN allocation', 'LANGKAH PERTAMA: trigger ini juga menyalakan dashboard' in skill and 'npm run ensure' in skill and 'DASHBOARD_DOWN' in skill)
check('trigger: ensure script wired into npm scripts', os.path.exists(os.path.join(ROOT, 'progress-dashboard', 'ensure-dashboard.js')) and '"ensure": "node ensure-dashboard.js"' in read('progress-dashboard/package.json'))
node_en = subprocess.run(['node', '--check', 'progress-dashboard/ensure-dashboard.js'], cwd=ROOT, capture_output=True, text=True)
check('trigger: ensure JavaScript parses', node_en.returncode == 0, (node_en.stdout + node_en.stderr).strip()[:120])
import socket
_probe = socket.socket(); _probe.bind(('127.0.0.1', 0)); _free = _probe.getsockname()[1]; _probe.close()
_env_free = dict(os.environ, SIGAP_DASH_PORT=str(_free))
_res = subprocess.run(['node', 'progress-dashboard/ensure-dashboard.js', '--check-only'], cwd=ROOT, env=_env_free, capture_output=True, text=True)
check('trigger: preflight fails closed when dashboard is down (no RUN allocated)', _res.returncode == 1 and 'DASHBOARD_DOWN' in _res.stdout, (_res.stdout + _res.stderr).strip()[:120])
check('trigger: run-counter mechanism starts dashboard at step (0)', '(0) TRIGGER = NYALAKAN DASHBOARD' in read('simulation/run-counter.json'))
check('PPT required among final documents', 'Presentasi-Hasil-Audit-<RUN>.pptx' in skill and 'Presentasi-Hasil-Audit' in read('skills/iso27001-report-generator/SKILL.md'))
tmp4 = tempfile.mkdtemp(); env4 = dict(os.environ, SIGAP_RUNS=os.path.join(tmp4, 'runs'))
pj4 = os.path.join(tmp4, 'r.json'); json.dump({'artefak': [{'file': 'SoA-X.xlsx'}, {'file': 'Laporan-X.docx'}]}, open(pj4, 'w'))
r4 = subprocess.run(['node', 'tools/outbox.js', 'create', '--run', 'VR', '--kind', 'report', '--file', pj4], cwd=ROOT, env=env4, capture_output=True, text=True)
check('outbox: report without .pptx refused', r4.returncode == 1 and 'pptx' in (r4.stderr + r4.stdout))
shutil.rmtree(tmp4, ignore_errors=True)
# R09-F18..F21: integrity guard, audit-log rules, deck name, test isolation, phase from system state
rd = subprocess.run(['node', 'tests/test-dashboard-run.js'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
check('dashboard shows only the ACTIVE run (never a stopped/cancelled one), new run at FASE 0 before its folder exists, other runs'' notes ignored', rd.returncode == 0, (rd.stdout + rd.stderr).strip().splitlines()[-1:])
rs = subprocess.run(['node', 'tests/test-supervisor.js'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
check('Pengawas: re-arm stalled/failed task (same prompt), one at a time, back-off, max 3 then dashboard escalation; Pengawas/wake guards', rs.returncode == 0, (rs.stdout + rs.stderr).strip().splitlines()[-1:] if (rs.stdout + rs.stderr).strip() else '')
check('SKILL: Pengawas in the dashboard server, Manager never re-arms/wakes, ESKALASI card, Tindak lanjut button', 'Pengawas** berjalan otomatis di server dashboard' in skill and 'Manager TIDAK PERNAH membangunkan' in skill and 'ESKALASI (Pengawas)' in skill and 'Tindak lanjut' in skill)
ri = subprocess.run(['node', 'tests/test-integrity.js'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
check('integrity: seal/restore records + audit log, reserved actors, no edit claims, deck name, test isolation', ri.returncode == 0, (ri.stdout + ri.stderr).strip().splitlines()[-1:] )
rv = subprocess.run(['node', 'tools/audit.js', 'validate'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
check('real audit log: valid JSON and hash chain intact', rv.returncode == 0, (rv.stdout + rv.stderr).strip()[:120])
check('SKILL rules 11-12: immutable outbox + honest audit log', 'Record outbox tidak dapat diubah' in skill and 'Log audit hanya lewat `tools/audit.js`, dan harus jujur' in skill)
check('dashboard phase follows system state (distribution sent = FASE 8)', 'distSent ? 8' in read('progress-dashboard/runinfo.js'))
n_ok = sum(1 for _, ok, _ in results if ok)
print(f'\n{n_ok}/{len(results)} checks passed')
sys.exit(0 if n_ok == len(results) else 1)
