// SIGAP — integrity guard for decision records and the audit log (R09-F19).
// Every protected file is written only through writeProtected(): the file is set read-only on disk and a sealed copy
// is kept OUTSIDE the workspace (SIGAP_SEAL, default %LOCALAPPDATA%\sigap-seal). guard() compares the live file with
// the seal; any difference (edit, delete) is reverted from the seal and the changed copy is kept as evidence.
// Limitation: tools and agents run under the same Windows account, so this is tamper-evident + auto-reverting,
// not OS-level prevention (production: run the server under a separate service account with ACLs).
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const sha = b => crypto.createHash('sha256').update(b).digest('hex');
function sealRoot() {
  if (process.env.SIGAP_SEAL) return process.env.SIGAP_SEAL;
  if (process.env.SIGAP_RUNS) return path.join(path.dirname(path.resolve(process.env.SIGAP_RUNS)), 'seal'); // test runs never touch the real seal
  return path.join(process.env.LOCALAPPDATA || os.homedir(), 'sigap-seal');
}
// seal location is keyed by the absolute live path, so test copies and real files never collide
function sealPath(file) {
  const abs = path.resolve(file);
  return path.join(sealRoot(), sha(abs.toLowerCase()).slice(0, 16) + '-' + path.basename(abs));
}
function writable(f) { try { fs.chmodSync(f, 0o644); } catch (e) {} }
function readonly(f) { try { fs.chmodSync(f, 0o444); } catch (e) {} }

function writeProtected(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // R11-F9: seal FIRST (atomic rename), then the live file. A concurrent guard can then only see live=old/seal=new,
  // and guardFile treats that write window as in progress instead of restoring (never reverts a new decision).
  // the live temp file is written before the seal changes, so during the window a guard finds a temp copy equal to the seal
  const tmp = file + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, text);
  const sp = sealPath(file); fs.mkdirSync(path.dirname(sp), { recursive: true });
  const stmp = sp + '.tmp-' + process.pid; fs.writeFileSync(stmp, text);
  if (fs.existsSync(sp)) writable(sp);
  fs.renameSync(stmp, sp); readonly(sp);
  if (fs.existsSync(file)) writable(file);
  fs.renameSync(tmp, file);
  readonly(file);
  remember(file);
}
// index of sealed live paths, so a deleted live file is still found and restored
function indexFile() { return path.join(sealRoot(), 'index.txt'); }
function remember(file) {
  const abs = path.resolve(file); const idx = indexFile();
  const have = fs.existsSync(idx) ? fs.readFileSync(idx, 'utf8').split('\n') : [];
  if (!have.includes(abs)) fs.appendFileSync(idx, abs + '\n');
}
function sealedUnder(dir) {
  const idx = indexFile(); if (!fs.existsSync(idx)) return [];
  const base = path.resolve(dir).toLowerCase() + path.sep;
  return fs.readFileSync(idx, 'utf8').split('\n').filter(x => x && x.toLowerCase().startsWith(base));
}
function sealExisting(file) { // first-time seal of a file that was written before the guard existed
  const sp = sealPath(file); if (fs.existsSync(sp) || !fs.existsSync(file)) return false;
  fs.mkdirSync(path.dirname(sp), { recursive: true }); fs.copyFileSync(file, sp); readonly(sp); readonly(file); remember(file); return true;
}
// returns 'ok' | 'unsealed' | 'restored'; on restore, the changed copy goes to evidenceDir
function guardFile(file, evidenceDir) {
  const sp = sealPath(file);
  if (!fs.existsSync(sp)) return 'unsealed';
  const sealed = fs.readFileSync(sp);
  const live = fs.existsSync(file) ? fs.readFileSync(file) : null;
  if (live && live.equals(sealed)) { readonly(file); return 'ok'; }
  // a write through writeProtected() is in progress (seal renewed, live temp copy with the same bytes not yet renamed)
  const d = path.dirname(file), b = path.basename(file) + '.tmp-';
  try { if (fs.readdirSync(d).some(f => f.startsWith(b) && fs.readFileSync(path.join(d, f)).equals(sealed))) return 'ok'; } catch (e) {}
  if (evidenceDir) {
    fs.mkdirSync(evidenceDir, { recursive: true });
    const stamp = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 19).replace(/[-:T]/g, '');
    fs.writeFileSync(path.join(evidenceDir, path.basename(file, '.json') + '-diubah-' + stamp + (live ? '.json' : '.dihapus.txt')), live || 'file dihapus');
  }
  if (fs.existsSync(file)) writable(file);
  fs.writeFileSync(file, sealed); readonly(file);
  return 'restored';
}
module.exports = { sha, sealPath, sealRoot, writeProtected, sealExisting, guardFile, sealedUnder };
