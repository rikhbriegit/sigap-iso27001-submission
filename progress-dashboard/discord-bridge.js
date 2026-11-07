// SIGAP <-> Discord bridge — sidecar, zero dependency, stdlib only.
//
// Didesain supaya TIDAK mengubah server.js (aturan 0: dashboard tidak boleh mati / restart
// saat run audit berjalan). Proses ini bisa hidup/mati sendiri tanpa menyentuh port 4173.
//
// Prinsip yang tidak boleh dilonggarkan:
//  1. Default mode "off" = nol koneksi keluar. Tanpa kredensial tidak ada webhook/gateway dibuka.
//  2. Setiap pesan keluar lewat PREVIEW KIRIM: payload persis + sha256 + waktu lokal penerima.
//  3. Persetujuan harus eksplisit, menyebut sha256 yang sama, dan berusia < maxAgeMinutes.
//     Tidak ada default, tidak ada "Setuju" otomatis, tidak ada approval dari teks bebas.
//  4. Pesan masuk (bot) HANYA masuk inbox. Tidak pernah mengeksekusi aksi audit, tidak pernah
//     dianggap persetujuan, tidak pernah memicu kirim.
//  5. Rahasia tidak pernah ditulis ke log, status, preview, atau respons MCP.
//  6. Semua kiriman bersifat idempoten berdasarkan sha256 payload (dedupe).
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");
const https = require("https");

const ROOT = __dirname;
const PROJECT = path.resolve(ROOT, "..");
const CONFIG_FILE = process.env.SIGAP_DISCORD_CONFIG || path.join(ROOT, "discord.config.json");
const EXAMPLE_FILE = path.join(ROOT, "discord.config.example.json");
const STATE_DIR = process.env.SIGAP_DISCORD_STATE_DIR || path.join(PROJECT, "logs", "discord");
const OUTBOX_DIR = path.join(STATE_DIR, "outbox");
const INBOX_DIR = path.join(STATE_DIR, "inbox");
const CURSOR_FILE = path.join(STATE_DIR, "cursor.json");
const STATUS_FILE = process.env.SIGAP_DISCORD_STATUS_FILE || path.join(ROOT, "discord-status.json");
const LOG_FILE = path.join(PROJECT, "logs", "discord-bridge.log");
const AUDIT_FILE = process.env.SIGAP_DISCORD_AUDIT_FILE || path.join(PROJECT, "audit-log", "entries.json");

const DISCORD_HOSTS = new Set(["discord.com", "discordapp.com", "canary.discord.com", "ptb.discord.com"]);
const KIND_LABEL = {
  gate_pending: "Keputusan menunggu",
  decision: "Keputusan tercatat",
  phase_change: "Perubahan fase",
  dashboard_down: "Dashboard down",
  dashboard_up: "Dashboard pulih",
  nc_major: "Major NC",
  manual: "Notifikasi manual"
};

function ensureDirs() { [STATE_DIR, OUTBOX_DIR, INBOX_DIR, path.dirname(LOG_FILE)].forEach(d => fs.mkdirSync(d, { recursive: true })); }
function readJSON(file, fallback) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return fallback; } }
function atomicJSON(file, value) { ensureDirs(); const tmp = file + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n", "utf8"); fs.renameSync(tmp, file); }
function log(line) { try { ensureDirs(); fs.appendFileSync(LOG_FILE, new Date().toISOString() + " " + line + "\n", "utf8"); } catch (e) { /* logging must never break the bridge */ } }

function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") { const o = {}; Object.keys(v).sort().forEach(k => { o[k] = canon(v[k]); }); return o; }
  return v;
}
function digest(o) { return crypto.createHash("sha256").update(JSON.stringify(canon(o))).digest("hex"); }

function localStamp(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const tz = "Asia/Jakarta";
  const parts = new Intl.DateTimeFormat("id-ID", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(dt);
  const offParts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" }).formatToParts(dt);
  const off = ((offParts.find(p => p.type === "timeZoneName") || {}).value || "GMT+07:00").replace("GMT", "UTC");
  return parts.replace(/[\u202f\u00a0]/g, " ") + " WIB (" + off + ")";
}

function maskPII(text, cfg) {
  let s = String(text == null ? "" : text);
  if (cfg && cfg.privacy && cfg.privacy.maskPII === false) return s;
  s = s.replace(/https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/[^\s)]+/gi, "[webhook-masked]");
  s = s.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email-masked]");
  s = s.replace(/<@[!&]?\d{5,}>/g, "[mention]");
  s = s.replace(/\+\d[\d\s().-]{7,16}\d|\b\d{9,15}\b/g, "[nomor-masked]");
  s = s.replace(/\b[a-f0-9]{32,}\b/gi, "[token-masked]");
  s = s.replace(/@(everyone|here)\b/gi, "@\u200b$1");
  const max = (cfg && cfg.privacy && cfg.privacy.maxContentChars) || 1200;
  return s.length > max ? s.slice(0, max) + " …[dipotong]" : s;
}
function maskUrl(u) { try { const x = new URL(u); return x.origin + x.pathname.split("/").slice(0, 2).join("/") + "/***/***"; } catch (e) { return "[url-invalid]"; } }

function loadConfig() {
  const base = readJSON(EXAMPLE_FILE, {});
  const own = readJSON(CONFIG_FILE, {});
  const cfg = Object.assign({}, base, own);
  ["webhook", "bot", "privacy", "approval", "transport"].forEach(k => { cfg[k] = Object.assign({}, base[k] || {}, own[k] || {}); });
  if (process.env.SIGAP_DISCORD_MODE) cfg.mode = process.env.SIGAP_DISCORD_MODE;
  if (process.env.SIGAP_DISCORD_WEBHOOK_URL) { cfg.webhook.url = process.env.SIGAP_DISCORD_WEBHOOK_URL; cfg.webhook.enabled = true; }
  if (process.env.SIGAP_DISCORD_BOT_TOKEN) { cfg.bot.token = process.env.SIGAP_DISCORD_BOT_TOKEN; cfg.bot.enabled = true; }
  if (process.env.SIGAP_DISCORD_MOCK === "1") { cfg.transport.allowNonDiscordHost = true; }
  if (!["off", "preview", "live"].includes(cfg.mode)) cfg.mode = "off";
  cfg._exampleOnly = !fs.existsSync(CONFIG_FILE) && !process.env.SIGAP_DISCORD_WEBHOOK_URL && !process.env.SIGAP_DISCORD_BOT_TOKEN;
  return cfg;
}

function status(extra) {
  const cfg = loadConfig();
  const out = listOutbox();
  const counts = { menunggu: 0, disetujui: 0, terkirim: 0, ditolak: 0, gagal: 0, total: out.length };
  out.forEach(x => { if (counts[x.state] != null) counts[x.state]++; });
  let inbox = [];
  try { inbox = fs.readdirSync(INBOX_DIR).filter(f => f.endsWith(".json")).sort(); } catch (e) { /* no inbox yet */ }
  const lastInbox = inbox.length ? readJSON(path.join(INBOX_DIR, inbox[inbox.length - 1]), {}) : null;
  const s = {
    schema: 1,
    mode: cfg.mode,
    updated_at: new Date().toISOString(),
    updated_local: localStamp(new Date()),
    note: cfg.mode === "off" ? "Nonaktif — tidak ada koneksi keluar. Isi discord.config.json lalu set mode." :
      cfg.mode === "preview" ? "Mode preview — PREVIEW KIRIM dibuat, tidak ada POST ke Discord." : "Mode live — POST hanya untuk item yang disetujui dengan hash persis.",
    webhook: { configured: !!cfg.webhook.url, enabled: !!cfg.webhook.enabled, url_masked: cfg.webhook.url ? maskUrl(cfg.webhook.url) : null, channel: cfg.webhook.channelLabel, events: (cfg.webhook.events || []).length },
    bot: { configured: !!cfg.bot.token, enabled: !!cfg.bot.enabled, connected: !!GATEWAY.connected, gateway_url_configured: !!process.env.SIGAP_DISCORD_GATEWAY_URL, fatal: GATEWAY.fatal || null },
    outbox: counts,
    inbox: { total: inbox.length, last_at: (extra && extra.inbox_at) || (lastInbox && lastInbox.created_at) || null }
  };
  return Object.assign(s, extra || {});
}
function writeStatus(extra) { const s = status(extra); atomicJSON(STATUS_FILE, s); return s; }

// ---------------------------------------------------------------- outbox / PREVIEW KIRIM
function exactText(payload) {
  const lines = [String(payload.content || "").trim()];
  (payload.embeds || []).forEach(e => {
    if (e.title) lines.push("# " + e.title);
    if (e.description) lines.push(String(e.description));
    (e.fields || []).forEach(f => lines.push(f.name + ": " + f.value));
    if (e.footer && e.footer.text) lines.push("— " + e.footer.text);
  });
  return lines.filter(Boolean).join("\n");
}
function makePreview(event) {
  const cfg = loadConfig();
  ensureDirs();
  const now = new Date();
  const kind = KIND_LABEL[event.kind] ? event.kind : "manual";
  const channel = event.channel === "bot" ? "bot" : "webhook";
  const allowed = ["id", "run", "fase", "aktor", "aksi", "ref"];
  const fields = [];
  Object.keys(event.fields || {}).filter(k => allowed.includes(k)).forEach(k => {
    const v = maskPII(event.fields[k], cfg);
    if (v) fields.push({ name: k, value: String(v).slice(0, 200), inline: true });
  });
  const payload = {
    content: "",
    embeds: [{
      title: "SIGAP · " + (KIND_LABEL[kind] || "Notifikasi"),
      description: maskPII(event.summary || "(tanpa ringkasan)", cfg),
      color: kind === "dashboard_down" || kind === "nc_major" ? 0xa32d2d : 0x0f6e56,
      fields,
      footer: { text: "SIGAP · " + (event.run || "tanpa run") + " · " + localStamp(now) },
      timestamp: now.toISOString()
    }],
    allowed_mentions: { parse: [] }
  };
  if (channel === "webhook") payload.username = cfg.webhook.username || "SIGAP";
  const recipient = channel === "webhook"
    ? { type: "webhook", channel: cfg.webhook.channelLabel || "sigap-audit", url_masked: cfg.webhook.url ? maskUrl(cfg.webhook.url) : "[belum diisi]" }
    : { type: "bot", channel_id: String(event.channelId || "") };
  const binding = { kind, run: event.run || null, channel, recipient, payload };
  const sha = digest(binding);
  const id = "DSC-" + now.toISOString().replace(/[-:T]/g, "").slice(0, 14) + "-" + sha.slice(0, 8);
  const item = {
    schema: 1, id, kind, direction: "out", channel, run: event.run || null,
    state: "menunggu", created_at: now.toISOString(),
    recipient, payload,
    preview: {
      label: "PREVIEW KIRIM",
      exact_text: exactText(payload),
      local_time: localStamp(now),
      utc: now.toISOString(),
      sha256: sha,
      attachments: [],
      attachment_count: 0,
      versions: { schema: 1, discord_api: "v10", bridge: "1.0" },
      note: "Setujui HANYA bila teks persis di atas sudah dibaca. Persetujuan terikat sha256 ini; perubahan isi membatalkannya."
    },
    source: { audit_id: event.source && event.source.audit_id || null, ref: event.source && event.source.ref || null },
    approval: null,
    send_result: null,
    last_send_error: null
  };
  atomicJSON(path.join(OUTBOX_DIR, id + ".json"), item);
  log("PREVIEW " + id + " kind=" + kind + " sha=" + sha.slice(0, 12));
  return item;
}
function outboxFile(id) { if (!/^DSC-[0-9]{14}-[a-f0-9]{8}$/.test(String(id))) throw new Error("id outbox tidak valid"); return path.join(OUTBOX_DIR, id + ".json"); }
function readOutbox(id) { return readJSON(outboxFile(id), null); }
function listOutbox() {
  ensureDirs();
  return fs.readdirSync(OUTBOX_DIR).filter(f => /^DSC-.*\.json$/.test(f)).sort()
    .map(f => readJSON(path.join(OUTBOX_DIR, f), null)).filter(Boolean);
}
function ageMinutes(iso) { return (Date.now() - new Date(iso).getTime()) / 60000; }

function approve(id, by, sha) {
  const cfg = loadConfig();
  const it = readOutbox(id);
  if (!it) return { ok: false, out: "item tidak ditemukan: " + id };
  if (it.state !== "menunggu") return { ok: false, out: "bukan berstatus menunggu: " + it.state };
  if (!by || String(by).trim().length < 2) return { ok: false, out: "aktor persetujuan wajib diisi" };
  if (cfg.approval.requireExactHash !== false && sha !== it.preview.sha256) return { ok: false, out: "sha256 tidak cocok — persetujuan ditolak (payload mungkin berubah)" };
  if (ageMinutes(it.created_at) > (cfg.approval.maxAgeMinutes || 15)) return { ok: false, out: "preview kadaluarsa; buat PREVIEW KIRIM baru" };
  const now = new Date();
  it.approval = { by: String(by).trim(), sha256: it.preview.sha256, at: now.toISOString(), local_time: localStamp(now), source: "dashboard/CLI eksplisit" };
  it.state = "disetujui";
  atomicJSON(outboxFile(id), it);
  log("APPROVE " + id + " by=" + it.approval.by + " sha=" + it.preview.sha256.slice(0, 12));
  return { ok: true, out: "disetujui; jalankan send untuk mengirim", item: it };
}
function reject(id, by, reason) {
  const it = readOutbox(id);
  if (!it || it.state !== "menunggu") return { ok: false, out: "item tidak bisa ditolak" };
  it.state = "ditolak"; it.approval = { by: String(by || "operator"), at: new Date().toISOString(), reason: String(reason || "") };
  atomicJSON(outboxFile(id), it);
  log("REJECT " + id);
  return { ok: true, out: "ditolak" };
}

// ---------------------------------------------------------------- transport
function guardHost(url) {
  const cfg = loadConfig();
  const u = new URL(url);
  if (DISCORD_HOSTS.has(u.hostname) || u.hostname.endsWith(".discord.com") || u.hostname.endsWith(".discordapp.com")) return;
  if (cfg.transport.allowNonDiscordHost === true) return; // hanya untuk mock lokal
  const e = new Error("host bukan Discord: " + u.hostname + " — aktifkan transport.allowNonDiscordHost hanya untuk uji lokal");
  e.permanent = true; throw e;
}
function request(method, url, headers, body, redirectsLeft) {
  return new Promise((resolve, reject) => {
    const cfg = loadConfig();
    let u; try { u = new URL(url); guardHost(url); } catch (e) { reject(e); return; }
    const mod = u.protocol === "http:" ? http : https;
    const payload = body == null ? null : Buffer.from(JSON.stringify(body), "utf8");
    const req = mod.request(u, { method, headers: Object.assign({ "User-Agent": "SIGAP-Discord-Bridge/1.0", "Content-Type": "application/json", "Content-Length": payload ? payload.length : 0 }, headers || {}) }, res => {
      const chunks = []; res.on("data", c => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && (redirectsLeft || 0) < 2) {
          try { request(method, new URL(res.headers.location, url).toString(), headers, body, (redirectsLeft || 0) + 1).then(resolve, reject); return; } catch (e) { /* fall through */ }
        }
        resolve({ status: res.statusCode, headers: res.headers, body: text });
      });
    });
    req.setTimeout(cfg.transport.timeoutMs || 8000, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}
async function postWithRetry(url, headers, body) {
  const cfg = loadConfig();
  let last;
  for (let i = 0; i <= (cfg.transport.maxRetries || 0); i++) {
    try {
      const r = await request("POST", url, headers, body);
      if (r.status >= 200 && r.status < 300) return r;
      last = new Error("HTTP " + r.status + " " + String(r.body).slice(0, 200));
      last.status = r.status;
      if (r.status !== 429 && r.status < 500) break; // permanen, jangan diulang
      const wait = r.status === 429 ? Math.min(Number((r.headers["retry-after"] || 1)) * 1000, 5000) : 300 * (i + 1);
      await new Promise(res => setTimeout(res, wait));
    } catch (e) { last = e; if (i === (cfg.transport.maxRetries || 0)) break; }
  }
  throw last || new Error("gagal kirim");
}
async function postWebhook(url, payload) {
  if (!url) throw new Error("webhook URL belum diisi");
  return postWithRetry(url, {}, payload);
}
async function postBotMessage(channelId, payload) {
  const cfg = loadConfig();
  if (!cfg.bot.token) throw new Error("bot token belum diisi");
  if (!/^\d{5,}$/.test(String(channelId))) throw new Error("channel_id tidak valid");
  const base = (process.env.SIGAP_DISCORD_API_BASE || "https://discord.com/api/v10").replace(/\/$/, "");
  return postWithRetry(base + "/channels/" + channelId + "/messages", { Authorization: "Bot " + cfg.bot.token }, payload);
}

async function send(id) {
  const cfg = loadConfig();
  const it = readOutbox(id);
  if (!it) return { ok: false, out: "item tidak ditemukan" };
  if (it.state === "terkirim") return { ok: true, duplicate: true, out: "sudah terkirim sebelumnya; tidak dikirim ulang (idempoten)" };
  if (cfg.mode !== "live") return { ok: false, code: "DISCORD_DRY_RUN", out: "mode " + cfg.mode + " — tidak ada POST ke Discord" };
  if (it.state !== "disetujui" || !it.approval) return { ok: false, out: "belum ada persetujuan eksplisit" };
  if (it.approval.sha256 !== it.preview.sha256) return { ok: false, out: "persetujuan tidak terikat payload ini" };
  if (digest({ kind: it.kind, run: it.run, channel: it.channel, recipient: it.recipient, payload: it.payload }) !== it.preview.sha256) {
    it.state = "menunggu"; it.approval = null; atomicJSON(outboxFile(id), it);
    return { ok: false, out: "payload berubah setelah disetujui — persetujuan dibatalkan" };
  }
  if (ageMinutes(it.approval.at) > (cfg.approval.maxAgeMinutes || 15)) return { ok: false, out: "persetujuan kadaluarsa" };
  if (it.channel === "webhook" && (!cfg.webhook.url || !cfg.webhook.enabled)) return { ok: false, out: "webhook belum aktif" };
  if (it.channel === "bot" && (!cfg.bot.token || !cfg.bot.enabled)) return { ok: false, out: "bot belum aktif" };

  try {
    const r = it.channel === "webhook" ? await postWebhook(cfg.webhook.url, it.payload) : await postBotMessage(it.recipient.channel_id, it.payload);
    let messageId = null; try { messageId = (JSON.parse(r.body || "{}").id) || null; } catch (e) { /* 204 has no body */ }
    it.state = "terkirim"; it.last_send_error = null;
    it.send_result = { at: new Date().toISOString(), local_time: localStamp(new Date()), http_status: r.status, message_id: messageId, response_sha256: digest(String(r.body || "")), idempotency_key: it.preview.sha256 };
    atomicJSON(outboxFile(id), it);
    log("SENT " + id + " http=" + r.status + " sha=" + it.preview.sha256.slice(0, 12));
    writeStatus();
    return { ok: true, out: "terkirim", item: it };
  } catch (e) {
    const permanent = !!e.permanent || (e.status && e.status >= 400 && e.status < 500 && e.status !== 429);
    it.state = permanent ? "gagal" : "disetujui";
    it.last_send_error = { at: new Date().toISOString(), message: maskPII(e.message, cfg).slice(0, 300), http_status: e.status || null, permanent: !!permanent };
    atomicJSON(outboxFile(id), it);
    log("SEND_FAIL " + id + " " + (e.status || "") + " " + String(e.message).slice(0, 120));
    writeStatus();
    return { ok: false, out: "gagal kirim: " + it.last_send_error.message, item: it };
  }
}

// ---------------------------------------------------------------- inbound (bot dua arah)
function writeInbound(msg) {
  const cfg = loadConfig(); ensureDirs();
  const now = new Date();
  const sha = digest({ channel_id: msg.channel_id, author_id: msg.author_id, content: msg.content, message_id: msg.message_id });
  const id = "DIN-" + now.toISOString().replace(/[-:T]/g, "").slice(0, 14) + "-" + sha.slice(0, 8);
  const item = {
    schema: 1, id, direction: "in", created_at: now.toISOString(), local_time: localStamp(now),
    channel_id: String(msg.channel_id || ""), author_id: String(msg.author_id || ""),
    author: String(msg.author || ""), message_id: String(msg.message_id || ""),
    content: String(msg.content || ""), content_masked: maskPII(msg.content, cfg), sha256: sha,
    disposition: "queued",
    rule: "Pesan masuk HANYA antrean. Tidak dieksekusi otomatis, bukan persetujuan, tidak memicu kirim. Keputusan manusia tetap di dashboard #approvals."
  };
  atomicJSON(path.join(INBOX_DIR, id + ".json"), item);
  log("INBOUND " + id + " channel=" + item.channel_id + " sha=" + sha.slice(0, 12));
  writeStatus({ inbox_at: item.created_at });
  return item;
}
function listInbox() {
  ensureDirs();
  return fs.readdirSync(INBOX_DIR).filter(f => /^DIN-.*\.json$/.test(f)).sort()
    .map(f => readJSON(path.join(INBOX_DIR, f), null)).filter(Boolean)
    .map(x => ({ id: x.id, created_at: x.created_at, channel_id: x.channel_id, author: x.author, content_masked: x.content_masked, disposition: x.disposition }));
}

const GATEWAY = { connected: false, ws: null, heartbeat: null, attempts: 0, stopped: false };
function botAllowed(cfg, m) {
  const ch = cfg.bot.allowedChannelIds || [], us = cfg.bot.allowedUserIds || [];
  if (ch.length && !ch.includes(String(m.channel_id))) return false;
  if (us.length && !us.includes(String(m.author && m.author.id))) return false;
  return true;
}
function startGateway() {
  const cfg = loadConfig();
  if (cfg.mode !== "live" || !cfg.bot.enabled || !cfg.bot.token) { log("BOT_SKIP mode=" + cfg.mode + " configured=" + !!cfg.bot.token); return { ok: false, code: "DISCORD_DISABLED", out: "bot tidak aktif (mode/token)" }; }
  if (typeof WebSocket !== "function") return { ok: false, out: "runtime Node tidak menyediakan WebSocket global" };
  const url = process.env.SIGAP_DISCORD_GATEWAY_URL || cfg.bot.gatewayUrl;
  GATEWAY.stopped = false;
  const connect = () => {
    if (GATEWAY.stopped) return;
    const ws = new WebSocket(url); GATEWAY.ws = ws;
    ws.onopen = () => { GATEWAY.attempts = 0; log("GATEWAY_OPEN"); };
    ws.onmessage = ev => {
      let d; try { d = JSON.parse(String(ev.data)); } catch (e) { return; }
      if (d.op === 10) {
        const ms = (d.d && d.d.heartbeat_interval) || 41250;
        clearInterval(GATEWAY.heartbeat);
        GATEWAY.heartbeat = setInterval(() => { if (ws.readyState === 1) ws.send(JSON.stringify({ op: 1, d: GATEWAY.seq })); }, ms);
        ws.send(JSON.stringify({ op: 2, d: { token: cfg.bot.token, intents: cfg.bot.intents || 33281, properties: { os: "windows", browser: "sigap-bridge", device: "sigap-bridge" } } }));
      }
      if (d.s != null) GATEWAY.seq = d.s;
      if (d.op === 0 && d.t === "READY") { GATEWAY.connected = true; writeStatus(); log("GATEWAY_READY"); }
      if (d.op === 0 && d.t === "MESSAGE_CREATE") {
        const m = d.d || {};
        if (m.author && m.author.bot) return;
        const candidate = { channel_id: m.channel_id, author_id: m.author && m.author.id, author: m.author && m.author.username, message_id: m.id, content: m.content };
        if (botAllowed(cfg, m)) writeInbound(candidate);
      }
      if (d.op === 7 || d.op === 9) { try { ws.close(); } catch (e) { /* ignore */ } }
    };
    ws.onclose = ev => {
      GATEWAY.connected = false; clearInterval(GATEWAY.heartbeat); writeStatus();
      const code = ev && ev.code;
      log("GATEWAY_CLOSE code=" + code);
      // 4013 = intent tidak valid, 4014 = privileged intent (MESSAGE_CONTENT) belum diaktifkan
      // di Developer Portal. Mengulang koneksi tidak akan pernah berhasil, jangan loop.
      if (code === 4013 || code === 4014) { GATEWAY.fatal = code === 4014 ? "MESSAGE_CONTENT intent belum aktif di Developer Portal" : "intent tidak valid"; GATEWAY.stopped = true; return; }
      if (GATEWAY.stopped || GATEWAY.attempts >= 5) return;
      const delay = 1000 * Math.pow(2, GATEWAY.attempts++);
      log("GATEWAY_RECONNECT in " + delay + "ms");
      setTimeout(connect, delay);
    };
    ws.onerror = () => { log("GATEWAY_ERROR"); };
  };
  connect();
  return { ok: true, out: "gateway dimulai" };
}
function stopGateway() { GATEWAY.stopped = true; clearInterval(GATEWAY.heartbeat); try { GATEWAY.ws && GATEWAY.ws.close(); } catch (e) { /* ignore */ } GATEWAY.connected = false; }

// ---------------------------------------------------------------- audit-log watcher
const AUDIT_KIND = [
  [/dashboard_down|watchdog.*down/i, "dashboard_down"],
  [/dashboard_up|respawn/i, "dashboard_up"],
  [/major.?nc/i, "nc_major"],
  [/gate|klarifikasi|menunggu/i, "gate_pending"],
  [/keputusan|decide|tindak_lanjut|approve|setujui/i, "decision"],
  [/fase|phase/i, "phase_change"]
];
function auditKind(aksi) { for (const [re, k] of AUDIT_KIND) if (re.test(String(aksi || ""))) return k; return null; }
function watchTick() {
  const cfg = loadConfig();
  ensureDirs();
  let rows = readJSON(AUDIT_FILE, []);
  if (!Array.isArray(rows)) rows = [];
  const cur = readJSON(CURSOR_FILE, null);
  if (!cur) { atomicJSON(CURSOR_FILE, { offset: rows.length, created_at: new Date().toISOString(), note: "mulai dari ekor; tidak ada backfill" }); writeStatus(); return { created: 0, initialized: true }; }
  if (rows.length < cur.offset) { atomicJSON(CURSOR_FILE, { offset: rows.length, created_at: new Date().toISOString(), note: "reset setelah truncate" }); return { created: 0, reset: true }; }
  const fresh = rows.slice(cur.offset);
  if (!fresh.length) { writeStatus(); return { created: 0 }; }
  const allow = cfg.webhook.events || [];
  let created = 0;
  for (const r of fresh) {
    const kind = auditKind(r.aksi);
    if (cfg.mode === "off" || !kind || !allow.includes(kind)) continue;
    if (r.hash && listOutbox().some(x => x.source && x.source.audit_id === r.id)) continue;
    makePreview({ kind, run: r.run || null, channel: "webhook", summary: String(r.aksi || "").replace(/_/g, " "), fields: { id: r.id, run: r.run, fase: r.fase, aktor: r.aktor, aksi: r.aksi, ref: r.ref }, source: { audit_id: r.id, ref: r.ref } });
    created++;
  }
  atomicJSON(CURSOR_FILE, { offset: rows.length, created_at: new Date().toISOString(), note: "ekor audit-log" });
  writeStatus();
  return { created, scanned: fresh.length };
}

// ---------------------------------------------------------------- serve / CLI
function serve() {
  const cfg = loadConfig();
  ensureDirs(); writeStatus();
  log("SERVE mode=" + cfg.mode);
  console.log(JSON.stringify({ code: "DISCORD_BRIDGE_UP", mode: cfg.mode, status_file: STATUS_FILE, state_dir: STATE_DIR }));
  const t = setInterval(() => { try { watchTick(); } catch (e) { log("WATCH_ERROR " + e.message); } }, 2000);
  startGateway();
  const stop = () => { clearInterval(t); stopGateway(); writeStatus(); log("SERVE_STOP"); process.exit(0); };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
  return { interval: t };
}
function args() {
  const a = process.argv.slice(2); const cmd = a[0] || "status"; const o = {};
  for (let i = 1; i < a.length; i++) if (a[i].startsWith("--")) { const k = a[i].slice(2); const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true; o[k] = v; }
  return { cmd, o };
}
function main() {
  const { cmd, o } = args();
  const cfg = loadConfig();
  const runArg = o.run || null;
  let r;
  switch (cmd) {
    case "status": r = writeStatus(); break;
    case "preview": r = makePreview({ kind: o.kind || "manual", run: runArg, channel: o.channel || "webhook", channelId: o.channelId, summary: o.summary || "Notifikasi manual SIGAP", fields: { id: o.id, run: runArg, fase: o.fase, aktor: o.aktor, aksi: o.aksi, ref: o.ref }, source: { ref: o.ref } }); break;
    case "list": r = { outbox: listOutbox().map(x => ({ id: x.id, state: x.state, kind: x.kind, sha: x.preview.sha256 })), inbox: listInbox() }; break;
    case "approve": r = approve(o.id, o.by || cfg.approval.actor, o.sha); break;
    case "reject": r = reject(o.id, o.by || cfg.approval.actor, o.reason); break;
    case "send": r = send(o.id); break;
    case "inbound": r = writeInbound({ channel_id: o.channelId || "0", author_id: o.authorId || "0", author: o.author || "unknown", message_id: o.messageId || "mock", content: o.text || "" }); break;
    case "watch": r = watchTick(); break;
    case "bot": r = startGateway(); break;
    case "serve": serve(); return;
    default: r = { ok: false, out: "perintah tidak dikenal: " + cmd };
  }
  if (r && typeof r.then === "function") r.then(x => { console.log(JSON.stringify(x, null, 2)); writeStatus(); }).catch(e => { console.error("ERROR " + e.message); process.exitCode = 1; });
  else { console.log(JSON.stringify(r, null, 2)); writeStatus(); if (r && r.ok === false) process.exitCode = 1; }
}
if (require.main === module) main();

module.exports = {
  ROOT, PROJECT, STATE_DIR, OUTBOX_DIR, INBOX_DIR, STATUS_FILE, CONFIG_FILE,
  loadConfig, localStamp, maskPII, digest, status, writeStatus,
  makePreview, listOutbox, readOutbox, approve, reject, send, listInbox, writeInbound,
  watchTick, startGateway, stopGateway, postWebhook, postBotMessage, serve,
  _setStateDirForTests(dir) { /* tests use env SIGAP_DISCORD_STATE_DIR */ }
};
