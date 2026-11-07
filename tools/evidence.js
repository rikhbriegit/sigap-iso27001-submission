#!/usr/bin/env node
// SIGAP v5 — evidence boundary. Evidence for a run lives ONLY in <EVIDENCE_ROOT>/<RUN_ID>/<owner>/ and is listed in
// runs/<RUN_ID>/evidence-index.json. The auditor may cite only indexed files; QA runs `check` deterministically.
// Evidence is never created by agents: it is COPIED byte-identical from Data-Operation (company repository) into the
// owner's IT Operation folder (`collect`), then released into Evidence (`add`). Both steps verify the sha256 against
// simulation/data-operation-manifest.json.
// Usage:
//   node tools/evidence.js collect --run R --owner <persona id|manager> --file "<file name in Data-Operation>" --item <control/clause> --reason "<why relevant>"
//   node tools/evidence.js selection --run R [--owner id]
//   node tools/evidence.js add   --run R --src "<file in owner's IT Operation folder>" --owner <persona id> --approval <outbox id>
//   node tools/evidence.js list  --run R
//   node tools/evidence.js check --run R --file runs/R/penilaian-auditor.md
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const EVROOT = process.env.SIGAP_EVIDENCE_ROOT || 'G:/My Drive/Hackathon_Tencent/ISO 27001/Evidence';
const STATUSES = ['Conform', 'Minor NC', 'Major NC', 'OFI', 'N/A'];
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
const die = (m, c = 1) => { console.error(m); process.exit(c); };
const run = opt('run'); if (!run) die('missing --run', 2);
const RUNS = process.env.SIGAP_RUNS || path.join(ROOT, 'runs');
const IDX = path.join(RUNS, run, 'evidence-index.json');
const loadIdx = () => fs.existsSync(IDX) ? JSON.parse(fs.readFileSync(IDX, 'utf8')) : [];
const cmd = args[0];
const DO = process.env.SIGAP_DATA_OPERATION || 'G:/My Drive/Hackathon_Tencent/Data-Operation';
const MAN = path.join(ROOT, 'simulation', 'data-operation-manifest.json');
const manifest = () => new Map(JSON.parse(fs.readFileSync(MAN, 'utf8')).files.map(f => [f.sha256, f.file]));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
function ownerFolder(owner) {
  const p = JSON.parse(fs.readFileSync(path.join(ROOT, 'simulation', 'staff-personas.json'), 'utf8'));
  if (owner === 'manager') return p.peran.manager.drive_folder;
  const s = p.staf.find(x => x.id === owner); if (!s) die('unknown owner ' + owner); return s.drive_folder;
}
const SEL = o => path.join(RUNS, run, `selection-${o}.json`);

if (cmd === 'collect') {
  const owner = opt('owner'), file = opt('file'), item = opt('item'), reason = opt('reason');
  if (!owner || !file || !item || !reason) die('need --owner --file --item --reason');
  const butir = opt('butir');
  const reqF = path.join(RUNS, run, 'requests.json');
  const reqV = fs.existsSync(reqF) ? String(JSON.parse(fs.readFileSync(reqF, 'utf8')).versi_skill || '') : '';
  const strict = !!reqV && !/(^|[^\d.])(5\.[01]|4\.\d)(?!\d)/.test(reqV); // rule applies from SKILL v5.2 (runs with requests.json only)
  if (strict) {
    if (!butir || !/^\d+$/.test(butir)) die('need --butir <number of the bukti_diminta line this document answers> (SKILL v5.2 FASE 3)');
  }
  const src = path.join(DO, path.basename(file));
  if (!fs.existsSync(src)) die(`not found in Data-Operation: ${file}`);
  const buf = fs.readFileSync(src);
  if (!manifest().has(sha(buf))) die('BLOCKED: file hash not in data-operation-manifest.json (changed or not a repository document).');
  const dir = ownerFolder(owner); fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(src, path.join(dir, path.basename(file)));
  const sel = fs.existsSync(SEL(owner)) ? JSON.parse(fs.readFileSync(SEL(owner), 'utf8')) : [];
  sel.push({ file: path.basename(file), item, butir: opt('butir') || null, reason, sha256: sha(buf), size: buf.length, at: new Date().toISOString() });
  fs.mkdirSync(path.dirname(SEL(owner)), { recursive: true }); fs.writeFileSync(SEL(owner), JSON.stringify(sel, null, 1));
  console.log(`collected ${path.basename(file)} -> ${dir} (${buf.length} B) for ${item}`);
} else if (cmd === 'selection') {
  const owners = opt('owner') ? [opt('owner')] : fs.readdirSync(path.join(RUNS, run)).filter(f => f.startsWith('selection-')).map(f => f.slice(10, -5));
  for (const o of owners) for (const e of JSON.parse(fs.readFileSync(SEL(o), 'utf8'))) console.log(`${o}	${e.item}	${e.file}	${e.reason}`);
} else if (cmd === 'add') {
  const src = opt('src'), owner = opt('owner'), appr = opt('approval');
  if (!src || !owner || !appr) die('need --src --owner --approval');
  const ob = JSON.parse(fs.readFileSync(path.join(RUNS, run, 'outbox', appr + '.json'), 'utf8'));
  if (!['APPROVED', 'EXECUTED'].includes(ob.status) || ob.kind !== 'release') die(`release approval ${appr} is ${ob.status}/${ob.kind} — not allowed`);
  const relFiles = Array.isArray(ob.payload.files) ? ob.payload.files.map(f => path.basename(String(f))) : Object.keys(ob.payload.sha256 || {});
  if (!relFiles.includes(path.basename(src))) die('file not in the approved release payload');
  if (!manifest().has(sha(fs.readFileSync(src)))) die('BLOCKED: not a byte-identical Data-Operation document — agents must not create or edit evidence.');
  const dstDir = path.join(EVROOT, run, owner); fs.mkdirSync(dstDir, { recursive: true });
  const dst = path.join(dstDir, path.basename(src)); fs.copyFileSync(src, dst);
  const buf = fs.readFileSync(dst);
  const idx = loadIdx().filter(e => e.file !== path.basename(src) || e.owner !== owner);
  idx.push({ file: path.basename(src), owner, path: dst.replace(/\\/g, '/'), size: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex'), approval: appr, added: new Date().toISOString() });
  fs.mkdirSync(path.dirname(IDX), { recursive: true }); fs.writeFileSync(IDX, JSON.stringify(idx, null, 1));
  console.log(`indexed ${owner}/${path.basename(src)} (${buf.length} B)`);
} else if (cmd === 'list') {
  for (const e of loadIdx()) console.log(`${e.owner}\t${e.file}\t${e.size} B\t${e.approval}`);
} else if (cmd === 'check') {
  const raw = fs.readFileSync(opt('file'), 'utf8');
  const txt = raw.replace(/\\./g, '.');           // undo Markdown escapes such as "name\.md"
  const idxNames = loadIdx().map(e => e.file);
  const known = new Set(idxNames);
  const SKIP = /^(evidence-index|klarifikasi-bukti|proposal|requests|progress|entries|data-operation-manifest|selection-[\w-]+|release-[\w-]+|manifest-[\w-]+|gate1-decision)\.json$|^(penilaian-auditor|fase\d-[\w-]+|selection-[\w-]+|status-[\w-]+)\.md$|\.(js|cjs|py)$/;
  // candidates: any run of characters ending in a document extension (names may contain spaces)
  const cand = txt.match(/[^\n`|"'\[\]*:>]{1,160}?\.(?:txt|md|docx|xlsx|pdf|csv|json|log)\b/g) || [];
  const cited = new Set(), outside = new Set();
  for (let c of cand) {
    c = c.trim();
    const hit = idxNames.filter(n => c.endsWith(n)).sort((a, b) => b.length - a.length)[0];
    if (hit) { cited.add(hit); continue; }
    const tail = c.split(/\s+/).pop();
    if (SKIP.test(tail) || SKIP.test(c)) continue;
    outside.add(c.length > 90 ? '…' + c.slice(-90) : c);
  }
  const scores = txt.match(/\b[0-5]\s*\/\s*5\b|\bskor\b|severity\s*[:=]?\s*(low|medium|high|critical)/gi) || [];
  const badStatus = (txt.match(/Status\*{0,2}\s*[:=]\s*\*{0,2}([^\n*|]+)/g) || []).map(s => s.replace(/.*[:=]\s*\**/, '').trim()).filter(s => !STATUSES.some(x => s.startsWith(x)));
  const report = { evidence_indexed: known.size, cited: cited.size, citations_outside_evidence: [...outside], score_or_severity_terms: scores, non_iso_status_labels: badStatus };
  console.log(JSON.stringify(report, null, 1));
  process.exit(outside.size || scores.length || badStatus.length ? 1 : 0);
} else {
  die('usage: add | list | check', 2);
}
