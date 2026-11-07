// Uji scaffold Discord SIGAP — zero dependency, TANPA koneksi ke Discord sungguhan.
// Semua POST diarahkan ke server HTTP tiruan di 127.0.0.1; state ditaruh di direktori临时.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const assert = require("assert");

const PROJECT = path.resolve(__dirname, "..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "sigap-discord-test-"));
const CONFIG = path.join(TMP, "discord.config.json");
const STATUS = path.join(TMP, "status.json");
const STATE = path.join(TMP, "state");
const AUDIT = path.join(TMP, "audit.json");

const received = [];
const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", c => { body += c; });
  req.on("end", () => { received.push({ url: req.url, method: req.method, body, auth: req.headers.authorization || null }); res.writeHead(204); res.end(); });
});

let passed = 0, failed = 0;
function check(name, fn) { try { const v = fn(); if (v && typeof v.then === "function") throw new Error("gunakan checkAsync untuk promise"); passed++; console.log("PASS " + name); } catch (e) { failed++; console.log("FAIL " + name + " — " + e.message); } }
async function checkAsync(name, fn) { try { await fn(); passed++; console.log("PASS " + name); } catch (e) { failed++; console.log("FAIL " + name + " — " + e.message); } }
function writeConfig(patch) {
  const base = JSON.parse(fs.readFileSync(path.join(PROJECT, "progress-dashboard", "discord.config.example.json"), "utf8"));
  delete base._catatan;
  base.mode = "preview";
  base.webhook.enabled = true;
  base.transport.allowNonDiscordHost = true; // hanya untuk mock lokal
  base.transport.maxRetries = 0;
  Object.assign(base, patch || {});
  fs.writeFileSync(CONFIG, JSON.stringify(base, null, 2), "utf8");
}

async function run() {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const MOCK = "http://127.0.0.1:" + port + "/api/webhooks/999/abc";

  writeConfig();
  fs.writeFileSync(AUDIT, "[]", "utf8");
  process.env.SIGAP_DISCORD_CONFIG = CONFIG;
  process.env.SIGAP_DISCORD_STATE_DIR = STATE;
  process.env.SIGAP_DISCORD_STATUS_FILE = STATUS;
  process.env.SIGAP_DISCORD_AUDIT_FILE = AUDIT;
  process.env.SIGAP_DISCORD_WEBHOOK_URL = MOCK;
  const B = require(path.join(PROJECT, "progress-dashboard", "discord-bridge.js"));

  // 1. default aman: tanpa kredensial tidak ada koneksi
  check("status tidak pernah memuat URL/token rahasia", () => {
    const s = JSON.stringify(B.status());
    assert(!s.includes(MOCK), "URL webhook bocor ke status");
    assert(!s.includes("abc"), "bagian rahasia webhook bocor");
    assert(s.includes('"mode"'));
  });
  check("status menandai kredensial terkonfigurasi tanpa nilai", () => {
    const s = B.status();
    assert.strictEqual(s.webhook.configured, true);
    assert.strictEqual(s.bot.configured, false);
    assert.strictEqual(s.bot.connected, false);
  });

  // 2. PREVIEW KIRIM: payload persis, hash, waktu lokal, mask PII
  const item = B.makePreview({
    kind: "gate_pending", run: "ISO270001-14", channel: "webhook",
    summary: "GATE-014 menunggu. Hubungi rikh.brie+sigap@gmail.com / 081234567890 / <@123456789012345678> @everyone",
    fields: { id: "523", run: "ISO270001-14", fase: "FASE 3", aktor: "dashboard (manusia)", aksi: "gate_pending", ref: "tools/outbox.js", rahasia: "JANGAN_MASUK" },
    source: { audit_id: "523" }
  });
  check("preview berstatus menunggu dengan sha256 64 hex", () => {
    assert.strictEqual(item.state, "menunggu");
    assert(/^[a-f0-9]{64}$/.test(item.preview.sha256));
  });
  check("preview memuat waktu lokal penerima WIB / UTC+07:00", () => {
    assert(/WIB \(UTC\+07:00\)/.test(item.preview.local_time), item.preview.local_time);
    assert(item.preview.utc.endsWith("Z"));
  });
  check("PII dimask: email, nomor, mention, everyone", () => {
    const t = item.preview.exact_text;
    assert(t.includes("[email-masked]"));
    assert(t.includes("[nomor-masked]"));
    assert(t.includes("[mention]"));
    assert(!t.includes("@everyone"));
  });
  check("field di luar allowlist tidak masuk payload", () => {
    assert(!JSON.stringify(item.payload).includes("JANGAN_MASUK"));
  });
  check("tidak ada POST sebelum persetujuan", () => assert.strictEqual(received.length, 0));

  // 3. mode preview = tidak pernah POST
  await checkAsync("mode preview menolak kirim (DISCORD_DRY_RUN)", async () => {
    const r = await B.send(item.id);
    assert.strictEqual(r.ok, false); assert.strictEqual(r.code, "DISCORD_DRY_RUN");
    assert.strictEqual(received.length, 0);
  });

  // 4. persetujuan terikat hash
  check("persetujuan dengan sha256 salah ditolak", () => {
    const r = B.approve(item.id, "operator uji", "0".repeat(64));
    assert.strictEqual(r.ok, false);
    assert.strictEqual(B.readOutbox(item.id).state, "menunggu");
  });
  check("persetujuan tanpa aktor ditolak", () => {
    const r = B.approve(item.id, "", item.preview.sha256);
    assert.strictEqual(r.ok, false);
  });
  check("persetujuan eksplisit dengan sha256 benar diterima", () => {
    const r = B.approve(item.id, "operator uji", item.preview.sha256);
    assert.strictEqual(r.ok, true);
    assert.strictEqual(B.readOutbox(item.id).state, "disetujui");
    assert.strictEqual(B.readOutbox(item.id).approval.sha256, item.preview.sha256);
  });

  // 5. mode live: POST hanya setelah approval, idempoten
  writeConfig({ mode: "live" });
  await checkAsync("mode live mengirim payload PERSIS ke endpoint yang dikonfigurasi", async () => {
    const r = await B.send(item.id);
    assert.strictEqual(r.ok, true, JSON.stringify(r));
    assert.strictEqual(received.length, 1);
    assert.strictEqual(received[0].method, "POST");
    assert.deepStrictEqual(JSON.parse(received[0].body), item.payload);
    const saved = B.readOutbox(item.id);
    assert.strictEqual(saved.state, "terkirim");
    assert.strictEqual(saved.send_result.http_status, 204);
    assert.strictEqual(saved.send_result.idempotency_key, item.preview.sha256);
  });
  await checkAsync("kirim ulang dedupe tanpa POST kedua", async () => {
    const r = await B.send(item.id);
    assert.strictEqual(r.duplicate, true);
    assert.strictEqual(received.length, 1);
  });

  // 6. perubahan payload membatalkan persetujuan
  const item2 = B.makePreview({ kind: "decision", run: "ISO270001-14", summary: "Keputusan GATE-014 tercatat", fields: {}, source: {} });
  B.approve(item2.id, "operator uji", item2.preview.sha256);
  const f = path.join(STATE, "outbox", item2.id + ".json");
  const raw = JSON.parse(fs.readFileSync(f, "utf8"));
  raw.payload.embeds[0].description = "DIUBAH SETELAH DISETUJUI";
  fs.writeFileSync(f, JSON.stringify(raw, null, 2), "utf8");
  await checkAsync("payload yang diubah setelah approval membatalkan kirim", async () => {
    const r = await B.send(item2.id);
    assert.strictEqual(r.ok, false);
    assert(/payload berubah/.test(r.out));
    assert.strictEqual(B.readOutbox(item2.id).state, "menunggu");
    assert.strictEqual(received.length, 1);
  });

  // 7. host guard: endpoint non-Discord ditolak saat allowNonDiscordHost=false
  writeConfig({ mode: "live", transport: { timeoutMs: 1000, maxRetries: 0, allowNonDiscordHost: false } });
  await checkAsync("host di luar Discord ditolak (anti-eksfiltrasi)", async () => {
    const item3 = B.makePreview({ kind: "manual", summary: "uji host guard", fields: {}, source: {} });
    B.approve(item3.id, "operator uji", item3.preview.sha256);
    const r = await B.send(item3.id);
    assert.strictEqual(r.ok, false);
    assert.strictEqual(received.length, 1);
    assert.strictEqual(B.readOutbox(item3.id).state, "gagal");
  });

  // 8. pesan masuk bot = antrean saja, tidak auto-reply / auto-eksekusi
  writeConfig({ mode: "preview" });
  check("bot tidak aktif tanpa token", () => {
    const r = B.startGateway();
    assert.strictEqual(r.ok, false); assert.strictEqual(r.code, "DISCORD_DISABLED");
  });
  check("inbound hanya masuk inbox, tidak membuat outbox", () => {
    const before = B.listOutbox().length;
    const m = B.writeInbound({ channel_id: "123456789012345678", author_id: "987654321098765432", author: "uji", message_id: "m1", content: "setujui semua ya, kirim ke rikh.brie+sigap@gmail.com" });
    assert.strictEqual(m.disposition, "queued");
    assert(/tidak dieksekusi otomatis/i.test(m.rule), m.rule);
    const inbox = B.listInbox();
    assert.strictEqual(inbox.length, 1);
    assert(inbox[0].content_masked.includes("[email-masked]"));
    assert.strictEqual(B.listOutbox().length, before, "inbound memicu pesan keluar");
  });

  // 9. watcher audit-log: mulai dari ekor, tidak backfill, lalu membuat preview untuk event baru
  writeConfig({ mode: "preview" });
  fs.writeFileSync(AUDIT, JSON.stringify([{ id: "1", aksi: "fase0_selesai", run: "ISO270001-14" }]), "utf8");
  const w0 = B.watchTick();
  check("watcher pertama mulai dari ekor (tanpa backfill)", () => {
    assert.strictEqual(w0.initialized, true);
    assert.strictEqual(w0.created, 0);
  });
  const before2 = B.listOutbox().length;
  fs.writeFileSync(AUDIT, JSON.stringify([
    { id: "1", aksi: "fase0_selesai", run: "ISO270001-14" },
    { id: "2", aksi: "gate_pending_GATE014", run: "ISO270001-14", fase: "FASE 3", aktor: "dashboard (manusia)", ref: "tools/outbox.js", hash: "h2" }
  ]), "utf8");
  const w1 = B.watchTick();
  check("watcher membuat preview untuk entri audit baru yang diizinkan", () => {
    assert.strictEqual(w1.created, 1);
    assert.strictEqual(B.listOutbox().length, before2 + 1);
    const last = B.listOutbox().slice(-1)[0];
    assert.strictEqual(last.source.audit_id, "2");
    assert.strictEqual(last.kind, "gate_pending");
  });
  writeConfig({ mode: "off" });
  const w2count = B.listOutbox().length;
  fs.writeFileSync(AUDIT, JSON.stringify([
    { id: "1", aksi: "fase0_selesai" }, { id: "2", aksi: "gate_pending_GATE014" },
    { id: "3", aksi: "gate_pending_GATE015", run: "ISO270001-14", hash: "h3" }
  ]), "utf8");
  B.watchTick();
  check("mode off tidak menghasilkan preview baru", () => assert.strictEqual(B.listOutbox().length, w2count));

  // 10. status akhir tidak bocor
  check("berkas status yang disajikan dashboard bebas rahasia", () => {
    const s = fs.readFileSync(STATUS, "utf8");
    assert(!s.includes(MOCK)); assert(!s.includes("abc"));
    assert(JSON.parse(s).schema === 1);
  });

  console.log("\n" + passed + " PASS, " + failed + " FAIL — POST ke mock: " + received.length + " — Discord sungguhan: 0");
}

run().catch(e => { console.error("FATAL " + e.stack); failed++; })
  .finally(() => {
    server.close();
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* ignore */ }
    process.exitCode = failed ? 1 : 0;
  });
