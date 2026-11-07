# -*- coding: utf-8 -*-
"""SIGAP v5 — prepare the evidence source before a run (operator step, never run by WorkBuddy agents).

Source of evidence = G:/My Drive/Hackathon_Tencent/Data-Operation (company document repository).
1. Back up files that carry tester notes (word "PENGUJI") and the catalogue index.html to
   _dataset-archive/Data-Operation-original-2026-11-05/ (once).
2. Remove tester-note blocks in place (traps such as the embedded instruction are kept); move index.html out.
3. Clear IT Operation/<owner>/ (staff working folders start empty) into _dataset-archive/IT-Operation-cleared-<stamp>/.
4. Write simulation/data-operation-manifest.json (file, size, sha256). tools/evidence.js only accepts evidence whose
   sha256 is in this manifest, so agents cannot create or edit evidence.
Run: python -I simulation/prepare-dataset-v5.py [--dry-run]
"""
import datetime, hashlib, json, os, re, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRIVE = 'G:/My Drive/Hackathon_Tencent'
DO = os.path.join(DRIVE, 'Data-Operation')
OPS = os.path.join(DRIVE, 'IT Operation')
ARCH = os.path.join(DRIVE, '_dataset-archive')
HINT = re.compile(r'\bpenguji\b', re.I)
DRY = '--dry-run' in sys.argv

def sanitise(text):
    out, skip = [], None
    for line in text.splitlines():
        if skip == 'eq':
            if re.fullmatch(r'\s*=+\s*', line) or re.search(r'=====\s*$', line):
                skip = None
            continue
        if skip == 'blank':
            if not line.strip():
                skip = None
            continue
        if HINT.search(line):
            if line.lstrip().startswith('#'):
                out.append(re.sub(r'\s*\([^)]*penguji[^)]*\)', '', line, flags=re.I)); continue
            if line.strip().startswith('===') and re.search(r'=====\s*$', line):
                continue
            skip = 'blank' if line.lstrip().startswith('⚠') else 'eq'
            while out and re.fullmatch(r'\s*=+\s*', out[-1]):
                out.pop()
            continue
        out.append(line)
    while out and (not out[-1].strip() or re.fullmatch(r'\s*=+\s*', out[-1])):
        out.pop()
    return '\n'.join(out) + '\n'

def main():
    bak = os.path.join(ARCH, 'Data-Operation-original-2026-11-05')
    for f in sorted(os.listdir(DO)):
        p = os.path.join(DO, f)
        if not os.path.isfile(p):
            continue
        if f == 'index.html':
            print('move out  Data-Operation/index.html (catalogue with test hints)')
            if not DRY:
                os.makedirs(bak, exist_ok=True); shutil.move(p, os.path.join(bak, f))
            continue
        txt = open(p, encoding='utf-8', errors='ignore').read()
        if HINT.search(txt):
            print(f'sanitise  Data-Operation/{f}')
            if not DRY:
                os.makedirs(bak, exist_ok=True)
                if not os.path.exists(os.path.join(bak, f)):
                    shutil.copy2(p, os.path.join(bak, f))
                clean = sanitise(txt)
                if HINT.search(clean):
                    raise SystemExit(f'hint left in {f}')
                open(p, 'w', encoding='utf-8', newline='\n').write(clean)
    stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M')
    for owner in sorted(os.listdir(OPS)):
        od = os.path.join(OPS, owner)
        if not os.path.isdir(od):
            continue
        for f in sorted(os.listdir(od)):
            print(f'clear     IT Operation/{owner}/{f}')
            if not DRY:
                dst = os.path.join(ARCH, f'IT-Operation-cleared-{stamp}', owner); os.makedirs(dst, exist_ok=True)
                shutil.move(os.path.join(od, f), os.path.join(dst, f))
    if DRY:
        return
    man = {'version': 'data-operation-v5.4-2026-11-07', 'root': DO, 'files': []}
    for f in sorted(os.listdir(DO)):
        p = os.path.join(DO, f)
        if os.path.isfile(p):
            b = open(p, 'rb').read()
            if HINT.search(b.decode('utf-8', 'ignore')):
                raise SystemExit(f'hint left in {f}')
            man['files'].append({'file': f, 'size': len(b), 'sha256': hashlib.sha256(b).hexdigest()})
    json.dump(man, open(os.path.join(ROOT, 'simulation', 'data-operation-manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    left = sum(len(os.listdir(os.path.join(OPS, o))) for o in os.listdir(OPS) if os.path.isdir(os.path.join(OPS, o)))
    print(f"manifest: {len(man['files'])} Data-Operation files, 0 tester hints; IT Operation files left: {left}")

if __name__ == '__main__':
    main()
