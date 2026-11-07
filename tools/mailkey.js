// SIGAP — identity of a message/meeting for duplicate detection: recipients + meeting date (YYYY-MM-DD).
// Run 14: CALENDAR-016 re-proposed the same invitation already sent as EMAIL-012 (Gmail id) — it must not be sent twice,
// and an older unproven item (CALENDAR-011) counts as resolved once an equivalent item was sent with a Gmail id.
'use strict';
const MON = { jan: 1, januari: 1, january: 1, feb: 2, februari: 2, february: 2, mar: 3, maret: 3, march: 3, apr: 4, april: 4, mei: 5, may: 5, jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7, agu: 8, agustus: 8, aug: 8, august: 8, sep: 9, september: 9, okt: 10, oktober: 10, oct: 10, october: 10, nov: 11, november: 11, des: 12, desember: 12, dec: 12, december: 12 };
const GMAIL_ID = /^(gmail:)?[0-9a-f]{12,24}$/i;
function addrs(p) {
  return [].concat(p.to || [], p.cc || [], p.bcc || [], p.peserta || [], p.attendees || [], p.participants || [])
    .map(x => typeof x === 'string' ? x : (x && x.email) || '').filter(Boolean).map(s => s.toLowerCase()).sort();
}
function meetingDate(p) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(p.date || ''))) return p.date;
  const text = [p.subject, p.title, p.body, p.body_preview, p.agenda].filter(Boolean).join(' ');
  const m = /(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/.exec(text);
  if (m && MON[m[2].toLowerCase()]) return m[3] + '-' + String(MON[m[2].toLowerCase()]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
  const iso = /(\d{4}-\d{2}-\d{2})/.exec(text); return iso ? iso[1] : '';
}
function key(o) { const p = (o && o.payload) || {}; const d = meetingDate(p); const a = addrs(p); return d && a.length ? a.join(',') + '|' + d : null; }
const sent = o => o && ['email', 'calendar'].includes(o.kind) && o.status === 'EXECUTED' && GMAIL_ID.test(String(o.result || '').trim());
// another item for the same recipients + date that was really sent (Gmail id)
function sentTwin(o, all) { const k = key(o); if (!k) return null; return (all || []).find(x => x.id !== o.id && sent(x) && key(x) === k) || null; }
module.exports = { key, sent, sentTwin, GMAIL_ID };
