# -*- coding: utf-8 -*-
"""SIGAP v5.4 — rename people in the company dataset so documents match data/mock/contacts.json v5.4
(operator step, never run by WorkBuddy agents). User decision 7 Nov 2026: every contact has a real name,
exactly one Budi (Budi Pratama, Keuangan), the Pratama pair is the deliberate ambiguity, Cyber Security in Makassar.

Mapping (applied in this order, so names never chain):
  Andi Pratama (IT Infra in documents)  -> Rina Kartika  (c04 Staf IT Network & User)
  Budi Santoso (IT Ops in documents)    -> Andi Pratama  (c03 Staf IT Data Center & Server)
  Riki Wijaya  (IT Security)            -> Fajar Hidayat (c02 Staf IT Cyber Security, Makassar)
  Budi Hartono (Facilities Makassar)    -> Yusuf Ramadhan (not a contact)
1. Back up every changed Data-Operation file to _dataset-archive/Data-Operation-before-rename-<stamp>/.
2. Rewrite in place (UTF-8, LF kept as found).
3. Rewrite simulation/data-operation-manifest.json (file, size, sha256).
Also applied to repo copies: tests/legacy-mock-evidence/*.md, data/mock/evidence/**.
Run: python -I simulation/rename-people-v54.py [--dry-run]
"""
import datetime, glob, hashlib, json, os, re, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRIVE = 'G:/My Drive/Hackathon_Tencent'
DO = os.path.join(DRIVE, 'Data-Operation')
ARCH = os.path.join(DRIVE, '_dataset-archive')
DRY = '--dry-run' in sys.argv
STEPS = [
    ('Andi Pratama', 'Rina Kartika'),
    ('backup: Andi)', 'backup: Rina)'),
    ('Budi Santoso', 'Andi Pratama'),
    ('Riki Wijaya', 'Fajar Hidayat'),
    ('Budi Hartono', 'Yusuf Ramadhan'),
    ('Budi H.', 'Yusuf R.'),
]
LEFT = re.compile(r'Budi Santoso|Riki Wijaya|Budi Hartono|Budi H\.|\bSantoso\b|\bHartono\b|\bWijaya\b')

def rename(text):
    for a, b in STEPS:
        text = text.replace(a, b)
    return text

def rewrite(path, backup_dir=None):
    raw = open(path, 'rb').read()
    try:
        txt = raw.decode('utf-8')
    except UnicodeDecodeError:
        return 0
    new = rename(txt)
    if new == txt:
        return 0
    if LEFT.search(new):
        raise SystemExit(f'old name left in {path}')
    if not DRY:
        if backup_dir:
            os.makedirs(backup_dir, exist_ok=True)
            shutil.copy2(path, os.path.join(backup_dir, os.path.basename(path)))
        open(path, 'wb').write(new.encode('utf-8'))
    return 1

def main():
    stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M')
    bak = os.path.join(ARCH, f'Data-Operation-before-rename-{stamp}')
    n = 0
    for f in sorted(os.listdir(DO)):
        p = os.path.join(DO, f)
        if os.path.isfile(p) and rewrite(p, bak):
            n += 1; print('rename   Data-Operation/' + f)
    m = 0
    for p in glob.glob(os.path.join(ROOT, 'tests', 'legacy-mock-evidence', '*.md')) + glob.glob(os.path.join(ROOT, 'data', 'mock', 'evidence', '**', '*.*'), recursive=True):
        if rewrite(p):
            m += 1; print('rename   ' + os.path.relpath(p, ROOT))
    print(f'{n} Data-Operation files, {m} repo copies' + (' (dry run)' if DRY else f'; backup: {bak}'))
    if DRY:
        return
    man = {'version': 'data-operation-v5.4-2026-11-07', 'root': DO, 'files': []}
    for f in sorted(os.listdir(DO)):
        p = os.path.join(DO, f)
        if os.path.isfile(p):
            b = open(p, 'rb').read()
            man['files'].append({'file': f, 'size': len(b), 'sha256': hashlib.sha256(b).hexdigest()})
    json.dump(man, open(os.path.join(ROOT, 'simulation', 'data-operation-manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"manifest: {len(man['files'])} files")

if __name__ == '__main__':
    main()
