// SIGAP — "Tindak lanjut" buttons (user, 6 Nov): when an agent is stalled, the person presses ONE button in the dashboard and
// the process starts again. WorkBuddy has no external run API (deep links only open pages; automation_update is agent-only),
// so the server drives WorkBuddy's own UI through its local debug port (WorkBuddy started via the SIGAP launcher with
// --remote-debugging-port=9333) and does exactly what a person would click:
//   pengawas: Scheduled → "<RUN> Pengawas" → Run now  (the Pengawas then re-arms the stalled task: same prompt, logged, max 3)
//   manager : open "<RUN> Manager" → send the fixed wake text (content ignored by the skill, rule 8)
// Afterwards the window always returns to the Manager chat with the SIGAP dashboard panel (user rule: always visible).
"use strict";
const CDP = process.env.SIGAP_WB_CDP || "http://127.0.0.1:9333";
const WAKE_TEXT = "Tindak lanjut dari dashboard SIGAP.";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function connect() {
  let list; try { list = await (await fetch(CDP + "/json/list")).json(); } catch (e) { throw new Error("WorkBuddy tidak bisa dikendalikan dari dashboard: buka WorkBuddy lewat pintasan SIGAP (port debug 9333)."); }
  const t = list.find(x => x.type === "page" && /wbSeedToken/.test(x.url)) || list.find(x => x.type === "page" && /renderer\/index\.html/.test(x.url));
  if (!t) throw new Error("Jendela utama WorkBuddy tidak ditemukan.");
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("koneksi ke WorkBuddy gagal")); });
  let id = 0; const wait = new Map();
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait.has(d.id)) { wait.get(d.id)(d); wait.delete(d.id); } };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; wait.set(i, d => d.error ? rej(new Error(d.error.message)) : res(d.result)); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };
  const click = async (x, y) => { for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 }); };
  return { ev, click, send, close: () => ws.close() };
}
const TITLE = `(document.querySelector('.workbuddy-topbar-options')?.innerText||'').split('\\n')[0].trim()`;
const openConv = t => `(()=>{const el=[...document.querySelectorAll('[class*=_titleStatic_]')].find(e=>e.innerText.trim()===${JSON.stringify(t)}); if(!el) return false; (el.closest('[data-conversation-id]')||el).click(); return true})()`;

async function backToManager(c, run) {
  await c.ev(openConv(run + " Manager")); await sleep(1800);
  return (await c.ev(TITLE)) === run + " Manager";
}

async function runPengawas(run) {
  const c = await connect();
  try {
    await c.ev(`(()=>{const e=[...document.querySelectorAll('*')].find(x=>x.children.length<3&&(x.innerText||'').trim()==='Scheduled'); if(e) e.click(); return !!e})()`); await sleep(2500);
    const r = await c.ev(`(()=>{const name=${JSON.stringify(run + " Pengawas")}; const t=[...document.querySelectorAll('*')].find(e=>e.children.length===0&&(e.innerText||'').trim()===name); if(!t) return 'not-found';
      let n=t; for(let i=0;i<6&&n;i++){ const b=[...n.querySelectorAll('button,[role=button]')].find(x=>/^Run now$/i.test((x.getAttribute('aria-label')||x.innerText||'').trim())); if(b){ b.click(); return 'clicked'; } n=n.parentElement } return 'no-button'})()`);
    await sleep(1500);
    const back = await backToManager(c, run);
    if (r !== "clicked") return { ok: false, out: r === "not-found" ? "Task " + run + " Pengawas tidak ada di WorkBuddy (belum dibuat di FASE 0?)." : "Tombol Run now Pengawas tidak ditemukan.", back };
    return { ok: true, out: "Pengawas dijalankan sekarang: ia akan menjadwalkan ulang task yang macet (perintah sama, tercatat di log audit).", back };
  } finally { c.close(); }
}

async function wakeManager(run, reason) {
  const c = await connect();
  try {
    if (!(await backToManager(c, run))) return { ok: false, out: "Chat " + run + " Manager tidak ditemukan." };
    const busy = await c.ev(`!!document.querySelector('[data-status=pending],[data-status=streaming],[data-status=running]')`);
    if (busy) return { ok: false, out: "Manager sedang bekerja; tidak perlu diingatkan sekarang.", back: true };
    const card = await c.ev(`[...document.querySelectorAll("[class*=_questionFloating_]")].some(e => e.getBoundingClientRect().height > 0)`);
    if (card) return { ok: false, out: "Ada kartu yang menunggu jawaban Anda di chat Manager; Manager tidak diingatkan.", back: true };
    const ed = await c.ev(`(()=>{const el=document.querySelector('[data-testid=conversation-input] [contenteditable=true]')||[...document.querySelectorAll('[contenteditable=true]')].pop(); if(!el) return null; const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    if (!ed) return { ok: false, out: "Kolom pesan Manager tidak ditemukan.", back: true };
    const text = reason ? WAKE_TEXT.replace(/\.$/, "") + ": " + String(reason).slice(0, 400) : WAKE_TEXT; // reason = generated by the Pengawas rules
    await c.click(ed.x, ed.y); await c.send("Input.insertText", { text }); await sleep(400);
    const s = await c.ev(`(()=>{const b=[...document.querySelectorAll('button[aria-label="Send"]')].find(b=>b.getBoundingClientRect().height>0); if(!b) return false; b.click(); return true})()`);
    return { ok: !!s, out: s ? "Manager diingatkan: \"" + text + "\"" : "Tombol kirim tidak ditemukan.", back: true };
  } finally { c.close(); }
}
// Run an existing WorkBuddy task NOW through WorkBuddy's own renderer API (the call behind its "Run now" button). No page change:
// the Manager chat + dashboard stay on screen. Works for expired once-tasks too (tested 6 Nov 14:16). Same automation = same prompt.
async function trigger(automationId) {
  if (!/^[0-9a-f-]{36}$/.test(automationId || "")) return { ok: false, out: "id task tidak valid" };
  const c = await connect();
  try {
    const r = await c.ev(`(async()=>{ try { if(!window.wb||!window.wb.automations) return 'no-api'; await window.wb.automations.trigger(${JSON.stringify(automationId)}); return 'ok'; } catch(e) { return 'ERR '+(e&&e.message||e); } })()`);
    return r === "ok" ? { ok: true, out: "task dijalankan sekarang" } : { ok: false, out: r === "no-api" ? "API WorkBuddy tidak tersedia" : r };
  } finally { c.close(); }
}
// Is the Manager chat working right now? Read-only, no navigation: only answers when the Manager chat is the open view.
async function managerBusy(run) {
  let c; try { c = await connect(); } catch (e) { return null; }
  try {
    if ((await c.ev(TITLE)) !== run + " Manager") return null;
    return await c.ev(`(()=>{const btns=[...document.querySelectorAll('[data-testid=conversation-input-area] button,[data-testid=conversation-input-area] [role=button]')]; const stop=btns.some(e=>/stop|停止|cancel generation|interrupt/i.test((e.getAttribute('aria-label')||'')+' '+(e.innerText||'')+' '+e.className)); const pend=document.querySelectorAll('[data-status=pending],[data-status=streaming],[data-status=running],[data-status=in_progress]').length>0; const card=[...document.querySelectorAll('[class*=_questionFloating_]')].some(e=>e.getBoundingClientRect().height>0); return { busy: (stop||pend) && !card, card }})()`);
  } finally { c.close(); }
}
// Model fallback (user, 6 Nov: "bisa ga pengawas merubah ke HY4 / HY3?"). Hy3 and Hy4 saturate independently, so after a
// model failure the Pengawas switches to the other one. Tasks: WorkBuddy's own automations API, execution.modelId ONLY
// (prompt untouched, verified). Manager chat: the chat's own model selector (no navigation).
const OTHER = { hy3: "hy4free", hy4: "hy3", hy4free: "hy3", hy4std: "hy3" }; // legacy two-model fallback
// Any model available in WorkBuddy (user, 6 Nov: "atau apapun yang tersedia, misal deepseek flash dari ollama"):
// progress-dashboard/model-fallback.json holds the user-editable order; only models WorkBuddy lists with tool support count.
async function availableModels() {
  const c = await connect();
  try { return await c.ev(`(async()=>{ try { const r=await window.wb.models.list(); return (r.items||r).filter(m=>m.supportsToolCall).map(m=>({ id:m.id, name:m.name })); } catch(e) { return []; } })()`); }
  finally { c.close(); }
}
async function nextModel(current) {
  let chain = []; try { chain = JSON.parse(require("fs").readFileSync(require("path").join(__dirname, "model-fallback.json"), "utf8")).chain || []; } catch (e) {}
  const avail = await availableModels(); const ok = chain.filter(id => avail.some(m => m.id === id));
  if (!ok.length) return null;
  const cur = String(current || "").toLowerCase(); const i = ok.findIndex(id => id.toLowerCase() === cur || (cur === "hy4" && id === "hy4free"));
  const id = ok[(i + 1) % ok.length] === cur ? null : ok[(i + 1) % ok.length];
  return id ? { id, name: (avail.find(m => m.id === id) || {}).name || id } : null;
}
async function setTaskModel(automationId, model) {
  const c = await connect();
  try {
    return await c.ev(`(async()=>{ try { const id=${JSON.stringify(automationId)}; const a=await window.wb.automations.get(id); const p=a.prompt;
      if (a.execution.modelId === ${JSON.stringify(model)}) return { ok: true, out: 'sudah ' + a.execution.modelId };
      await window.wb.automations.update(id, { execution: Object.assign({}, a.execution, { modelId: ${JSON.stringify(model)} }) });
      const b=await window.wb.automations.get(id); return { ok: b.execution.modelId === ${JSON.stringify(model)} && b.prompt === p, out: (a.execution.modelId||'?') + ' -> ' + b.execution.modelId + (b.prompt === p ? '' : ' (PROMPT BERUBAH!)') };
    } catch(e) { return { ok: false, out: 'ERR ' + (e && e.message || e) }; } })()`);
  } finally { c.close(); }
}
async function chatModelState(run) {
  const c = await connect();
  try {
    if ((await c.ev(TITLE)) !== run + " Manager") return null;
    return await c.ev(`(()=>{ const cur=(document.querySelector('[aria-label^="Select model"]')?.getAttribute('aria-label')||'').replace('Select model: ','');
      const items=[...document.querySelectorAll('[data-assistant-content=true]')]; const last=(items[items.length-1]?.innerText||'');
      const banner=[...document.querySelectorAll('div')].some(e=>{const r=e.getBoundingClientRect();return r.height>0&&/^Model busy/.test((e.innerText||'').trim())&&e.innerText.length<400});
      return { model: cur, failed: banner || /unknown error occurred and no response|Model busy|currently saturated/i.test(last.slice(-400)) }; })()`);
  } finally { c.close(); }
}
async function setChatModel(run, want, wantName) {
  const c = await connect();
  try {
    if ((await c.ev(TITLE)) !== run + " Manager") return { ok: false, out: "chat Manager tidak terbuka" };
    const label = wantName || (want === "hy3" ? "Hy3" : "Hy4");
    const cur = await c.ev(`document.querySelector('[aria-label^="Select model"]')?.getAttribute('aria-label')`);
    if (cur === "Select model: " + label) return { ok: true, out: "sudah " + label };
    const b = await c.ev(`(()=>{const b=document.querySelector('[aria-label^="Select model"]'); if(!b) return null; const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    if (!b) return { ok: false, out: "pemilih model tidak ditemukan" };
    await c.click(b.x, b.y); await sleep(800);
    const pos = await c.ev(`(()=>{const el=[...document.querySelectorAll('[role=menuitem],[role=option],[class*=menu] [class*=item],[class*=Model] [class*=item]')].filter(e=>e.getBoundingClientRect().height>0).find(e=>e.innerText.trim().split('\\n')[0]===${JSON.stringify(label)}); if(!el) return null; const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    if (!pos) { await c.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }); return { ok: false, out: "model " + label + " tidak ada di daftar" }; }
    await c.click(pos.x, pos.y); await sleep(800);
    const now = await c.ev(`document.querySelector('[aria-label^="Select model"]')?.getAttribute('aria-label')`);
    return { ok: now === "Select model: " + label, out: (cur || "?").replace("Select model: ", "") + " -> " + (now || "?").replace("Select model: ", "") };
  } finally { c.close(); }
}
// v5.4 (user, 7 Nov — run 15 cancelled because the panel stayed an empty "New Tab"): the SIGAP dashboard must be visible
// in the Manager chat's right panel from the moment the trigger is sent, without relying on the agent or an operator.
// Called every 2 s by the server. Acts only when the main window shows a SIGAP Manager chat (title "ISO270001-NN Manager",
// or a still-untitled chat whose user message is the trigger phrase) and no SIGAP dashboard tab is visible.
const TRIGGER_RE = /^mulai audit ISO 27001$/i;
const DASH_VISIBLE = `[...document.querySelectorAll('*')].some(e=>e.children.length<2&&/^SIGAP — progress/.test((e.innerText||'').trim())&&e.getBoundingClientRect().width>0)`;
async function ensurePanel() {
  const c = await connect();
  try {
    const st = await c.ev(`(()=>{const t=${TITLE}; const m=t.match(/^(ISO270001-\\d{2}) Manager$/);
      const trig=[...document.querySelectorAll('.cr-self-message .cr-user-content')].some(e=>${TRIGGER_RE}.test((e.innerText||'').trim()));
      return {title:t, run:m?m[1]:null, sigap:!!m||trig, dash:${DASH_VISIBLE}}})()`);
    if (!st.sigap || st.dash) return { acted: false, st };
    const url = "http://127.0.0.1:4173/" + (st.run ? "?run=" + st.run : "") + "#manager";
    // 1. right panel open
    await c.ev(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>/^(Open|Expand) right panel$/i.test(e.getAttribute('aria-label')||'')); if(b) b.click(); return !!b})()`); await sleep(900);
    // 2. a browser tab in the panel (reuse an empty one, otherwise "Open browser")
    let addr = await c.ev(`(()=>{const i=[...document.querySelectorAll('input')].find(i=>/address/i.test(i.placeholder||'')&&i.getBoundingClientRect().width>0); if(!i) return null; const r=i.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    if (!addr) {
      await c.ev(`(()=>{const e=[...document.querySelectorAll('*')].find(x=>x.children.length<3&&(x.innerText||'').trim()==='Open browser'); if(e) e.click(); return !!e})()`); await sleep(1500);
      addr = await c.ev(`(()=>{const i=[...document.querySelectorAll('input')].find(i=>/address/i.test(i.placeholder||'')&&i.getBoundingClientRect().width>0); if(!i) return null; const r=i.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    }
    if (!addr) return { acted: false, st, out: "address bar not found" };
    // 3. the dashboard URL
    await c.click(addr.x, addr.y); await sleep(200);
    await c.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: 2 });
    await c.send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: 2 });
    await c.send("Input.insertText", { text: url });
    for (const type of ["rawKeyDown", "char", "keyUp"]) await c.send("Input.dispatchKeyEvent", { type, key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: type === "char" ? "\r" : undefined });
    await sleep(2500);
    return { acted: true, st, url, visible: await c.ev(DASH_VISIBLE) };
  } finally { c.close(); }
}

module.exports = { runPengawas, wakeManager, trigger, managerBusy, setTaskModel, chatModelState, setChatModel, availableModels, nextModel, OTHER, WAKE_TEXT, ensurePanel };
