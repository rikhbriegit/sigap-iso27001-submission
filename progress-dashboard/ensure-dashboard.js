// SIGAP — trigger 'mulai audit ISO 27001' also starts the dashboard (aturan 0).
//
// Idempotent preflight. Called by the Manager BEFORE run-counter.json is touched,
// before any audit log entry, outbox item, task, email or report.
//   DASHBOARD_UP       -> a healthy instance is already listening; reuse it.
//   DASHBOARD_STARTED  -> watchdog was (re)started and port 4173 is now live.
//   DASHBOARD_DOWN     -> fail closed: do NOT allocate the RUN.
//
// It NEVER kills or restarts a healthy server, NEVER binds 0.0.0.0, and NEVER
// starts a second instance. The resident watchdog keeps it alive afterwards.
// Usage: npm run ensure          (normal, on trigger)
//        npm run ensure -- --check-only   (probe only, never spawn; exit 1 if down)
"use strict";
const net = require("net");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const HOST = "127.0.0.1";
const PORT = Number(process.env.SIGAP_DASH_PORT || 4173);
const DIR = __dirname;
const LOG_DIR = path.resolve(DIR, "..", "logs");
const LOG = path.join(LOG_DIR, "dashboard-ensure.log");
const CHECK_ONLY = process.argv.includes("--check-only");
const WAIT_MS = Number(process.env.SIGAP_ENSURE_WAIT_MS || 12000);

function log(message) {
  const line = new Date().toISOString() + " " + message + "\n";
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); fs.appendFileSync(LOG, line); } catch (e) {}
}

function probe() {
  return new Promise(resolve => {
    const socket = net.connect({ host: HOST, port: PORT });
    let done = false;
    const finish = value => { if (!done) { done = true; socket.destroy(); resolve(value); } };
    socket.setTimeout(800, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

function startWatchdog() {
  try {
    const child = spawn(process.execPath, ["watchdog.js"], {
      cwd: DIR,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: Object.assign({}, process.env, { SIGAP_DASH_PORT: String(PORT) })
    });
    child.unref();
    return child.pid;
  } catch (e) {
    log("trigger: watchdog spawn FAILED: " + e.message);
    return null;
  }
}

(async () => {
  if (await probe()) {
    log("DASHBOARD_UP port=" + PORT + " (reuse, no second instance)");
    console.log("DASHBOARD_UP port=" + PORT);
    process.exit(0);
  }
  if (CHECK_ONLY) {
    log("DASHBOARD_DOWN port=" + PORT + " (check-only; fail-closed)");
    console.log("DASHBOARD_DOWN port=" + PORT);
    process.exit(1);
  }
  const pid = startWatchdog();
  log("trigger: dashboard down, watchdog pid=" + pid + "; waiting up to " + WAIT_MS + "ms");
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 300));
    if (await probe()) {
      log("DASHBOARD_STARTED port=" + PORT);
      console.log("DASHBOARD_STARTED port=" + PORT);
      process.exit(0);
    }
  }
  log("DASHBOARD_DOWN port=" + PORT + " after timeout — FAIL-CLOSED, do not allocate RUN");
  console.log("DASHBOARD_DOWN port=" + PORT);
  process.exit(1);
})();
