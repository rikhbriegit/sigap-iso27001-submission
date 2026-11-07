#!/usr/bin/env node
// SIGAP — real task state straight from WorkBuddy (read-only): did a task fire, is it running, did it succeed, why did it fail.
// Source: %USERPROFILE%\.workbuddy-ai\workbuddy.db (tables automations, automation_runs, automation_runtime_state).
// Never writes to the platform database. Test override: SIGAP_WBSTATE_FILE=<json> (array in the output format below).
//   node tools/wbstate.js --run ISO270001-13            -> JSON array, one entry per automation of the run
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const DB = process.env.SIGAP_WB_DB || path.join(os.homedir(), '.workbuddy-ai', 'workbuddy.db');
// failures worth retrying (platform/model capacity, interruptions) vs. failures that need a person
const RETRYABLE = ['automation-rate-limited', 'automation-run-interrupted', 'automation-session-ended', 'automation-session-stuck', 'automation-session-start-failed',
  'automation-session-start-timeout', 'automation-run-timeout', 'automation-run-failed', 'automation-finalization-timeout', 'automation-environment-not-ready', 'automation-recovery-failed', 'automation-network-unavailable', 'automation-empty-result'];
const PLAIN = {
  'automation-rate-limited': 'dibatasi platform: model sedang penuh (terlalu banyak permintaan)',
  'automation-request-refused': 'ditolak platform (kuota/model penuh)',
  'automation-run-interrupted': 'terputus di tengah jalan', 'automation-session-ended': 'sesi berakhir sebelum selesai',
  'automation-run-timeout': 'melewati batas waktu', 'automation-turn-limit-exceeded': 'terlalu banyak langkah',
  'automation-context-limit-exceeded': 'konteks terlalu panjang', 'automation-workspace-unavailable': 'folder kerja tidak bisa dibuka',
  'automation-connector-unavailable': 'connector tidak tersedia', 'automation-model-config-failed': 'model tidak tersedia'
};
function classify(err, code) {
  // the platform reports a saturated model either as rate-limited or as "refusal ... 429 / quota"
  if (code) return code;
  if (/429|quota|saturat|too many requests/i.test(err || '')) return 'automation-rate-limited';
  if (err) return 'automation-run-failed';
  return null;
}
function read(run) {
  if (process.env.SIGAP_WBSTATE_FILE) return JSON.parse(fs.readFileSync(process.env.SIGAP_WBSTATE_FILE, 'utf8')).filter(a => a.name.startsWith(run + ' '));
  if (!fs.existsSync(DB)) return [];
  process.removeAllListeners('warning');
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB, { readOnly: true });
  try {
    const autos = db.prepare("select id, name, prompt, status, schedule_type, scheduled_at, next_run_at, rrule, model_id, connector_ids_json, created_at, updated_at, deleted_at from automations where name like ? and deleted_at is null").all(run + ' %');
    return autos.map(a => {
      const st = db.prepare('select running, running_started_at, last_run_at, last_error from automation_runtime_state where automation_id = ?').get(a.id) || {};
      const runs = db.prepare('select status, result_success, failure_code, metadata_json, created_at, updated_at from automation_runs where automation_id = ? order by created_at desc').all(a.id);
      const last = runs[0] || null;
      let meta = {}; try { meta = JSON.parse((last && last.metadata_json) || '{}'); } catch (e) {}
      const failure = last && String(last.result_success) === '0' ? classify(st.last_error, last.failure_code) : (last && last.status === 'IN_PROGRESS' ? null : (last ? null : null));
      const sched = a.scheduled_at ? Date.parse(a.scheduled_at) : (a.next_run_at ? Number(a.next_run_at) : null);
      return {
        id: a.id, name: a.name, status: a.status, schedule: a.schedule_type, rrule: a.rrule || '', scheduledAt: a.scheduled_at || null, scheduledMs: sched,
        model: a.model_id, connectors: (() => { try { return JSON.parse(a.connector_ids_json || '[]'); } catch (e) { return []; } })(),
        promptSha: require('crypto').createHash('sha256').update(String(a.prompt || '')).digest('hex'),
        running: String(st.running) === '1', runningSince: st.running_started_at ? Number(st.running_started_at) : null,
        runs: runs.length, lastRun: last ? { status: last.status, success: last.result_success == null ? null : String(last.result_success) === '1', failure, failurePlain: failure ? (PLAIN[failure] || failure) : null,
          retryable: failure ? RETRYABLE.includes(failure) : false, startedMs: Number(last.created_at), endedMs: Number(last.updated_at), conversationId: meta.conversationId || null, kind: meta.runKind || null } : null,
        lastError: st.last_error ? String(st.last_error).slice(0, 300) : null
      };
    });
  } finally { db.close(); }
}
module.exports = { read, RETRYABLE, PLAIN };
if (require.main === module) {
  const i = process.argv.indexOf('--run'); const run = i > 0 ? process.argv[i + 1] : null;
  if (!run) { console.error('usage: node tools/wbstate.js --run <RUN>'); process.exit(2); }
  console.log(JSON.stringify(read(run), null, 1));
}
