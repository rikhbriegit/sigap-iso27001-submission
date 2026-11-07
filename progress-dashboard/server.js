// SIGAP progress dashboard — dev server lokal (zero dependency, stdlib only)
// CARA JALANKAN: dari TERMINAL EKSTERNAL -> npm run dev
// JANGAN dijalankan dari dalam chat WorkBuddy: proses anak agen dibunuh LPAC
// saat operasi jaringan pertama (pelajaran kasus convert_doc.py, 29 Okt).
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const HCRYPTO = require("crypto");
function flatK(o, acc = {}) { if (o && typeof o === "object") for (const k of Object.keys(o)) { acc[k] = 1; flatK(o[k], acc); } return acc; }
const intact = o => !!(o && o.payload && o.sha256) && HCRYPTO.createHash("sha256").update(JSON.stringify(o.payload, Object.keys(flatK(o.payload)).sort())).digest("hex") === o.sha256; // R09-F19
// Markdown report -> readable HTML page (headings, tables, lists, bold, code). Escapes everything first.
function mdPage(title, md) {
  const esc = t => t.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const inl = t => esc(t).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/(^|[^*])\*([^*]+)\*/g, "$1<i>$2</i>");
  const lines = md.replace(/\r/g, "").split("\n"); let out = "", i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^\s*\|/.test(l)) { const rows = []; while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
      out += "<table>"; rows.forEach((r, k) => { if (/^\s*\|[\s:|-]+\|\s*$/.test(r)) return; const tag = k === 0 ? "th" : "td"; out += "<tr>" + cells(r).map(c => "<" + tag + ">" + inl(c) + "</" + tag + ">").join("") + "</tr>"; }); out += "</table>"; continue; }
    let m;
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { out += "<h" + m[1].length + ">" + inl(m[2]) + "</h" + m[1].length + ">"; i++; continue; }
    if (/^\s*(---+|\*\*\*+)\s*$/.test(l)) { out += "<hr>"; i++; continue; }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) { const ord = /^\s*\d+\./.test(l); out += ord ? "<ol>" : "<ul>"; while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) out += "<li>" + inl(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, "")) + "</li>"; out += ord ? "</ol>" : "</ul>"; continue; }
    if (/^>\s?/.test(l)) { out += "<blockquote>" + inl(l.replace(/^>\s?/, "")) + "</blockquote>"; i++; continue; }
    if (!l.trim()) { i++; continue; }
    const para = []; while (i < lines.length && lines[i].trim() && !/^(#|\s*\||\s*[-*]\s|\s*\d+\.\s|>)/.test(lines[i])) para.push(lines[i++]);
    out += "<p>" + inl(para.join(" ")) + "</p>";
  }
  return '<!doctype html><html lang="id"><meta charset="utf-8"><title>' + esc(title) + '</title><style>body{font:15px/1.6 system-ui,sans-serif;max-width:960px;margin:24px auto;padding:0 20px;color:#222}table{border-collapse:collapse;width:100%;margin:12px 0;font-size:14px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f2f2f2}h1,h2,h3{line-height:1.3}code{background:#f4f4f4;padding:1px 4px;border-radius:3px}blockquote{border-left:3px solid #ccc;margin:8px 0;padding:2px 12px;color:#555}</style><body>' + out + "</body></html>";
}
const PORT = Number(process.env.SIGAP_DASH_PORT || 4173);
const HOST = "127.0.0.1"; // hanya lokal — jangan bind 0.0.0.0
const ROOT = __dirname;
const PROJECT = path.resolve(__dirname, "..");
const { execFileSync } = require("child_process");
// runinfo.js is reloaded when it changes, so view logic can be fixed during a run without restarting the server (rule 0: no downtime)
let _ri = { mtime: 0, fn: null };
function runInfo(...a) {
  const f = require.resolve("./runinfo"); const m = fs.statSync(f).mtimeMs;
  if (!_ri.fn || m !== _ri.mtime) { delete require.cache[f]; try { _ri = { mtime: m, fn: require("./runinfo").runInfo }; } catch (e) { if (!_ri.fn) throw e; } }
  return _ri.fn(...a);
}
// The reason for a human decision must reach the agents without anyone typing hints: the automatic check results shown on
// the card are written to runs/<RUN>/notes/keputusan-<ID>.md (state the Manager and Auditor read on their next turn).
function writeDecisionNote(run, rec, option, label) {
  try {
    const ck = checkItem(run, Object.assign({}, rec, { status: "PENDING_APPROVAL" }));
    const lines = ["# Keputusan " + rec.id + " — " + (rec.title || rec.kind), "", "- Keputusan manusia (dashboard): **" + option + "**" + (label ? " " + label : ""),
      "- Waktu: " + new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 19) + "+07:00", "", "## Hasil pemeriksaan otomatis saat keputusan", ""]
      .concat((ck.checks || []).map(x => "- " + (x.ok ? "LULUS: " : "GAGAL: ") + x.text))
      .concat(["", "## Yang harus dilakukan pemilik item", "", require("./checks").nextAfter(option, ck)]);
    const d = path.join(RUNS, run, "notes"); fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, "keputusan-" + rec.id + ".md"), lines.join("\n") + "\n");
  } catch (e) {}
}
// PENGAWAS (supervisor) inside the dashboard server — user: WorkBuddy recurring tasks run at most hourly, useless for stalls.
// Every 60 s: tools/supervisor.js plan (deterministic: who must work, who is stalled/failed, back-off, max 3, one at a time)
// → for its single action the server runs the SAME WorkBuddy task now via wb.automations.trigger (WorkBuddy's own Run now)
// → supervisor.js record (ledger + audit actor "sistem (pengawas)"). After 3 tries the plan creates an `eskalasi` item.
const PENGAWAS = global.SIGAP_PENGAWAS = { enabled: process.env.SIGAP_PENGAWAS ? process.env.SIGAP_PENGAWAS !== "off" : !process.env.SIGAP_RUNS, lastTick: null, lastAction: null, lastError: null, busy: false };
function activeRunName() { try { const p = require.resolve("./runinfo"); delete require.cache[p]; return require("./runinfo").activeRun(RUNS).run; } catch (e) { return null; } }
async function pengawasTick(manual) {
  if (PENGAWAS.busy) return { ok: false, out: "Pengawas sedang memeriksa" };
  PENGAWAS.busy = true;
  PENGAWAS.lastTick = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 19) + "+07:00";
  try {
    const run = activeRunName(); // only the ACTIVE run (never a stopped one)
    if (!run) return { ok: true, out: "tidak ada run" };
    const st = (() => { try { return JSON.parse(fs.readFileSync(path.join(PROJECT, "simulation", "run-counter.json"), "utf8")).riwayat.find(x => x.no === Number(run.slice(-2))); } catch (e) { return null; } })();
    if (st && /dihentikan|selesai/i.test(st.status || "")) return { ok: true, out: "run " + run + " sudah " + st.status.split(" ")[0] };
    const p = nodeTool(["tools/supervisor.js", "plan", "--run", run]);
    PENGAWAS.lastTick = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 19) + "+07:00";
    if (!p.ok) { PENGAWAS.lastError = p.out.slice(0, 200); return { ok: false, out: "plan gagal: " + PENGAWAS.lastError }; }
    const plan = JSON.parse(p.out); PENGAWAS.lastPlan = { at: plan.at, working: plan.working, waiting: plan.waiting, escalated: plan.escalated, deferred: plan.deferred };
    try { const fq = require.resolve("./followup"); delete require.cache[fq]; const mb = await require("./followup").managerBusy(run); if (mb) PENGAWAS.manager = Object.assign(mb, { at: Date.now() }); } catch (e) {}
    // every Manager turn must end with a card (SKILL §2): a Manager chat that is idle WITHOUT a card for 3 minutes has stopped
    // mid-work (platform cut-off). Wake it with the fixed text — max 3 per phase, back-off, logged; never while a card is open.
    const mg = PENGAWAS.manager;
    if (mg && !mg.busy && !mg.card) { PENGAWAS.managerIdleSince = PENGAWAS.managerIdleSince || Date.now(); } else PENGAWAS.managerIdleSince = null;
    if (!plan.actions.length && PENGAWAS.managerIdleSince && Date.now() - PENGAWAS.managerIdleSince > 3 * 60e3 && Date.now() - (PENGAWAS.lastManagerWake || 0) > 5 * 60e3) {
      let L = {}; try { L = JSON.parse(fs.readFileSync(path.join(RUNS, run, "supervisor.json"), "utf8")); } catch (e) {}
      const key = "manager-fase" + plan.fase; const tries = ((L.manager || {}).attempts || {})[key] || 0;
      if (tries < 3) plan.actions.push({ do: "wake-manager", name: run + " Manager", attempt: tries + 1, max: 3, phase: key, reason: "chat Manager berhenti tanpa kartu selama " + Math.round((Date.now() - PENGAWAS.managerIdleSince) / 60e3) + " menit" });
    }
    if (!plan.actions.length) return { ok: true, out: manual ? "Pengawas memeriksa: tidak ada task yang perlu dijalankan ulang sekarang." : "ok" };
    const a = plan.actions[0];
    const fp = require.resolve("./followup"); delete require.cache[fp];
    const F = require("./followup");
    const logModel = (who, out) => nodeTool(["tools/audit.js", "append", "--run", run, "--fase", "pengawas", "--aktor", "sistem (pengawas)", "--aksi", "ganti_model_otomatis", "--input", who, "--output", out, "--ref", "progress-dashboard/followup.js"], { SIGAP_SYSTEM: "1" });
    if (a.do === "wake-manager") {
      // the Manager's last reply failed on the model (unknown error / saturated) -> switch the chat to the other model first
      try { const st = await F.chatModelState(run); if (st && st.failed) { const nx = await F.nextModel(String(st.model).toLowerCase() === "hy4" ? "hy4free" : String(st.model).toLowerCase()); const m = nx ? await F.setChatModel(run, nx.id, nx.name) : { ok: false }; if (m.ok) { logModel(run + " Manager (chat)", "model " + m.out + " karena balasan terakhir gagal di model"); PENGAWAS.lastModelSwitch = { at: PENGAWAS.lastTick, who: run + " Manager", change: m.out }; } } } catch (e) {}
      const w = await F.wakeManager(run, a.reason);
      if (w.ok) { PENGAWAS.lastManagerWake = Date.now(); PENGAWAS.managerIdleSince = null; nodeTool(["tools/supervisor.js", "record-manager", "--run", run]); PENGAWAS.lastAction = { at: PENGAWAS.lastTick, name: a.name, attempt: a.attempt, reason: a.reason }; PENGAWAS.lastError = null; }
      else PENGAWAS.lastError = w.out;
      return { ok: w.ok, out: w.ok ? "Pengawas mengingatkan Manager (percobaan " + a.attempt + "/" + a.max + "): " + a.reason : w.out };
    }
    // the task failed on the model (saturated / refused) -> next attempt on the other model (modelId only, prompt unchanged)
    try { const live = require(path.join(PROJECT, "tools", "wbstate.js")).read(run).find(x => x.id === a.automation_id);
      if (live && live.lastRun && ["automation-rate-limited", "automation-request-refused"].includes(live.lastRun.failure)) {
        const nx = await F.nextModel(live.model); const m = nx ? await F.setTaskModel(a.automation_id, nx.id) : { ok: false, out: "tidak ada model cadangan" };
        if (m.ok) { logModel(a.name, "model " + m.out + " karena percobaan terakhir: " + live.lastRun.failurePlain); PENGAWAS.lastModelSwitch = { at: PENGAWAS.lastTick, who: a.name, change: m.out }; }
      } } catch (e) {}
    const r = await F.trigger(a.automation_id);
    if (r.ok) { nodeTool(["tools/supervisor.js", "record", "--run", run, "--id", a.automation_id, "--via", "auto"]); PENGAWAS.lastAction = { at: PENGAWAS.lastTick, name: a.name, attempt: a.attempt, reason: a.reason }; PENGAWAS.lastError = null; }
    else PENGAWAS.lastError = r.out;
    return { ok: r.ok, out: r.ok ? "Pengawas menjalankan ulang " + a.name + " (percobaan " + a.attempt + "/" + a.max + "): " + a.reason : "Pengawas gagal menjalankan " + a.name + ": " + r.out };
  } catch (e) { PENGAWAS.lastError = e.message; return { ok: false, out: e.message }; }
  finally { PENGAWAS.busy = false; try { const run = activeRunName(); if (run && fs.existsSync(path.join(RUNS, run))) fs.writeFileSync(path.join(RUNS, run, "pengawas-status.json"), JSON.stringify(PENGAWAS, null, 1)); } catch (e) {} }
}
if (PENGAWAS.enabled) { setTimeout(() => pengawasTick(false), 10e3); setInterval(() => pengawasTick(false), 60e3); }
// Panel guard (v5.4, user rule: the dashboard is visible in the Manager chat's right panel from the trigger on, every moment).
// Every 2 s: if WorkBuddy shows a SIGAP Manager chat without the SIGAP dashboard in its right panel, open it there.
// Deterministic, in the server — never left to the agent's prompt or to an operator.
const PANEL = PENGAWAS.panel = { lastCheck: null, lastFix: null, fixes: 0, lastError: null, busy: false };
async function panelGuard() {
  if (PANEL.busy || PENGAWAS.busy) return;
  PANEL.busy = true;
  try {
    const fq = require.resolve("./followup"); delete require.cache[fq];
    const r = await require("./followup").ensurePanel();
    PANEL.lastCheck = Date.now(); PANEL.lastError = null;
    if (r.acted) {
      PANEL.fixes++; PANEL.lastFix = { at: new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 19) + "+07:00", chat: r.st.title || "(chat baru, frase pemicu)", url: r.url, visible: r.visible };
      console.log("[panel] dashboard dibuka di panel kanan:", JSON.stringify(PANEL.lastFix));
    }
  } catch (e) { PANEL.lastError = e.message.slice(0, 160); }
  finally { PANEL.busy = false; }
}
if (PENGAWAS.enabled && process.env.SIGAP_PANEL_GUARD !== "off") setInterval(panelGuard, 2000);
// v5.4 (user, 7 Nov: "progress.json kenapa kamu tulis manual?"): progress.json is written by THIS server every 10 s from the
// system state (outbox, evidence index, audit log, WorkBuddy task status). Agents never write it; anything they write is overwritten.
const PHASE_NAMES = ["Engagement", "Usulan auditor", "GATE 1", "Pengumpulan bukti", "Kelengkapan", "Penilaian", "QA", "Laporan", "Penutupan"];
function writeProgress() {
  try {
    const run = activeRunName(); if (!run || !fs.existsSync(path.join(RUNS, run))) return;
    const rp = require.resolve("./runinfo"); delete require.cache[rp];
    const ri = require("./runinfo").runInfo(RUNS, path.join(ROOT, "progress.json"), run);
    const out = { run, fase: "FASE " + ri.fase_no + " — " + (PHASE_NAMES[ri.fase_no] || ""), fase_no: ri.fase_no, updated_at: ri.updated_at || "",
      menunggu_kartu: ri.menunggu_kartu || [], sedang: ri.sedang || {}, bukti_terindeks: ri.evidence_files || 0,
      sumber: "ditulis server dashboard dari outbox, indeks bukti, log audit dan status task WorkBuddy (bukan tulisan agen)" };
    fs.writeFileSync(path.join(ROOT, "progress.json"), JSON.stringify(out, null, 1));
  } catch (e) { /* keep the previous file */ }
}
if (!process.env.SIGAP_RUNS) { setTimeout(writeProgress, 3000); setInterval(writeProgress, 10e3); }
// checks.js (plain-language automatic checks per decision card) is hot-reloaded the same way
let _ck = { mtime: 0, fn: null };
function checkItem(run, rec) {
  try {
    const f = require.resolve("./checks"); const m = fs.statSync(f).mtimeMs;
    if (!_ck.fn || m !== _ck.mtime) { delete require.cache[f]; _ck = { mtime: m, fn: require("./checks").checkItem }; }
    return _ck.fn(run, rec);
  } catch (e) { return { checks: [{ ok: false, text: "Pemeriksaan otomatis gagal dijalankan: " + e.message }], advice: null, locked: ["Setujui sesuai preview", "Terima laporan dan susun CAP"] }; }
}
const RUNS = process.env.SIGAP_RUNS || path.join(PROJECT, "runs");
// test copies (SIGAP_RUNS) get their own audit log next to the copy — never the real audit-log/entries.json
if (process.env.SIGAP_RUNS && !process.env.SIGAP_AUDIT) {
  process.env.SIGAP_AUDIT = path.join(path.dirname(path.resolve(process.env.SIGAP_RUNS)), "audit-entries.json");
  if (!fs.existsSync(process.env.SIGAP_AUDIT)) fs.writeFileSync(process.env.SIGAP_AUDIT, "[]");
}
// integrity guard: decision records + audit log are restored from their seals when changed outside the tools
let lastGuard = 0;
function guardAll(runs) {
  if (Date.now() - lastGuard < 3000) return; lastGuard = Date.now();
  for (const r of runs) nodeTool(["tools/outbox.js", "guard", "--run", r]);
  nodeTool(["tools/audit.js", "guard", "--run", runs[runs.length - 1] || "-"]);
}
const ACTOR = "dashboard (manusia)";
function nodeTool(args) {
  try { return { ok: true, out: execFileSync(process.execPath, args, { cwd: PROJECT, encoding: "utf8", env: Object.assign({}, process.env, { SIGAP_SYSTEM: "1" }) }) }; }
  catch (e) { return { ok: false, out: (e.stdout || "") + (e.stderr || e.message) }; }
}
function blockedReason(outDir, r) {
  if (r.kind !== "email") return null;
  const all = fs.readdirSync(outDir).filter(x => x.endsWith(".json")).map(x => { try { return JSON.parse(fs.readFileSync(path.join(outDir, x), "utf8")); } catch (e) { return {}; } });
  const isDist = (r.payload && r.payload.jenis === "distribusi_laporan") || (all.some(o => o.kind === "report" && o.status === "EXECUTED") && /laporan/i.test((r.title || "") + " " + ((r.payload || {}).subject || "")));
  if (!isDist) return null;
  const finals = []; all.filter(o => o.kind === "report" && o.status === "EXECUTED").forEach(o => (o.payload.artefak || []).forEach(a => finals.push(a.file)));
  const covered = new Set(); all.filter(o => o.kind === "serah_terima" && o.status === "ANSWERED" && o.answer === "Terima laporan dan susun CAP" && intact(o)).forEach(o => (o.payload.artefak || []).forEach(a => covered.add(a.file)));
  const tampered = all.filter(o => o.id && !intact(o)).map(o => o.id);
  if (tampered.length) return "TAMPERED: isi item " + tampered.join(", ") + " berubah setelah diputuskan (hash tidak cocok). Distribusi dikunci.";
  const deck = "Presentasi-Hasil-Audit-" + path.basename(path.dirname(outDir)) + ".pptx";
  if (!finals.includes(deck)) return "Presentasi hasil audit " + deck + " belum diterbitkan Auditor" + (finals.some(f => /\.pptx$/i.test(f)) ? " (nama berkas presentasi yang ada tidak sesuai aturan)." : ".");
  const missing = finals.filter(f => !covered.has(f));
  return missing.length ? "Menunggu serah terima diterima Manager untuk: " + missing.join(", ") : null;
}
// Report handover is created deterministically from the EXECUTED report item (no agent needed):
// FINAL files in reports/<RUN>/ must match the sha256 approved in the report payload.
function ensureHandover(run) {
  const od = path.join(RUNS, run, "outbox"); if (!fs.existsSync(od)) return null;
  const all = fs.readdirSync(od).filter(x => x.endsWith(".json")).map(x => { try { return JSON.parse(fs.readFileSync(path.join(od, x), "utf8")); } catch (e) { return {}; } });
  // A human-approved report whose FINAL files are already in reports/<RUN>/ with the approved sha256 is published: mark it done.
  const cryptoR = require("crypto"); const rdirR = path.join(PROJECT, "reports", run);
  for (const o of all.filter(x => x.kind === "report" && x.status === "APPROVED")) {
    const arts = o.payload.artefak || []; if (!arts.length) continue;
    const okAll = arts.every(a => { const f = path.join(rdirR, a.file); return fs.existsSync(f) && cryptoR.createHash("sha256").update(fs.readFileSync(f)).digest("hex") === (a.sha256_final || a.sha256); });
    if (okAll) { const d = nodeTool(["tools/outbox.js", "done", "--run", run, "--id", o.id, "--result", "dashboard: semua berkas FINAL ada di reports/" + run + " dengan sha256 yang disetujui"]);
      if (d.ok) { o.status = "EXECUTED"; nodeTool(["tools/audit.js", "append", "--run", run, "--fase", "FASE 7", "--aktor", "dashboard (otomatis)", "--aksi", "laporan_terbit_terverifikasi_" + o.id, "--input", arts.map(a => a.file).join(", "), "--output", "status EXECUTED (hash FINAL cocok)", "--approval", "persetujuan manusia " + ((o.history || []).slice(-1)[0] || {}).at, "--ref", "runs/" + run + "/outbox/" + o.id + ".json"]); } }
  }
  const reps = all.filter(o => o.kind === "report" && o.status === "EXECUTED"); if (!reps.length) return null;
  const rep = reps[reps.length - 1];
  const wanted = []; reps.forEach(x => (x.payload.artefak || []).forEach(a => { const i = wanted.findIndex(w => w.file === a.file); if (i >= 0) wanted.splice(i, 1); wanted.push({ ...a, versi_final: x.payload.versi_final }); }));
  const prev = all.filter(o => o.kind === "serah_terima");
  const accepted = new Set(); prev.filter(o => o.status === "ANSWERED" && o.answer === "Terima laporan dan susun CAP" && intact(o)).forEach(o => (o.payload.artefak || []).forEach(a => accepted.add(a.file)));
  const todo = wanted.filter(a => !accepted.has(a.file)); if (!todo.length) return null;          // everything already handed over
  wanted.length = 0; todo.forEach(a => wanted.push(a));                                              // supplementary handover covers only new files
  const open = prev.find(o => o.status === "PENDING_APPROVAL");
  if (open) {
    const have = (open.payload.artefak || []).map(a => a.file).sort().join("|");
    if (have === wanted.map(a => a.file).sort().join("|")) return null;
    nodeTool(["tools/outbox.js", "decide", "--run", run, "--id", open.id, "--sha", open.sha256, "--option", "Revisi", "--actor", "dashboard (otomatis): diganti karena ada berkas FINAL baru", "--channel", "dashboard"]);
  }
  const rdir = path.join(PROJECT, "reports", run); const crypto = require("crypto"); const artefak = []; const bad = [];
  for (const a of wanted) {
    const f = path.join(rdir, a.file); const want = a.sha256_final || a.sha256;
    const got = fs.existsSync(f) ? crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex") : null;
    if (got !== want) bad.push(a.file); else artefak.push({ file: a.file, versi: a.versi_final || "FINAL", sha256: got, bytes: fs.statSync(f).size });
  }
  if (bad.length || !artefak.length) return "File FINAL tidak cocok dengan hash yang disetujui: " + bad.join(", ");
  const payload = { run, jenis: "serah_terima_laporan", dari: "Auditor ISO 27001 EKSTERNAL (melalui " + reps.map(x => x.id).join(", ") + ")", penerima: "Manager IT (internal)",
    artefak, ringkasan_conformity: rep.payload.ringkasan_conformity || {}, item_fokus: rep.payload.item_fokus || [],
    catatan: "Dokumen FINAL hasil " + rep.id + " (sudah diterbitkan). Menerima berarti Manager menerima laporan dan menyusun CAP; distribusi ke Direksi/CISO baru boleh setelah ini.",
    options: ["Minta klarifikasi auditor", "Terima laporan dan susun CAP"] };
  const tmp = path.join(RUNS, run, "outbox-serah-terima.tmp.json"); fs.writeFileSync(tmp, JSON.stringify(payload, null, 1));
  const r = nodeTool(["tools/outbox.js", "create", "--run", run, "--kind", "serah_terima", "--title", (accepted.size ? "Serah terima TAMBAHAN dokumen FINAL (" : "Serah terima dokumen FINAL dari Auditor ke Manager (") + run + ")", "--file", tmp]);
  try { fs.unlinkSync(tmp); } catch (e) {}
  if (r.ok) nodeTool(["tools/audit.js", "append", "--run", run, "--fase", "FASE 7", "--aktor", "dashboard (otomatis)", "--aksi", "serah_terima_dibuat_dari_" + rep.id, "--input", artefak.length + " berkas FINAL, hash cocok", "--output", r.out.trim(), "--ref", "runs/" + run + "/outbox"]);
  return null;
}
function pending() {
  const out = [];
  if (!fs.existsSync(RUNS)) return out;
  const all = fs.readdirSync(RUNS).sort();
  const latest = activeRunName(); // decisions only for the ACTIVE run
  const runs = process.env.SIGAP_RUNS ? all : (latest ? [latest] : []); // only the active (latest) run in production
  try { guardAll(runs); } catch (e) {}
  for (const r of runs) { try { ensureHandover(r); } catch (e) {} }
  for (const run of runs) {
    const d = path.join(RUNS, run, "outbox");
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter(x => x.endsWith(".json"))) {
      try { const r = JSON.parse(fs.readFileSync(path.join(d, f), "utf8")); if (r.status === "PENDING_APPROVAL") { const it = { run, id: r.id, kind: r.kind, title: r.title, sha256: r.sha256, created: r.created, payload: r.payload, blocked: blockedReason(d, r) }; Object.assign(it, { check: checkItem(run, it) }); out.push(it); } } catch (e) {}
    }
  }
  const ORDER = { serah_terima: 0, report: 1, release: 2, klarifikasi: 3, gate: 4, automation: 5, calendar: 6, email: 7 };
  out.sort((a, b) => (ORDER[a.kind] ?? 9) - (ORDER[b.kind] ?? 9));
  return out;
}
function releaseFiles(p) {
  if (Array.isArray(p.files)) return p.files.map(f => path.basename(String(f)));
  if (p.sha256 && typeof p.sha256 === "object") return Object.keys(p.sha256);
  return [];
}
// Decision comes from the human UI; the agent never writes it. Approved releases are executed here deterministically.
function decide(b) {
  if (!/^[A-Za-z0-9-]+$/.test(b.run || "") || !/^[A-Z][A-Z0-9_-]*$/.test(b.id || "")) return { ok: false, out: "bad run/id" };
  {
    const od = path.join(RUNS, b.run, "outbox"); const cur = JSON.parse(fs.readFileSync(path.join(od, b.id + ".json"), "utf8"));
    if (b.option === "Setujui sesuai preview") { const why = blockedReason(od, cur); if (why) return { ok: false, out: "Ditolak: " + why }; }
    const ck = checkItem(b.run, Object.assign({}, cur, { blocked: blockedReason(od, cur) }));
    if ((ck.locked || []).includes(b.option)) return { ok: false, out: "Dikunci oleh pemeriksaan otomatis: " + ck.checks.filter(x => !x.ok).map(x => x.text).join(" · ") };
  }
  // R16-F3 (7 Nov): Revisi/Tolak carry one of the FIXED reasons below (no free text), so the agent knows what to change
  const REASONS = ["Isi atau agenda keliru", "Penerima atau peserta salah", "Tanggal atau jam salah", "Ada catatan internal di isi pesan", "Tidak sesuai permintaan saya", "Belum diperlukan sekarang", "Sesuai saran pemeriksaan otomatis"];
  const neg = ["Revisi", "Tolak"].includes(b.option);
  if (b.reason && !REASONS.includes(b.reason)) return { ok: false, out: "alasan tidak dikenal" };
  if (neg && !b.reason) return { ok: false, out: "Pilih alasan untuk " + b.option + " dulu (daftar alasan di kartu)." };
  const r = nodeTool(["tools/outbox.js", "decide", "--run", b.run, "--id", b.id, "--sha", b.sha, "--option", b.option, "--actor", ACTOR, "--channel", "dashboard"].concat(neg ? ["--reason", b.reason] : []));
  if (!r.ok) return r;
  const rec = JSON.parse(fs.readFileSync(path.join(RUNS, b.run, "outbox", b.id + ".json"), "utf8"));
  const log = [r.out.trim()];
  if (rec.kind === "release" && rec.status === "APPROVED") {
    const src = rec.payload.sumber_folder; const owner = rec.payload.owner; let n = 0;
    for (const f of releaseFiles(rec.payload)) {
      const a = nodeTool(["tools/evidence.js", "add", "--run", b.run, "--src", path.join(src, f), "--owner", owner, "--approval", b.id]);
      log.push(a.out.trim()); if (a.ok) n++;
    }
    log.push(nodeTool(["tools/outbox.js", "done", "--run", b.run, "--id", b.id, "--result", "dashboard: " + n + " file diindeks ke Evidence"]).out.trim());
  }
  writeDecisionNote(b.run, rec, b.option, neg ? "— alasan pemilik: **" + b.reason + "**" : "");
  if (rec.kind === "eskalasi") {
    // escalation answered by the person: "Coba lagi" grants the Pengawas a fresh set of automatic retries for that task
    try {
      const lf = path.join(RUNS, b.run, "supervisor.json"); const L = JSON.parse(fs.readFileSync(lf, "utf8"));
      for (const w of Object.values(L.workers || {})) if (w.name === (rec.payload || {}).task) {
        if (b.option === "Coba lagi") w.attempts = {}; else w.skip = true;
        w.history = (w.history || []).concat([{ at: new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 19) + "+07:00", decision: b.option }]);
      }
      if (/ Manager$/.test((rec.payload || {}).task || "")) { L.manager = L.manager || { attempts: {}, history: [] }; if (b.option === "Coba lagi") L.manager.attempts = {}; else L.manager.skip = true; }
      if (b.option === "Coba lagi") for (const k of Object.keys(L.escalations || {})) if (L.escalations[k] === rec.id) delete L.escalations[k];
      fs.writeFileSync(lf, JSON.stringify(L, null, 1)); log.push("pengawas: " + (b.option === "Coba lagi" ? "percobaan ulang otomatis diberikan lagi" : "task dilewati (keterbatasan audit)"));
    } catch (e) { log.push("pengawas: ledger tidak bisa diperbarui: " + e.message); }
  }
  nodeTool(["tools/audit.js", "append", "--run", b.run, "--fase", "keputusan dashboard", "--aktor", ACTOR, "--aksi", "keputusan_" + rec.kind + "_" + b.id,
    "--input", (rec.title || "") + " sha256 " + rec.sha256, "--output", log.join(" | ").slice(0, 900), "--approval", "dashboard: " + b.option, "--ref", "runs/" + b.run + "/outbox/" + b.id + ".json"]);
  return { ok: true, status: rec.status, out: log.join(" | ") };
}
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/api/version") {
    const v = ["index.html", "run-view.js", "approvals-view.js", "humanize.js"].map(f => { try { return fs.statSync(path.join(ROOT, f)).mtimeMs; } catch (e) { return 0; } }).join("-");
    res.writeHead(200, { "Content-Type": MIME[".json"], "Cache-Control": "no-store" }); res.end(JSON.stringify({ v })); return;
  }
  if (url === "/api/run") {
    // ?run=ISO270001-NN opens that run's dashboard (per-run URL used by each Manager chat); without it: the active run
    const q = new URLSearchParams(req.url.split("?")[1] || ""); const want = q.get("run");
    const rp = require.resolve("./runinfo"); delete require.cache[rp]; const RI = require("./runinfo");
    const info = want ? RI.runView(RUNS, path.join(ROOT, "progress.json"), want) : runInfo(RUNS, path.join(ROOT, "progress.json"));
    info.pending = info.ended ? [] : pending().map(x => ({ id: x.id, title: x.title, kind: x.kind }));
    info.runs = RI.runList(RUNS);
    res.writeHead(200, { "Content-Type": MIME[".json"], "Cache-Control": "no-store" }); res.end(JSON.stringify(info)); return;
  }
  if (url.startsWith("/reports/")) {
    const parts = url.split("/").filter(Boolean); // reports, RUN, file
    if (parts.length !== 3 || !/^ISO270001-\d+$/.test(parts[1]) || parts[2].startsWith(".") || parts[2].includes("..")) { res.writeHead(403); res.end("403"); return; }
    const f = path.join(PROJECT, "reports", parts[1], parts[2]);
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); res.end("404"); return; }
    if (/\.md$/i.test(f)) { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }); res.end(mdPage(parts[2], fs.readFileSync(f, "utf8"))); return; }
    const inline = /\.(md|txt|json)$/i.test(f);
    res.writeHead(200, { "Content-Type": inline ? "text/plain; charset=utf-8" : "application/octet-stream", "Content-Disposition": (inline ? "inline" : "attachment") + '; filename="' + parts[2] + '"', "Cache-Control": "no-store" });
    fs.createReadStream(f).pipe(res); return;
  }
  if (url === "/api/pending") {
    res.writeHead(200, { "Content-Type": MIME[".json"], "Cache-Control": "no-store" }); res.end(JSON.stringify(pending())); return;
  }
  if (url === "/api/pengawas") { res.writeHead(200, { "Content-Type": MIME[".json"], "Cache-Control": "no-store" }); res.end(JSON.stringify(PENGAWAS)); return; }
  if (url === "/api/followup" && req.method === "POST") {
    // "Tindak lanjut" button: the person restarts a stalled process with one click (Run now on the Pengawas / wake the Manager)
    const origin = req.headers.origin || "";
    if (origin && !/^http:\/\/(localhost|127\.0\.0\.1):4173$/.test(origin)) { res.writeHead(403); res.end("bad origin"); return; }
    let body = ""; req.on("data", c => { body += c; if (body.length > 1e4) req.destroy(); });
    req.on("end", async () => {
      let r; try {
        const b = JSON.parse(body); if (!/^ISO270001-\d+$/.test(b.run || "") || !["pengawas", "manager", "agent"].includes(b.target)) throw new Error("bad request");
        const fp = require.resolve("./followup"); delete require.cache[fp]; const F = require("./followup");
        if (b.target === "agent") {
          // restart that task now: same WorkBuddy automation (same prompt), counted in the Pengawas ledger as a human follow-up
          const live = require(path.join(PROJECT, "tools", "wbstate.js")).read(b.run).find(a => a.name === b.agent);
          if (!live) throw new Error("task " + b.agent + " tidak ada di WorkBuddy");
          if (live.running) r = { ok: false, out: "task sedang berjalan; tidak perlu dijalankan ulang" };
          else { r = await F.trigger(live.id); if (r.ok) nodeTool(["tools/supervisor.js", "record", "--run", b.run, "--id", live.id, "--via", "manual"]); }
        } else r = b.target === "pengawas" ? await pengawasTick(true) : await F.wakeManager(b.run);
        nodeTool(["tools/audit.js", "append", "--run", b.run, "--fase", "tindak lanjut", "--aktor", ACTOR, "--aksi", "tindak_lanjut_" + b.target + (b.agent ? "_" + String(b.agent).replace(/[^\w-]+/g, "_").slice(0, 40) : ""),
          "--input", "tombol Tindak lanjut di dashboard" + (b.agent ? " untuk " + b.agent : ""), "--output", (r.ok ? "berhasil: " : "gagal: ") + r.out, "--approval", "dashboard: Tindak lanjut", "--ref", "progress-dashboard/followup.js"]);
      } catch (e) { r = { ok: false, out: e.message }; }
      res.writeHead(r.ok ? 200 : 400, { "Content-Type": MIME[".json"], "Cache-Control": "no-store" }); res.end(JSON.stringify(r));
    });
    return;
  }
  if (url === "/api/decide" && req.method === "POST") {
    const origin = req.headers.origin || "";
    if (origin && !/^http:\/\/(localhost|127\.0\.0\.1):4173$/.test(origin)) { res.writeHead(403); res.end("bad origin"); return; }
    let body = ""; req.on("data", c => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on("end", () => { let r; try { r = decide(JSON.parse(body)); } catch (e) { r = { ok: false, out: e.message }; }
      res.writeHead(r.ok ? 200 : 400, { "Content-Type": MIME[".json"], "Cache-Control": "no-store" }); res.end(JSON.stringify(r)); });
    return;
  }
  let file;
  if (url === "/" || url === "/index.html") {
    file = path.join(ROOT, "index.html");
  } else if (url === "/progress.json") {
    file = path.join(ROOT, "progress.json");
  } else {
    const safe = path.resolve(path.join(ROOT, url));
    if (!safe.startsWith(path.resolve(ROOT) + path.sep)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      res.end("403 — di luar root");
      return;
    }
    file = safe;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      res.end("404 — tidak ditemukan: " + url);
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store" // progress.json harus selalu segar (polling tiap 2 dtk)
    });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log("SIGAP progress dashboard — LIVE di http://localhost:" + PORT);
  console.log("View per task (hash routing):");
  console.log("  manager  : http://localhost:" + PORT + "/#manager");
  console.log("  assessor : http://localhost:" + PORT + "/#assessor");
  console.log("  staf     : http://localhost:" + PORT + "/#staf/dc-server  (id: dc-server, network-user, appdev, sap-func, sap-basis, cyber-security)");
  console.log("Data: progress.json — ditulis server tiap 10 detik dari state sistem (bukan agen); halaman auto-refresh tiap 2 detik.");
  console.log("Tekan Ctrl+C untuk berhenti.");
});