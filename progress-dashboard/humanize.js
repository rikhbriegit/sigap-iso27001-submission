// SIGAP — turns technical audit text (JSON, file names, status codes, tool names, hashes) into plain Bahasa for non-technical users.
(function () {
  var STATUS = {
    PENDING_APPROVAL: "menunggu keputusan", APPROVED: "disetujui", EXECUTED: "sudah dijalankan", ANSWERED: "sudah dijawab",
    REVISION: "diminta revisi", REJECTED: "ditolak", DONE: "selesai", TAMPERED: "DIUBAH TANPA IZIN"
  };
  var FILES = [
    [/status-penerbitan\.json/g, "catatan status penerbitan laporan"],
    [/progress(-snapshot-[\w-]+)?\.json/g, "papan progres"],
    [/entries(-[\w-]+)?\.json/g, "log audit"],
    [/evidence-index\.json/g, "daftar bukti"],
    [/klarifikasi-bukti\.json/g, "daftar klarifikasi bukti"],
    [/requests\.json/g, "daftar permintaan bukti"],
    [/proposal\.json/g, "usulan auditor"],
    [/gate1-decision\.json/g, "keputusan GATE 1"],
    [/manifest-gate1-ulang\.json/g, "daftar berkas GATE 1 ulang"],
    [/data-operation-manifest\.json/g, "daftar berkas Data-Operation"],
    [/controls\.json/g, "daftar kontrol ISO 27001"],
    [/selection-([\w-]+)\.json/g, "pilihan bukti staf $1"],
    [/release-([\w-]+)\.json/g, "rilis bukti staf $1"],
    [/revisi\.json/g, "catatan revisi"],
    [/penilaian-auditor\.md/g, "lembar penilaian auditor"],
    [/notes\/([\w-]+)\.md/g, "catatan kerja ($1)"],
    [/outbox-payload-[\w-]+\.json/g, "draf isi"],
    [/SKILL\.md/g, "prosedur SIGAP"],
    [/test-expected-results\.json/g, "kunci jawaban uji"]
  ];
  var TOOLS = [
    [/(?:node\s+)?(?:tools\/)?outbox\.js(?:\s+(verify|create|decide|done|preview))?/g, function (m, c) { return { verify: "pemeriksaan otomatis sebelum kirim", create: "pembuatan item keputusan", decide: "pencatatan keputusan", done: "penandaan selesai", preview: "pratinjau" }[c] || "sistem keputusan"; }],
    [/(?:node\s+)?(?:tools\/)?evidence\.js(?:\s+\w+)?/g, "sistem bukti"],
    [/(?:node\s+)?(?:tools\/)?state\.js(?:\s+\w+)?/g, "pemeriksa tahapan"],
    [/(?:node\s+)?(?:tools\/)?audit\.js(?:\s+\w+)?/g, "pencatat log audit"],
    [/(?:node\s+)?(?:tools\/)?schedule\.js(?:\s+\w+)?/g, "penjadwal"]
  ];
  var KEYS = { sha256: "Kode verifikasi berkas", sha256_final: "Kode verifikasi berkas", bytes: "Ukuran", artefak: "Berkas", file: "Nama berkas",
    versi: "Versi", versi_final: "Versi final", ringkasan_conformity: "Ringkasan status", item_fokus: "Item yang diaudit", jenis: "Jenis",
    dari: "Dari", penerima: "Penerima", catatan: "Catatan", to: "Kepada", cc: "Tembusan (CC)", from: "Dari", subject: "Subjek", body: "Isi email",
    tambahan_dari: "Tambahan dari", run: "Run" };

  function obj(s) { // one-line summary of a JSON tool result
    try { var o = JSON.parse(s); } catch (e) { return null; }
    if (!o || typeof o !== "object") return null;
    var parts = [];
    if (o.id) parts.push(o.id);
    if (o.status) parts.push(STATUS[o.status] || String(o.status).toLowerCase());
    if (o.ok === true) parts.push("berhasil"); if (o.ok === false) parts.push("gagal");
    Object.keys(o).forEach(function (k) { if (["id", "status", "ok", "sha256"].indexOf(k) < 0 && typeof o[k] !== "object") parts.push(label(k) + ": " + o[k]); });
    return parts.join(" — ") || "selesai";
  }
  function label(k) { if (KEYS[k]) return KEYS[k]; k = String(k).replace(/_/g, " "); return k.charAt(0).toUpperCase() + k.slice(1); }
  function text(s) {
    s = String(s == null ? "" : s).trim();
    var j = obj(s); if (j) return j;
    s = s.replace(/\{[^{}]*"id"\s*:[^{}]*\}/g, function (m) { return obj(m) || m; });       // inline JSON results
    s = s.replace(/runs\/ISO270001-\d+\/outbox(\/[\w-]+\.json)?/g, "daftar keputusan");
    s = s.replace(/(?:runs|reports)\/ISO270001-\d+\//g, "");
    TOOLS.forEach(function (t) { s = s.replace(t[0], t[1]); });
    FILES.forEach(function (f) { s = s.replace(f[0], f[1]); });
    s = s.replace(/\b(?:[\w-]+\/)*([\w-]+)\.json\b/g, function (m, n) { return "data " + n.replace(/[-_]/g, " "); });
    s = s.replace(/\b[0-9a-f]{40,64}\b/g, function (h) { return h.slice(0, 8); });
    s = s.replace(/\bsha(?:256)?\b/gi, "kode verifikasi");
    s = s.replace(/\b(PENDING_APPROVAL|APPROVED|EXECUTED|ANSWERED|REVISION|REJECTED|TAMPERED)\b/g, function (m) { return STATUS[m]; });
    s = s.replace(/\bber-hash\b/gi, "ber-kode verifikasi").replace(/\bhash\b/gi, "kode verifikasi").replace(/\bpayload\b/gi, "isi").replace(/\brecord\b/gi, "item")
         .replace(/\bemail verify\b/gi, "pemeriksaan email").replace(/\bverify\b/gi, "pemeriksaan").replace(/\bserver\+outbox\b/gi, "sistem").replace(/\boutbox\b/gi, "daftar keputusan")
         .replace(/\b(?:pptx)\b/g, "presentasi PowerPoint").replace(/\bartefak\b/gi, "berkas");
    s = s.replace(/\b([a-z]+(?:_[a-z]+)+)\b/g, function (m) { return m.replace(/_/g, " "); });   // snake_case words (IDs are uppercase and stay)
    s = s.replace(/`/g, "");
    return s;
  }
  function value(v) { return typeof v === "string" ? text(v.replace(/_/g, /\s/.test(v) ? "_" : " ")) : v; }
  window.H = { text: text, label: label, status: function (x) { return STATUS[x] || x; }, value: value };
})();
