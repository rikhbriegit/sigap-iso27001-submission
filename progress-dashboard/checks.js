// SIGAP — automatic checks per decision card, in plain language (user: "a normal user does not know hash matching and
// would not know how to fix it"). The server runs every technical check itself and tells the person: what was checked
// (✓/✗), what it means, which option to choose and what happens next. Options that would be unsafe are locked.
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PROJECT = path.resolve(__dirname, "..");
const DATA_OP = "G:/My Drive/Hackathon_Tencent/Data-Operation";
const hashFile = f => { try { return crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex"); } catch (e) { return null; } };
const readJson = p => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { return null; } };
const ALIAS = /^rikh\.brie(\+[a-z]+)?@gmail\.com$/i;
const STATUS = "(Conform|Minor NC|Major NC|OFI|N\\/A|Compliant)";
const ITEM = "(A\\.\\d+\\.\\d+|Klausul\\s*\\d+(\\.\\d+)*|KL-\\d+|butir\\s*\\d+)";
const VERDICT = new RegExp(ITEM + "[^;\\n]{0,160}?(→|->|=>|=|:|menjadi|dinilai)\\s*\\**" + STATUS + "\\b", "i");

function manifestHashes() {
  const m = readJson(path.join(PROJECT, "simulation", "data-operation-manifest.json"));
  const list = Array.isArray(m) ? m : (m && (m.files || m.entries)) || [];
  return new Set(list.map(x => x.sha256).filter(Boolean));
}
function outboxAll(run) {
  const d = path.join(PROJECT, "runs", run, "outbox");
  return fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith(".json")).map(f => readJson(path.join(d, f))).filter(Boolean) : [];
}
const deckName = run => "Presentasi-Hasil-Audit-" + run + ".pptx";

// returns { checks: [{ok, text}], advice: {option, why, next}, locked: [option labels] }
function checkItem(run, r) {
  const c = []; const add = (ok, text) => c.push({ ok: !!ok, text });
  const p = r.payload || {};
  let advice = null; const locked = [];
  const approveLabel = (p.options || []).includes("Terima laporan dan susun CAP") ? "Terima laporan dan susun CAP" : "Setujui sesuai preview";

  if (r.kind === "serah_terima") {
    const rdir = path.join(PROJECT, "reports", run);
    const issued = outboxAll(run).some(o => o.kind === "report" && o.status === "EXECUTED" && (o.payload || {}).jenis !== "distribusi_laporan");
    add(issued, issued ? "Laporan sudah diterbitkan resmi (ada keputusan penerbitan yang sudah dijalankan)." : "Laporan BELUM diterbitkan resmi: belum ada keputusan penerbitan laporan yang dijalankan.");
    for (const a of p.artefak || []) {
      const draft = /draft/i.test(String(a.versi || ""));
      const f = path.join(rdir, a.file); const h = hashFile(f);
      const okFinal = !draft && h && h === (a.sha256_final || a.sha256);
      add(okFinal, okFinal ? `${a.file}: versi FINAL ada di folder laporan resmi dan isinya sama persis dengan yang diserahkan.`
        : draft ? `${a.file}: masih versi DRAFT — yang diserahterimakan harus versi FINAL yang sudah terbit.`
        : !h ? `${a.file}: belum ada di folder laporan resmi (reports/${run}).` : `${a.file}: isi berkas di folder laporan resmi BERBEDA dari yang diserahkan.`);
    }
    if (c.some(x => !x.ok)) { locked.push("Terima laporan dan susun CAP");
      advice = { option: "Minta klarifikasi auditor", why: "Laporan yang diserahkan belum versi final yang resmi terbit.", next: "Auditor menerbitkan versi FINAL lebih dulu; setelah itu serah terima baru dibuat otomatis oleh sistem dan muncul lagi di sini." };
    } else advice = { option: "Terima laporan dan susun CAP", why: "Semua berkas yang diserahkan sudah terbit FINAL dan isinya cocok.", next: "Anda menjadi pemilik CAP (tenggat ≤ 90 hari untuk Minor NC); distribusi ke Direksi/CISO baru bisa diputuskan setelah ini." };
  }

  else if (r.kind === "report") {
    const isDist = p.jenis === "distribusi_laporan" || p.to || p.cc;
    add(!isDist, !isDist ? "Item ini hanya menerbitkan laporan (tidak mengirim email)." : "Item ini mencampur penerbitan laporan dengan pengiriman email ke Direksi — keduanya harus dua keputusan terpisah (terbit dulu, serah terima, baru kirim).");
    const arts = p.artefak || [];
    const deck = arts.find(a => /\.pptx$/i.test(a.file || ""));
    add(deck && deck.file === deckName(run), deck ? (deck.file === deckName(run) ? `Presentasi hasil audit ada dengan nama yang benar (${deckName(run)}).` : `Nama presentasi salah: ${deck.file} (harus ${deckName(run)}).`) : "Presentasi hasil audit (.pptx) tidak ada di daftar berkas.");
    for (const a of arts) {
      const hasFinal = !!a.sha256_final || /final/i.test(String(a.versi || "") + " " + String(p.versi_final || ""));
      add(hasFinal, hasFinal ? `${a.file}: versi FINAL tercantum.` : `${a.file}: hanya versi DRAFT — belum ada versi FINAL yang akan diterbitkan.`);
      const h = hashFile(path.join(PROJECT, "runs", run, a.file));
      if (a.sha256 && !hasFinal) add(h === a.sha256, h === a.sha256 ? `${a.file}: isi draft cocok dengan berkas yang sedang dikerjakan auditor.` : `${a.file}: isi berkas sudah berubah sejak diajukan.`);
    }
    if (c.some(x => !x.ok)) { locked.push("Setujui sesuai preview");
      advice = { option: "Revisi", why: "Pengajuan penerbitan laporan belum memenuhi aturan.", next: "Auditor memperbaiki pengajuan (penerbitan saja, dengan versi FINAL dan presentasi), lalu mengajukan item baru." };
    } else advice = { option: "Setujui sesuai preview", why: "Penerbitan laporan lengkap dan sesuai aturan.", next: "Auditor menyalin versi FINAL ke folder laporan resmi; sistem lalu membuat serah terima untuk Anda." };
  }

  else if (r.kind === "email" || r.kind === "calendar") {
    // every address must be EXACTLY one of the contacts (IT Manager rikh.brie@gmail.com, IT staff, Direksi/CISO, Auditor)
    const CONTACTS = ((readJson(path.join(PROJECT, "data", "mock", "contacts.json")) || {}).contacts || []).map(c => ({ email: String(c.email).toLowerCase(), name: c.name, role: c.role }));
    const rec = [].concat(p.to || [], p.cc || [], p.bcc || [], p.peserta || [], p.attendees || [], p.participants || []).map(x => typeof x === "string" ? x : (x && x.email) || "").filter(Boolean);
    const from = [].concat(p.from || []).map(x => typeof x === "string" ? x : (x && x.email) || "").filter(Boolean);
    const known = a => CONTACTS.find(c => c.email === String(a).toLowerCase());
    const badR = rec.filter(a => !known(a)), badF = from.filter(a => !known(a));
    add(rec.length && !badR.length, !rec.length ? "Tidak ada penerima/peserta yang terbaca." : !badR.length ? "Penerima: " + rec.map(a => known(a).name + " (" + a + ")").join(", ") + "." : "Alamat TIDAK ADA di daftar kontak: " + badR.join(", ") + " (Manager = rikh.brie@gmail.com).");
    if (from.length) add(!badF.length, !badF.length ? "Pengirim: " + from.map(a => known(a).name).join(", ") + "." : "Pengirim TIDAK ADA di daftar kontak: " + badF.join(", ") + ".");
    // the same message/meeting (recipients + date) was already sent with a Gmail id -> never send it twice
    try { const mk = require(path.join(PROJECT, "tools", "mailkey.js")); const twin = mk.sentTwin(r, outboxAll(run));
      add(!twin, !twin ? "Belum pernah terkirim ke penerima yang sama untuk tanggal ini." : "SUDAH TERKIRIM sebagai " + twin.id + " (ID Gmail " + String(twin.result).replace("gmail:", "") + ") — jangan dikirim dua kali."); } catch (e) {}
    if (/notulen/i.test(String(p.subject || "") + " " + String(r.title || ""))) {
      const body = String(p.body || p.body_preview || "");
      const placeholder = /belum (tersedia|dilaksanakan|terjadi)|placeholder/i.test(body + " " + String(r.title || ""));
      add(!placeholder, !placeholder ? "Isi notulen tersedia." : "Notulen BELUM ADA (rapat belum terjadi) — email ini menyebut notulen yang belum ada; jangan dikirim.");
    }
    // R16-F4 (7 Nov): a kickoff invitation must carry exactly the kickoff date/time/participants approved in GATE 1
    if (p.jenis === "undangan_kickoff") {
      const prop = readJson(path.join(PROJECT, "runs", run, "proposal.json")) || {};
      const k = (prop.jadwal || []).find(j => /kickoff/i.test(j.agenda || ""));
      if (!k) add(false, "Jadwal kickoff tidak ditemukan di proposal yang disetujui.");
      else {
        const all = (String(p.body || "") + " " + String(p.tanggal || "") + " " + String(p.waktu || "") + " " + String(p.start || ""));
        const d = String(k.tanggal || ""), [dy, dm, dd] = d.split("-");
        const months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
        const dateOk = all.includes(d) || (dd && new RegExp("\\b" + Number(dd) + "\\s+" + months[Number(dm) - 1], "i").test(all));
        const hhmm = (String(k.waktu || "").match(/\d{1,2}[:.]\d{2}/) || [""])[0].replace(".", ":");
        const timeOk = hhmm && all.replace(/\./g, ":").includes(hhmm);
        const CT = ((readJson(path.join(PROJECT, "data", "mock", "contacts.json")) || {}).contacts || []);
        const want = (k.peserta || []).map(id => (CT.find(c => c.id === id) || {}).email).filter(Boolean).map(x => x.toLowerCase());
        const missing = want.filter(e => !rec.map(x => String(x).toLowerCase()).includes(e));
        add(dateOk && timeOk, dateOk && timeOk ? "Tanggal dan jam sama dengan jadwal kickoff yang disetujui (" + d + " " + k.waktu + ")." : "Tanggal/jam berbeda dari jadwal kickoff yang disetujui (" + d + " " + k.waktu + ").");
        add(!missing.length, !missing.length ? "Semua peserta kickoff yang disetujui diundang." : "Peserta kickoff yang disetujui belum diundang: " + missing.join(", ") + ".");
      }
    }
    // R16-F3 (7 Nov): the text that reaches the recipient must not carry internal SIGAP/system notes (outbox ids, dashboard,
    // approvals, tool names, "menunggu persetujuan", "draf sebelumnya ... revisi") — the recipient reads it as a real message.
    { const body = String(p.body || p.body_preview || "");
      const INTERNAL = [/#approvals/i, /dashboard/i, /menunggu persetujuan/i, /\b(EMAIL|CALENDAR|GATE|RELEASE|REPORT|AUTOMATION|KLARIFIKASI)-\d{3}\b/, /tools\/[\w-]+\.js/i, /outbox/i, /dikembalikan untuk revisi/i, /\bdraf sebelumnya\b/i];
      const hits = INTERNAL.map(re => (body.match(re) || [])[0]).filter(Boolean);
      add(!hits.length, !hits.length ? "Isi pesan bersih dari catatan internal sistem." : "Isi pesan memuat catatan internal sistem yang akan terbaca penerima: \"" + hits.join("\", \"") + "\" — hapus dari isi pesan."); }
    if (r.blocked) add(false, r.blocked);
    const fails = c.filter(x => !x.ok).map(x => x.text).join(" ");
    if (/SUDAH TERKIRIM sebagai/.test(fails)) { locked.push("Setujui sesuai preview"); advice = { option: "Tolak", why: "Email/undangan yang sama sudah terkirim.", next: "Tidak perlu tindakan lain; penerima sudah menerima pesan itu." }; }
    else if (/Notulen BELUM ADA/.test(fails)) { locked.push("Setujui sesuai preview"); advice = { option: "Tolak", why: "Email ini menyebut notulen rapat yang belum terjadi — tidak boleh dikirim.", next: "Notulen baru dikirim setelah rapat benar-benar berlangsung (item baru)." }; }
    else if (/jadwal kickoff|Peserta kickoff/.test(fails)) { locked.push("Setujui sesuai preview"); advice = { option: "Revisi", why: "Undangan kickoff tidak sama dengan jadwal yang disetujui di GATE 1.", next: "Auditor membuat item baru dengan tanggal, jam dan peserta persis dari jadwal kickoff di proposal." }; }
    else if (/catatan internal sistem/.test(fails)) { locked.push("Setujui sesuai preview"); advice = { option: "Revisi", why: "Isi pesan memuat catatan internal sistem yang akan terbaca penerima.", next: "Manager membuat item baru dengan isi pesan tanpa catatan internal (id item, dashboard, nama tool, status persetujuan)." }; }
    else if (/TIDAK ADA di daftar kontak/.test(fails)) { locked.push("Setujui sesuai preview"); advice = { option: "Revisi", why: "Ada alamat yang bukan kontak SIGAP.", next: "Manager membuat ulang item dengan alamat dari daftar kontak, lalu muncul lagi di sini." }; }
    else if (c.some(x => !x.ok)) { locked.push("Setujui sesuai preview"); advice = { option: "Tunda", why: "Pengiriman belum boleh dilakukan.", next: "Item ini tetap menunggu; setelah syaratnya terpenuhi, pemeriksaan di sini otomatis berubah hijau." }; }
    else advice = { option: "Setujui sesuai preview", why: "Penerima dan isi sudah sesuai aturan.", next: "Email dikirim persis seperti isi di atas." };
  }

  else if (r.kind === "automation") {
    const t = Date.parse(p.scheduledAt || "");
    if (p.scheduledAt) add(t > Date.now(), t > Date.now() ? `Waktu jalan ${String(p.scheduledAt).slice(11, 16)} masih di depan.` : `Waktu jalan ${String(p.scheduledAt).slice(11, 16)} sudah lewat — task tidak akan jalan sesuai rencana.`);
    if (/auditor/i.test(String(p.name || "") + " " + String(r.title || ""))) {
      const v = VERDICT.exec(String(p.prompt || ""));
      add(!v, !v ? "Perintah untuk Auditor tidak berisi vonis — penilaian tetap independen." : "Perintah untuk Auditor sudah menentukan hasil penilaian (\"" + v[0].slice(-60) + "\") — Manager tidak boleh memvonis.");
    }
    if (/auditor/i.test(String(p.name || "") + " " + String(r.title || ""))) {
      // open human decisions the Auditor must act on (Revisi / Tolak on its items, handover sent back for clarification)
      const open = outboxAll(run).filter(o => o.id !== r.id && ((["report", "serah_terima", "calendar", "email"].includes(o.kind) && ["REVISION", "REJECTED"].includes(o.status)) || (o.kind === "serah_terima" && o.status === "ANSWERED" && o.answer === "Minta klarifikasi auditor"))
        && !outboxAll(run).some(n => n.kind === o.kind && n.id > o.id && n.status !== "REJECTED"))
        // plus pending report/handover items that already fail their own automatic checks (the Auditor must fix them)
        .concat(outboxAll(run).filter(o => ["report", "serah_terima"].includes(o.kind) && o.status === "PENDING_APPROVAL" && checkItem(run, o).checks.some(x => !x.ok)));
      const prompt = String(p.prompt || "");
      const missing = open.filter(o => !prompt.includes(o.id) || (o.status !== "PENDING_APPROVAL" && !prompt.includes("keputusan-" + o.id)));
      const blocksFix = open.length && /jangan\s+ulang\s+fase\s*7/i.test(prompt);
      add(!missing.length && !blocksFix, !open.length ? "Tidak ada keputusan Anda yang masih harus ditindaklanjuti Auditor."
        : (!missing.length && !blocksFix) ? "Perintah meminta Auditor menindaklanjuti keputusan Anda (" + open.map(o => o.id).join(", ") + ") sesuai catatan keputusannya."
        : "Perintah TIDAK meminta Auditor menindaklanjuti keputusan Anda yang masih terbuka: " + open.map(o => o.id + " (" + (o.answer || o.status) + ")").join(", ") + (blocksFix ? " — bahkan melarang Auditor mengulang FASE 7, sehingga laporan tidak akan pernah terbit FINAL." : "") + " Perintah harus menunjuk catatan " + open.map(o => "notes/keputusan-" + o.id + ".md").join(", ") + ".");
    }
    if (/ Pengawas$/.test(String(p.name || ""))) {
      let want = ""; try { want = require("child_process").execFileSync(process.execPath, [path.join(PROJECT, "tools", "supervisor.js"), "prompt", "--run", run], { encoding: "utf8" }).trim(); } catch (e) {}
      add(String(p.prompt || "").trim() === want, String(p.prompt || "").trim() === want ? "Perintah Pengawas persis dari sistem (tidak ditulis agen)." : "Perintah Pengawas BERBEDA dari yang dihasilkan sistem.");
      add(p.scheduleType === "recurring" && /^FREQ=HOURLY;INTERVAL=1$/.test(p.rrule || ""), p.scheduleType === "recurring" ? "Berjalan otomatis tiap 1 jam selama run (minimum WorkBuddy) + bisa dijalankan seketika dengan tombol Tindak lanjut di dashboard; dihapus saat penutupan." : "Jadwal Pengawas bukan berulang.");
      add(true, "Kebijakan: task yang macet/gagal dijadwalkan ulang otomatis maks. 3x per fase dengan perintah yang sama, satu per satu; setelah itu Anda diminta memutuskan di dashboard.");
    }
    const conn = p.connectorIds || [];
    if (conn.length) add(true, "Akses yang diberikan: " + conn.join(", ") + ".");
    if (c.some(x => !x.ok)) { locked.push("Setujui sesuai preview"); advice = { option: "Revisi", why: "Ada bagian yang tidak sesuai aturan.", next: "Manager membuat ulang item dengan perbaikan, lalu kartunya muncul lagi." }; }
    else advice = { option: "Setujui sesuai preview", why: "Waktu dan isi perintah sesuai aturan.", next: "Task dibuat dan berjalan pada waktu tersebut." };
  }

  else if (r.kind === "release") {
    const man = manifestHashes(); const src = p.sumber_folder || ""; const files = Array.isArray(p.files) ? p.files : Object.keys(p.sha256 || {});
    let okAll = true;
    for (const f of files) {
      const h = hashFile(path.join(src, f)); const inMan = h && man.has(h); const same = h && (!p.sha256 || h === p.sha256[f]);
      const ok = inMan && same; okAll = okAll && ok;
      add(ok, ok ? `${f}: salinan asli dari Data-Operation, tidak diubah.` : !h ? `${f}: berkas tidak ditemukan di folder staf.` : !inMan ? `${f}: BUKAN dokumen asli Data-Operation (mungkin dibuat atau diubah).` : `${f}: isi berbeda dari yang diajukan.`);
    }
    // duplicate release (same owner, files already released or waiting in another release item)
    const prev = outboxAll(run).filter(o => o.id !== r.id && o.kind === "release" && ["PENDING_APPROVAL", "APPROVED"].includes(o.status) && (o.payload || {}).owner === p.owner);
    const seen = new Set(); prev.forEach(o => (Array.isArray(o.payload.files) ? o.payload.files : Object.keys(o.payload.sha256 || {})).forEach(f => seen.add(path.basename(String(f)))));
    (readJson(path.join(PROJECT, "runs", run, "evidence-index.json")) || []).filter(e => e.owner === p.owner).forEach(e => seen.add(e.file)); // really released = in the evidence index
    const dups = files.filter(f => seen.has(path.basename(String(f))));
    add(!dups.length, !dups.length ? "Bukan rilis ganda: berkas ini belum pernah dirilis untuk " + p.owner + "." : "RILIS GANDA: " + dups.join(", ") + " sudah dirilis/menunggu di " + prev.map(o => o.id).join(", ") + ".");
    if (dups.length) { locked.push("Setujui sesuai preview"); advice = { option: "Tolak", why: "Berkas yang sama sudah dirilis sebelumnya.", next: "Tidak perlu tindakan lain; bukti yang sudah dirilis tetap dipakai Auditor." }; }
    else if (!okAll) { locked.push("Setujui sesuai preview"); advice = { option: "Tolak", why: "Ada berkas yang bukan salinan asli Data-Operation.", next: "Staf harus mengambil ulang dokumen asli; rilis baru muncul lagi di sini." }; }
    else advice = { option: "Setujui sesuai preview", why: "Semua berkas adalah salinan asli dari Data-Operation.", next: "Sistem langsung memasukkan berkas ke Evidence auditor." };
  }

  else if (r.kind === "gate") {
    // staff/auditor tasks may only start once the Pengawas is active (it re-arms stalled tasks; nobody presses Run now)
    const pst = (global.SIGAP_PENGAWAS && global.SIGAP_PENGAWAS.lastTick ? global.SIGAP_PENGAWAS : null) || readJson(path.join(PROJECT, "runs", run, "pengawas-status.json")) || {};
    const alive = pst.enabled && pst.lastTick && Date.now() - Date.parse(pst.lastTick) < 3 * 60e3;
    add(alive, alive ? "Pengawas aktif di server dashboard (cek tiap 60 detik, menjalankan ulang task yang macet)." : "Pengawas tidak aktif — task staf/auditor yang macet tidak akan ditangani otomatis.");
    add(alive && !pst.lastError || alive && !/WorkBuddy tidak bisa dikendalikan/.test(pst.lastError || ""), !/WorkBuddy tidak bisa dikendalikan/.test(pst.lastError || "") ? "WorkBuddy bisa dijalankan ulang dari dashboard." : "WorkBuddy tidak bisa dikendalikan dari dashboard (buka lewat pintasan SIGAP).");
    // R16-F2 (7 Nov): every staff task in the gate must still be scheduled in the future (a once-task whose time has passed never fires)
    const man = (r.payload && (r.payload.manifest_task_staf || r.payload.manifest || r.payload.tasks)) || [];
    const past = (Array.isArray(man) ? man : []).filter(x => x && x.scheduledAt && Date.parse(x.scheduledAt) < Date.now());
    if ((Array.isArray(man) ? man : []).length) add(!past.length, !past.length ? "Semua jadwal task staf masih di masa depan." : "Jadwal task staf sudah lewat: " + past.map(x => (x.name || x.id) + " " + String(x.scheduledAt).slice(11, 16)).join(", ") + " WIB — task dengan jam lewat tidak akan menyala.");
    if (past.length) { locked.push("Setujui sesuai preview"); advice = { option: "Revisi", why: "Jadwal task staf di item ini sudah lewat.", next: "Manager menghitung ulang jadwal ke masa depan dan mengajukan item GATE baru." }; }
    else if (c.some(x => !x.ok)) { locked.push("Setujui sesuai preview"); advice = { option: "Tunda", why: "Pengawas harus aktif sebelum task staf dibuat.", next: "Jalankan server dashboard dan WorkBuddy lewat pintasan SIGAP; begitu Pengawas aktif, kartu ini bisa disetujui." }; }
    else advice = { option: "Setujui sesuai preview", why: "Pengawas aktif.", next: "Task staf dibuat; Pengawas memantau dan mencoba ulang bila macet." };
  }

  else if (r.kind === "cap") {
    // R16-F5 (7 Nov): the CAP the Manager approves must be the exact file in reports/<RUN>, with a deadline of at most 90 days,
    // and approving it must never close findings or change conformity statuses (that is the Auditor's FASE 8 verification).
    const crypto = require("crypto");
    const arts = Array.isArray(p.artefak) ? p.artefak : [];
    add(arts.length, arts.length ? "Berkas CAP tercantum: " + arts.map(a => a.file).join(", ") + "." : "Tidak ada berkas CAP yang tercantum.");
    for (const a of arts) {
      const f = path.join(PROJECT, "reports", run, path.basename(String(a.file || "")));
      let ok = false; try { ok = crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex") === String(a.sha256 || "").toLowerCase(); } catch (e) {}
      add(ok, ok ? a.file + ": berkas ada dan isinya sama persis dengan yang diajukan." : a.file + ": berkas tidak ada di laporan resmi atau isinya berbeda dari yang diajukan.");
    }
    const created = Date.parse(r.created || "") || Date.now(), due = Date.parse(String(p.tenggat_penutupan || ""));
    const days = due ? Math.round((due - created) / 864e5) : null;
    add(days != null && days <= 90, days == null ? "Tenggat penutupan CAP tidak tercantum." : days <= 90 ? "Tenggat penutupan " + p.tenggat_penutupan + " (" + days + " hari, maksimal 90)." : "Tenggat penutupan " + p.tenggat_penutupan + " melewati 90 hari (" + days + " hari).");
    const closes = /tutup(kan)? temuan|temuan ditutup|ubah status|status (menjadi|jadi) conform/i.test(String(p.aksi || "") + " " + String(p.yang_disetujui || ""));
    add(!closes, !closes ? "Persetujuan CAP tidak menutup temuan dan tidak mengubah status conformity." : "Item ini mencoba menutup temuan atau mengubah status — itu hak Auditor setelah verifikasi.");
    if (c.some(x => !x.ok)) { locked.push("Setujui sesuai preview"); advice = { option: "Revisi", why: "CAP belum memenuhi aturan.", next: "Manager memperbaiki CAP (berkas, tenggat ≤ 90 hari, tanpa menutup temuan) lalu mengajukan item baru." }; }
    else advice = { option: "Setujui sesuai preview", why: "CAP lengkap dan sesuai aturan.", next: "CAP menjadi rencana resmi Manager; temuan tetap terbuka sampai Auditor memverifikasi." };
  }
  else if (r.kind === "eskalasi") {
    add(false, (p.task || "Task") + ": " + (p.alasan || "tidak berhasil setelah dicoba ulang otomatis"));
    advice = { option: "Coba lagi", why: "Pengawas sudah mencoba ulang otomatis sesuai kebijakan; platform/model mungkin sedang penuh.", next: "\"Coba lagi\" memberi 3 percobaan otomatis baru. \"Lanjut tanpa…\" mencatat pekerjaan task ini sebagai keterbatasan audit dan run berlanjut." };
  }

  else if (r.kind === "klarifikasi") {
    advice = { option: null, why: "Jawab sesuai keadaan sebenarnya.", next: "Cek dulu apakah dokumennya ada di Data-Operation; jawaban Anda diteruskan ke Auditor." };
  }
  return { checks: c, advice, locked };
}
// R16-F1 (7 Nov): the "what to do next" line must follow the option the person CHOSE. When the person rejects or asks
// for a revision of an item whose checks all passed, the advice of the approve path ("Task staf dibuat") must never reach
// the agent — it would execute a rejected item.
const NEXT_AFTER = {
  "Tolak": "Pemilik MENOLAK item ini. Jangan jalankan isinya: tidak ada task, email, undangan, rilis atau penerbitan dari item ini. Tampilkan kartu tindak lanjut setelah penolakan dan tunggu jawabannya.",
  "Revisi": "Pemilik meminta revisi. Jangan jalankan isinya; tanyakan perubahan yang diminta lewat kartu, lalu ajukan item baru.",
  "Tunda": "Item ditunda. Jangan jalankan isinya sampai pemilik memutuskan lagi."
};
function nextAfter(option, ck) {
  if (ck && ck.advice && ck.advice.next && ck.advice.option === option) return ck.advice.next;
  if (NEXT_AFTER[option]) return NEXT_AFTER[option];
  return ck && ck.advice && ck.advice.next && !/^(Setujui|Terima)/.test(ck.advice.option || "") ? ck.advice.next : "Jalankan hanya sesuai keputusan di atas.";
}
module.exports = { checkItem, nextAfter };
