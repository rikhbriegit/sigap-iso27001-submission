// SIGAP v5.1 — run summary for the dashboard, derived from run state files (not from agent prose).
"use strict";
const fs = require("fs");
const path = require("path");

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { return null; } }

function titleFromAssessment(file, item) {
  if (!fs.existsSync(file)) return "";
  const esc = item.replace(/\./g, "\\.");
  const m = new RegExp("^\\|\\s*" + esc + "\\s*\\|\\s*([^|\\n]+?)\\s*\\|", "m").exec(fs.readFileSync(file, "utf8"));
  return m ? m[1] : "";
}

function statusesFromAssessment(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  const txt = fs.readFileSync(file, "utf8");
  const re = /^###\s+[\d.]+\s+(.+?)\s+—[^\n]*\n([\s\S]*?)(?=^###\s|^##\s|$(?![\s\S]))/gm;
  let m;
  while ((m = re.exec(txt))) {
    const st = /\*\*Status\*\*\s*:\s*\**\s*(Conform|Minor NC|Major NC|OFI|N\/A)/.exec(m[2]);
    if (st) out[m[1].trim()] = st[1];
  }
  // R11-F8: also read the summary table "| A.8.13 | Backup informasi | Minor NC | … |" and "Status: X" under "## A.8.13"
  const row = /^\|\s*((?:A\.\d+\.\d+)|(?:Klausul\s*[\d.]+)|(?:\d+\.\d+))\s*\|[^|\n]*\|\s*\**(Conform|Minor NC|Major NC|OFI|N\/A)\**\s*\|/gm;
  while ((m = row.exec(txt))) if (!out[m[1].trim()]) out[m[1].trim()] = m[2];
  const sec = /^#{2,4}\s+[^\n]*?((?:A\.\d+\.\d+)|(?:Klausul\s*[\d.]+))[^\n]*\n([\s\S]*?)(?=^#{2,4}\s|$(?![\s\S]))/gm;
  while ((m = sec.exec(txt))) { const st = /Status\**\s*[:：]\s*\**\s*(Conform|Minor NC|Major NC|OFI|N\/A)/.exec(m[2]); if (st && !out[m[1].trim()]) out[m[1].trim()] = st[1]; }
  return out;
}

// The ACTIVE run is the single source of truth for every dashboard view and for the Pengawas (user, 6 Nov: the dashboard showed
// ISO270001-12 — a stopped run — while run 13 was starting). Active = highest run in simulation/run-counter.json whose status is
// not stopped/finished/cancelled (it may not have a folder yet: the Manager allocated it a moment ago). No active run → none.
const ENDED = /dihentikan|selesai|dibatalkan|ditutup/i;
function activeRun(runsDir) {
  const counterFile = process.env.SIGAP_RUN_COUNTER || path.join(runsDir, "..", "simulation", "run-counter.json");
  const dirs = fs.existsSync(runsDir) ? fs.readdirSync(runsDir).filter(r => /^ISO270001-\d+$/.test(r)).sort() : [];
  const counter = readJson(counterFile);
  if (!counter || !Array.isArray(counter.riwayat) || process.env.SIGAP_RUNS && !process.env.SIGAP_RUN_COUNTER) {
    return dirs.length ? { run: dirs[dirs.length - 1], source: "folder" } : { run: null }; // tests / no counter: latest folder
  }
  const name = no => "ISO270001-" + String(no).padStart(2, "0");
  const hist = counter.riwayat.slice().sort((a, b) => a.no - b.no);
  const last = hist[hist.length - 1];
  const act = hist.filter(e => !ENDED.test(e.status || "")).pop();
  if (act && (!last || act.no === last.no)) return { run: name(act.no), source: "run-counter", status: act.status || "berjalan", mulai: act.mulai || null };
  return { run: null, last: last ? { run: name(last.no), status: String(last.status || "").split(" — ")[0], mulai: last.mulai || null } : null };
}

function runInfo(runsDir, progressFile, forceRun) {
  const act = forceRun ? { run: forceRun } : activeRun(runsDir);
  if (!act.run) {
    // no ACTIVE run: still show the LAST run in full, read-only, with an "ended" banner (user: results must stay visible)
    if (act.last && act.last.run && fs.existsSync(path.join(runsDir, act.last.run))) {
      const info = runInfo(runsDir, progressFile, act.last.run);
      return Object.assign(info, { ended: true, endedStatus: act.last.status, endedMulai: act.last.mulai, none: false,
        agents: (info.agents || []).map(a => / Pengawas$/.test(a.name) ? Object.assign({}, a, { icon: "⏹", cls: "t-mut", status: "Tidak aktif untuk run ini (run ditutup)", action: null, hint: "" })
          : Object.assign({}, a, a.icon === "✅" ? { action: null, hint: "" } : { icon: "✅", cls: "t-ok", status: "Run ditutup", action: null, hint: "" })) });
    }
    return { run: null, none: true, last: act.last || null };
  }
  const run = act.run;
  const dir = path.join(runsDir, run);
  const progAll = readJson(progressFile) || {};
  const prog = progAll.run === run ? progAll : {}; // never show another run's agent notes
  if (!fs.existsSync(dir)) return { run, starting: true, fase: "FASE 0 — Engagement", fase_no: 0, updated_at: act.mulai || "", sedang: { kontrol: "FASE 0", aktivitas: "Run baru dialokasikan; Manager menyiapkan engagement.", pic: "Manager" },
    audit: [], items: [], laporan: [], serah: {}, outbox: {}, evidence_files: 0, menunggu_kartu: [], agents: [{ name: run + " Manager", role: "Manager IT (internal)", icon: "🟢", status: "Sedang bekerja — FASE 0 Engagement", cls: "t-ok", hint: "", last: "" }] };
  const proposal = readJson(path.join(dir, "proposal.json")) || {};
  const requests = (readJson(path.join(dir, "requests.json")) || {}).requests || [];
  const klar = (readJson(path.join(dir, "klarifikasi-bukti.json")) || {}).queue || [];
  const index = readJson(path.join(dir, "evidence-index.json")) || [];
  const statuses = statusesFromAssessment(path.join(dir, "penilaian-auditor.md"));
  const selections = {};
  for (const f of fs.readdirSync(dir).filter(x => /^selection-.+\.json$/.test(x))) selections[f.slice(10, -5)] = readJson(path.join(dir, f)) || [];
  const released = new Set(index.map(e => e.owner + "/" + e.file));
  const items = (proposal.fokus || []).map(f => {
    const req = requests.find(r => r.item === f.item) || {};
    const sel = (selections[f.task_pengumpul] || []).filter(s => s.item === f.item);
    const files = [...new Set(sel.map(s => s.file))];
    const k = klar.filter(q => String(q.item || "").split(/\s/)[0] === f.item);
    return {
      item: f.item, judul: f.judul || req.judul || titleFromAssessment(path.join(dir, "penilaian-auditor.md"), f.item) || (klar.find(q => String(q.item || "").startsWith(f.item + " ")) || {}).item?.split(/\s[—-]\s/)[1] || "", pic: req.pic_nama || f.pic_kontak || "", task: f.task_pengumpul,
      permintaan: req.status || "—", dikumpulkan: files.length, dirilis: files.filter(x => released.has(f.task_pengumpul + "/" + x)).length,
      klarifikasi_total: k.length, klarifikasi_dijawab: k.filter(q => q.status === "dijawab").length,
      status: statuses[f.item] || null
    };
  });
  const outbox = {};
  const od = path.join(dir, "outbox");
  if (fs.existsSync(od)) for (const f of fs.readdirSync(od).filter(x => x.endsWith(".json"))) { const o = readJson(path.join(od, f)); if (o) outbox[o.status] = (outbox[o.status] || 0) + 1; }
  const audit = (readJson(process.env.SIGAP_AUDIT || path.join(runsDir, "..", "audit-log", "entries.json")) || [])
    .filter(e => e.run === run).reverse()
    .map(e => ({ jam: String(e.timestamp || "").slice(11, 16), aktor: e.aktor || "", aksi: e.aksi || "", output: e.output || "", approval: e.approval || "", status_sistem: e.status_sistem || "" }));
  const crypto = require("crypto");
  const rdir = path.join(runsDir, "..", "reports", run);
  const laporan = fs.existsSync(rdir) ? fs.readdirSync(rdir).filter(f => !f.startsWith(".") && fs.statSync(path.join(rdir, f)).isFile() && !/^status-.*\.json$/.test(f)).map(f => {
    const b = fs.readFileSync(path.join(rdir, f)); const st = fs.statSync(path.join(rdir, f));
    return { file: f, size: b.length, sha256: crypto.createHash("sha256").update(b).digest("hex"), waktu: new Date(st.mtimeMs + 7 * 3600e3).toISOString().slice(11, 16) };
  }) : [];
  const ob = fs.existsSync(od) ? fs.readdirSync(od).filter(x => x.endsWith(".json")).map(f => readJson(path.join(od, f))).filter(Boolean) : [];
  const rep = ob.filter(o => o.kind === "report").pop() || null;
  const st = ob.filter(o => o.kind === "serah_terima").pop() || null;
  const em = ob.filter(o => o.kind === "email" && ((o.payload || {}).jenis === "distribusi_laporan" || /distribusi/i.test(o.title || ""))).pop() || null; // only the report distribution
  const serah = { laporan_status: rep ? rep.status : null, serah_terima: st ? { id: st.id, status: st.status, answer: st.answer || null, waktu: ((st.history || []).slice(-1)[0] || {}).at || null } : null, distribusi: em ? { id: em.id, status: em.status } : null };
  // phase: the agent's text may say "FASE 7 SELESAI … FASE 8 AKTIF" — prefer the active phase, and never show a phase
  // earlier than what the system state proves (a sent distribution email = FASE 8 Penutupan).
  const ptxt = String(prog.fase || "");
  const aktif = /FASE\s*(\d)\s*(?:AKTIF|BERJALAN|SEDANG)/i.exec(ptxt);
  const nums = (ptxt.match(/FASE\s*(\d)/gi) || []).map(x => Number(x.replace(/\D/g, "")));
  let faseNo = aktif ? Number(aktif[1]) : (nums.length ? nums[0] : null);
  const distSent = ob.some(o => o.kind === "email" && o.status === "EXECUTED" && ((o.payload || {}).jenis === "distribusi_laporan" || /laporan/i.test((o.title || "") + " " + ((o.payload || {}).subject || ""))));
  // R11-F8 (user: dashboard must be right without depending on the agent): derive the active phase from system state.
  const gateDone = n => ob.some(o => o.kind === "gate" && o.status === "EXECUTED" && new RegExp("GATE\\s*" + n + "\\b", "i").test((o.title || "") + " " + ((o.payload || {}).fase || "")));
  const assessed = Object.keys(statuses).length > 0;
  const stateNo = distSent ? 8
    : (rep && rep.status === "EXECUTED") || gateDone(2) ? 7      // GATE 2 approved → report phase active
    : assessed ? 5                                              // penilaian-auditor.md has statuses
    : klar.length ? 4
    : index.length ? 3
    : gateDone(1) ? 3
    : proposal.fokus ? 2
    : ob.some(o => o.kind === "automation" && o.status === "EXECUTED" && /auditor/i.test(String((o.payload || {}).name || o.title || ""))) ? 1 // Auditor task created = FASE 1 (Auditor's turn)
    : 0;                                                        // a run exists = FASE 0 Engagement at least
  if (stateNo != null && (faseNo == null || faseNo < stateNo)) faseNo = stateNo;
  // agent prose may never move the phase PAST what the system state proves (run 14: progress.json said FASE 8 before any distribution)
  if (stateNo != null && faseNo != null && faseNo > stateNo) faseNo = stateNo;
  // v5.4 (user, 7 Nov: "progress.json kenapa ditulis manual?"): agents no longer write progress.json; the phase is the system state only
  faseNo = stateNo;
  // R11-F8: waiting cards, current activity and "updated" time come from the outbox and the audit log, not from agent prose
  const DASH_KINDS = ["release", "klarifikasi", "serah_terima", "email", "calendar", "report", "eskalasi"];
  const menunggu = ob.filter(o => o.status === "PENDING_APPROVAL").map(o => ({ kartu: o.id + " — " + (o.title || o.kind), conversation: DASH_KINDS.includes(o.kind) ? "dashboard #approvals" : run + " Manager", run }));
  const last = audit[0] || null;
  const sedang = last ? { kontrol: "FASE " + faseNo, aktivitas: last.jam + " · " + last.aktor + " · " + last.aksi.replace(/_/g, " ") + (last.output ? " — " + last.output.slice(0, 160) : ""), pic: last.aktor } : {};
  const lastTs = audit.length ? String((readJson(process.env.SIGAP_AUDIT || path.join(runsDir, "..", "audit-log", "entries.json")) || []).filter(e => e.run === run).slice(-1)[0].timestamp || "") : "";
  let agents = [];
  try {
    const ap = require.resolve("./agents"); delete require.cache[ap];
    const raw = (readJson(process.env.SIGAP_AUDIT || path.join(runsDir, "..", "audit-log", "entries.json")) || []).filter(e => e.run === run);
    agents = require("./agents").agentsInfo(run, runsDir, faseNo, raw, ob);
  } catch (e) { agents = [{ name: "status agen", role: "", icon: "⚠️", status: "gagal dihitung: " + e.message, cls: "t-bad", hint: "", last: "" }]; }
  return { run, fase: "FASE " + faseNo, fase_no: faseNo, updated_at: lastTs,
    sedang, audit, items, laporan, serah, outbox, evidence_files: index.length, menunggu_kartu: menunggu, agents,
    // every email / invitation of the run with its real state: only EXECUTED (with the Gmail message id) means it was sent
    emails: ob.filter(o => ["email", "calendar"].includes(o.kind)).map(o => { const p = o.payload || {};
      const to = [].concat(p.to || [], p.cc || [], p.peserta || [], p.attendees || [], p.participants || []).map(x => typeof x === "string" ? x : (x && x.email) || "").filter(Boolean);
      return { id: o.id, kind: o.kind, title: o.title || p.subject || p.title || "", status: o.status, to, result: o.result || "", at: ((o.history || []).slice(-1)[0] || {}).at || "" }; }) };
}
// any run by name (per-run dashboard URL ?run=ISO270001-NN): the active run is live, every other run is read-only ("ended")
function runView(runsDir, progressFile, run) {
  const act = activeRun(runsDir);
  if (!run || run === act.run) return runInfo(runsDir, progressFile);
  if (!/^ISO270001-\d+$/.test(run) || !fs.existsSync(path.join(runsDir, run))) return { run: null, none: true, last: act.last || null, notFound: run };
  const counter = readJson(process.env.SIGAP_RUN_COUNTER || path.join(runsDir, "..", "simulation", "run-counter.json")) || {};
  const e = (counter.riwayat || []).find(x => "ISO270001-" + String(x.no).padStart(2, "0") === run) || {};
  const info = runInfo(runsDir, progressFile, run);
  return Object.assign(info, { ended: true, endedStatus: (e.status && ENDED.test(e.status) ? String(e.status).split(" — ")[0] : "tidak aktif (bukan run terakhir)"), endedMulai: e.mulai || null, activeRun: act.run || null,
    agents: (info.agents || []).map(a => / Pengawas$/.test(a.name) ? Object.assign({}, a, { icon: "⏹", cls: "t-mut", status: "Tidak aktif untuk run ini", action: null, hint: "" })
      : Object.assign({}, a, a.icon === "✅" ? { action: null, hint: "" } : { icon: "⏹", cls: "t-mut", status: "Run tidak aktif", action: null, hint: "" })) });
}
function runList(runsDir) {
  const counter = readJson(process.env.SIGAP_RUN_COUNTER || path.join(runsDir, "..", "simulation", "run-counter.json")) || {};
  const dirs = fs.existsSync(runsDir) ? fs.readdirSync(runsDir).filter(r => /^ISO270001-\d+$/.test(r)) : [];
  return dirs.sort().reverse().map(r => { const e = (counter.riwayat || []).find(x => "ISO270001-" + String(x.no).padStart(2, "0") === r) || {}; return { run: r, status: String(e.status || "").split(" — ")[0], active: r === activeRun(runsDir).run }; });
}
module.exports = { runInfo, activeRun, runView, runList };
