// SIGAP — who is working right now? One row per agent of the run (Manager, Auditor, every staff task) with a status icon,
// derived from system traces only (audit log, files the agent writes, outbox items), never from agent prose (user request 6 Nov).
"use strict";
const fs = require("fs");
const path = require("path");
const PROJECT = path.resolve(__dirname, "..");
const ITOPS = "G:/My Drive/Hackathon_Tencent/IT Operation";
const FOLDER = { "network-user": "Network & User", "dc-server": "Data Center & Server", "sap-basis": "SAP Basis", "cyber-security": "Cyber Security", "app-dev": "Application Development", "sap-fungsional": "SAP Fungsional", "manager": "Manager" };
const LABEL = { "network-user": "Staf IT Network & User", "dc-server": "Staf IT Data Center & Server", "sap-basis": "Staf SAP Basis", "cyber-security": "Staf IT Cyber Security", "app-dev": "Staf Application Development", "sap-fungsional": "Staf SAP Fungsional" };
const WORKING_MS = 3 * 60e3, STALL_MS = 8 * 60e3;
const readJson = p => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { return null; } };
const mtime = p => { try { return fs.statSync(p).mtimeMs; } catch (e) { return 0; } };
function newest(dir, filter) { let t = 0; try { for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); const s = fs.statSync(p); if (s.isFile() && (!filter || filter(f))) t = Math.max(t, s.mtimeMs); } } catch (e) {} return t; }
const ts = s => { const t = Date.parse(s || ""); return isNaN(t) ? 0 : t; };
const hhmm = ms => ms ? new Date(ms + 7 * 3600e3).toISOString().slice(11, 16) : "";

function gateDoneAt(ob) { return ob.some(o => o.kind === "gate" && o.status === "EXECUTED"); }
function agentsInfo(run, runsDir, faseNo, audit, ob) {
  const dir = path.join(runsDir, run); const now = Date.now();
  const proposal = readJson(path.join(dir, "proposal.json")) || {};
  const index = readJson(path.join(dir, "evidence-index.json")) || [];
  const execAt = o => ts(((o.history || []).find(h => h.executed) || {}).at);
  const lastAudit = re => Math.max(0, ...audit.filter(e => re.test(e.aktor || "")).map(e => ts(e.timestamp)));
  const pendingOf = pred => ob.filter(o => o.status === "PENDING_APPROVAL" && pred(o));
  const rows = [];
  // real platform state (WorkBuddy DB, read-only) + the Pengawas ledger: who is running, who failed and why, retries
  let live = []; try { const wp = require.resolve("../tools/wbstate"); delete require.cache[wp]; live = require("../tools/wbstate").read(run); } catch (e) {}
  const ledger = readJson(path.join(dir, "supervisor.json")) || { workers: {} };
  // the Pengawas runs inside the dashboard server (every 60 s); alive = it checked within the last 3 minutes
  const pst = (global.SIGAP_PENGAWAS && global.SIGAP_PENGAWAS.lastTick ? global.SIGAP_PENGAWAS : null) || readJson(path.join(dir, "pengawas-status.json")) || {}; // live object from the server process
  const pengawas = pst.enabled && pst.lastTick && now - ts(pst.lastTick) < 3 * 60e3 ? pst : null;
  const liveOf = name => live.find(a => a.name === name) || null;
  const triesOf = a => { const w = a && ledger.workers[a.id]; if (!w) return 0; return Math.max(0, ...Object.values(w.attempts || {})); };
  function row(name, role, last, opts) {
    const { waits = [], done = false, expected = false, startedAt = 0, what = "", alert = null } = opts;
    const lv = liveOf(name); if (lv && lv.lastRun) last = Math.max(last || 0, lv.lastRun.endedMs || 0, lv.running ? now : 0);
    const esc = pendingOf(o => o.kind === "eskalasi" && String(o.title || "").includes(name));
    let icon, status, cls, hint = "";
    if (alert) { icon = "🔴"; cls = "t-bad"; status = alert.status; hint = alert.hint; }
    else if (done) { icon = "✅"; status = "Selesai"; cls = "t-ok"; }
    else if (esc.length) { icon = "🟠"; cls = "t-warn"; status = "Eskalasi: tidak berhasil setelah dicoba ulang otomatis"; hint = "Buka dashboard → Keputusan (" + esc.map(o => o.id).join(", ") + ")."; }
    else if (lv && lv.running) { icon = "🟢"; cls = "t-ok"; status = "Sedang berjalan sejak " + hhmm(lv.runningSince) + (what ? " — " + what : ""); }
    else if (waits.length) { icon = "🟡"; cls = "t-warn"; status = "Menunggu keputusan Anda: " + waits.map(o => o.id).join(", ");
      hint = waits.some(o => ["release", "klarifikasi", "serah_terima", "email", "calendar", "report", "eskalasi"].includes(o.kind)) ? "Buka dashboard → Keputusan." : "Jawab kartunya di chat " + run + " Manager."; }
    else if (expected && lv && lv.lastRun && lv.lastRun.failure) { icon = "🔁"; cls = "t-warn"; status = "Gagal " + hhmm(lv.lastRun.endedMs) + ": " + lv.lastRun.failurePlain;
      hint = pengawas ? "Pengawas mencoba ulang otomatis (percobaan " + triesOf(lv) + "/3 sejauh ini)." : "Pengawas tidak aktif."; }
    else if (last && now - last < WORKING_MS) { icon = "🟢"; status = "Sedang bekerja" + (what ? " — " + what : ""); cls = "t-ok"; }
    else if (expected && now - Math.max(last, startedAt) > STALL_MS) { icon = "🔴"; cls = "t-bad"; status = last ? "Tidak ada aktivitas " + Math.round((now - last) / 60e3) + " menit" : "Belum mulai bekerja";
      hint = pengawas ? "Pengawas akan menjalankan ulang task ini otomatis (maks. 3x), lalu meminta keputusan Anda bila tetap gagal."
        : (last ? "Task berhenti sebelum selesai dan run ini tidak punya Pengawas." : "Task belum pernah jalan dan run ini tidak punya Pengawas."); }
    else if (expected) { icon = "🟢"; status = "Bekerja / baru dijadwalkan" + (what ? " — " + what : ""); cls = "t-ok"; }
    else { icon = "⚪"; status = role.startsWith("Manager") ? "Siaga — menunggu agen lain" : "Siaga — menunggu giliran"; cls = "t-mut"; }
    // the Manager chat is busy right now (read from WorkBuddy by the Pengawas within the last 2 minutes) -> working, not stalled
    const mb = role.startsWith("Manager") && global.SIGAP_PENGAWAS && global.SIGAP_PENGAWAS.manager;
    if (!alert && mb && mb.busy && now - mb.at < 2 * 60e3 && icon !== "🟡") { icon = "🟢"; cls = "t-ok"; status = "Sedang bekerja di chat Manager" + (what ? " — " + what : ""); hint = ""; }
    if (icon === "🔴" && role.startsWith("Manager") && !alert) hint = (pengawas ? "Pengawas akan mengingatkan Manager otomatis (maks. 3x); " : "") + "atau tekan Ingatkan Manager.";
    // one-click follow-up (user request): stalled staff/Auditor -> Run now on the Pengawas; stalled Manager -> wake the Manager chat
    let action = null;
    if ((icon === "🔴" || icon === "🔁") && !role.startsWith("Manager") && liveOf(name)) action = { target: "agent", label: "Tindak lanjut", agent: name };
    else if (icon === "🔴" && role.startsWith("Manager")) action = { target: "manager", label: "Ingatkan Manager", agent: name };
    if (action && action.target === "agent") hint = (pengawas ? "Pengawas akan menjalankan ulang otomatis; " : "") + "tekan Tindak lanjut untuk menjalankannya sekarang (task & perintah sama, tercatat di log audit).";
    rows.push({ name, role, icon, status, cls, hint, last: hhmm(last), action });
  }
  // items the Manager collects itself: a release marked EXECUTED whose files are not in the evidence index is a false "done"
  const mItems = (proposal.fokus || []).filter(f => f.task_pengumpul === "manager").map(f => f.item);
  const mMissing = faseNo >= 3 && gateDoneAt(ob) ? mItems.filter(it => !index.some(e => e.owner === "manager" && (!e.item || String(e.item).startsWith(it)))) : [];
  const mRel = ob.filter(o => o.kind === "release" && (o.payload || {}).owner === "manager" && o.status === "EXECUTED");
  const mAlert = mMissing.length && mRel.length ? { status: "Bukti " + mMissing.join(", ") + " ditandai dirilis (" + mRel.map(o => o.id).join(", ") + ") tetapi berkasnya TIDAK ada di Evidence", hint: "Manager harus merilis ulang bukti miliknya; kartu rilis baru akan muncul di chat Manager." } : null;
  // the Manager's own focus items still open (not in the evidence index, no release of its own waiting) = it must work
  const mOpenOwn = gateDoneAt(ob) ? mItems.filter(it => !index.some(e => e.owner === "manager" && (!e.item || String(e.item).startsWith(it)))).filter(() => !pendingOf(o => o.kind === "release" && (o.payload || {}).owner === "manager").length) : [];
  // Manager: always on duty; waits on any chat-card item
  // only the Manager's OWN actions count (staff/auditor files in the same run folder must not make it look busy)
  const mLast = Math.max(lastAudit(/manager/i), ...ob.filter(o => ["gate", "automation", "calendar"].includes(o.kind) || (o.kind === "release" && (o.payload || {}).owner === "manager")).map(o => ts(o.created)));
  row(run + " Manager", "Manager IT (internal)", mLast, { alert: mAlert, waits: pendingOf(o => ["gate", "automation"].includes(o.kind) || (o.kind === "release" && (o.payload || {}).owner === "manager")), expected: mOpenOwn.length > 0, what: mOpenOwn.length ? "mengerjakan bukti miliknya " + mOpenOwn.join(", ") : "", done: faseNo === 8 && !pendingOf(() => true).length && ob.some(o => o.kind === "automation" && /cleanup|hapus/i.test(o.title || "") && o.status === "EXECUTED") });
  // Auditor: works in FASE 1, 4, 5, 6, 7 (and proposes FASE 8)
  const aFiles = ["proposal.json", "klarifikasi-bukti.json", "penilaian-auditor.md", "laporan-hasil-audit.md", "Presentasi-Hasil-Audit-" + run + ".pptx"].map(f => mtime(path.join(dir, f)));
  const aLast = Math.max(lastAudit(/auditor/i), ...aFiles, newest(path.join(PROJECT, "reports", run)));
  const aStart = Math.max(0, ...ob.filter(o => o.kind === "automation" && /auditor/i.test((o.payload || {}).name || o.title || "") && o.status === "EXECUTED").map(execAt));
  const staffOwners = [...new Set((proposal.fokus || []).map(f => f.task_pengumpul).filter(t => t && t !== "manager"))];
  const staffDone = staffOwners.length && staffOwners.every(own => index.some(e => e.owner === own));
  // the Auditor is due in FASE 1, 4-7, and already once every staff collector has released (completeness check starts)
  const aExpected = ([1, 4, 5, 6, 7].includes(faseNo) && !(faseNo === 1 && proposal.fokus)) || (faseNo === 3 && staffDone);
  const aWhatF = faseNo === 3 && staffDone ? "cek kelengkapan bukti (FASE 4)" : null;
  const aWhat = { 1: "menyusun usulan fokus & jadwal", 4: "cek kelengkapan bukti", 5: "menilai kontrol", 6: "QA sitasi bukti", 7: "menyusun laporan & presentasi" }[faseNo] || "";
  row(run + " Auditor", "Auditor eksternal", aLast, { waits: pendingOf(o => ["report", "serah_terima", "klarifikasi"].includes(o.kind) || (o.kind === "email" && /laporan/i.test(o.title || ""))), expected: aExpected, startedAt: aStart, what: aWhatF || aWhat });
  // staff: one per focus collector (not the Manager), task created at GATE 1
  const gate = ob.filter(o => o.kind === "gate" && o.status === "EXECUTED").pop();
  const gStart = gate ? execAt(gate) : 0;
  const owners = [...new Set((proposal.fokus || []).map(f => f.task_pengumpul).filter(t => t && t !== "manager"))];
  for (const own of owners) {
    const items = (proposal.fokus || []).filter(f => f.task_pengumpul === own).map(f => f.item);
    const released = items.every(it => index.some(e => e.owner === own && (!e.item || e.item === it || String(e.item).startsWith(it))));
    const sLast = Math.max(mtime(path.join(dir, "selection-" + own + ".json")), mtime(path.join(dir, "notes", "selection-" + own + ".md")), mtime(path.join(dir, "notes", "status-" + own + ".md")),
      newest(path.join(ITOPS, FOLDER[own] || own)), lastAudit(new RegExp(own.replace("-", "[- ]") + "|" + (LABEL[own] || "zz"), "i")));
    const waits = pendingOf(o => o.kind === "release" && (o.payload || {}).owner === own);
    row(run + " " + (LABEL[own] || "Staf " + own), "Staf internal · " + items.join(", "), sLast, { waits, done: released && !waits.length && index.some(e => e.owner === own), expected: faseNo >= 3 && !!gStart, startedAt: gStart, what: "mengumpulkan bukti " + items.join(", ") });
  }
  // the Pengawas itself (inside the dashboard server): when did it last check, retries, last action
  {
    const tick = ts(pst.lastTick); const retries = Object.values(ledger.workers || {}).reduce((n, w) => n + (w.history || []).length, 0);
    const dead = !pst.enabled || !tick || now - tick > 3 * 60e3;
    rows.push({ name: run + " Pengawas", role: "Pengawas otomatis di server dashboard (cek tiap 60 detik; jalankan ulang task yang macet)", icon: dead ? "🔴" : "🛡️", cls: dead ? "t-bad" : "t-ok",
      status: dead ? (!pst.enabled ? "Nonaktif" : tick ? "Tidak mengecek sejak " + hhmm(tick) : "Belum mengecek") : "Aktif — cek " + hhmm(tick) + " · " + retries + " kali menjalankan ulang" + (pst.lastAction ? " · terakhir: " + String(pst.lastAction.name).replace(run + " ", "") + " " + String(pst.lastAction.at).slice(11, 16) : "") + (pst.lastModelSwitch ? " · ganti model " + String(pst.lastModelSwitch.who).replace(run + " ", "") + ": " + pst.lastModelSwitch.change + " (" + String(pst.lastModelSwitch.at).slice(11, 16) + ")" : ""),
      hint: pst.lastError ? "Kendala terakhir: " + pst.lastError : (dead ? "Server dashboard harus berjalan; tekan tombol untuk memeriksa sekarang." : ""), last: hhmm(tick), action: { target: "pengawas", label: "Periksa sekarang", agent: run + " Pengawas" } });
  }
  return rows;
}
module.exports = { agentsInfo };
