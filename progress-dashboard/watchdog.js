// SIGAP dashboard watchdog — keeps 127.0.0.1:4173 alive (aturan 0 workflow v5.2).
// Run from an EXTERNAL terminal: npm run watchdog
// Never start a second server while a healthy one is listening.
"use strict";
const net = require("net");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const HOST = "127.0.0.1";
const PORT = Number(process.env.SIGAP_DASH_PORT || 4173);
const DIR = __dirname;
const LOG_DIR = path.resolve(DIR, "..", "logs");
const LOG = path.join(LOG_DIR, "dashboard-watchdog.log");
const LOCK = path.join(LOG_DIR, "dashboard-watchdog.lock");
const INTERVAL = Number(process.env.SIGAP_WATCHDOG_MS || 500);
const MIN_RESPAWN_GAP = 2000;

function log(message) {
  const line = new Date().toISOString() + " " + message + "\n";
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); fs.appendFileSync(LOG, line); } catch (e) {}
  process.stdout.write(line);
}

function alive() {
  return new Promise(resolve => {
    const socket = net.connect({ host: HOST, port: PORT });
    let done = false;
    const finish = value => { if (!done) { done = true; socket.destroy(); resolve(value); } };
    socket.setTimeout(800, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

function singleInstance() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    if (fs.existsSync(LOCK)) {
      const pid = Number(fs.readFileSync(LOCK, "utf8").trim());
      if (pid && pid !== process.pid) {
        try { process.kill(pid, 0); log("watchdog already running pid=" + pid + "; exiting"); return false; }
        catch (e) { log("stale lock pid=" + pid + "; taking over"); }
      }
    }
    fs.writeFileSync(LOCK, String(process.pid));
    return true;
  } catch (e) { log("lock error: " + e.message); return false; }
}

function startServer() {
  log("dashboard DOWN — spawning server.js");
  try {
    const child = spawn(process.execPath, ["server.js"], {
      cwd: DIR, detached: true, stdio: "ignore", windowsHide: true,
      env: Object.assign({}, process.env)
    });
    child.unref();
    log("spawned server pid=" + child.pid);
  } catch (e) { log("spawn FAILED: " + e.message); }
}

let lastSpawn = 0;
async function tick() {
  const ok = await alive();
  if (!ok && Date.now() - lastSpawn > MIN_RESPAWN_GAP) {
    lastSpawn = Date.now();
    startServer();
  }
}

if (!singleInstance()) process.exit(0);
log("watchdog start port=" + PORT + " interval=" + INTERVAL + "ms pid=" + process.pid);
const cleanup = () => { try { fs.unlinkSync(LOCK); } catch (e) {} };
process.on("exit", cleanup);
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
setInterval(tick, INTERVAL);
tick();
