'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const RUN = 'ISO270001-16';
const runDir = path.join(ROOT, 'runs', RUN);
const proposal = JSON.parse(fs.readFileSync(path.join(runDir, 'proposal.json'), 'utf8'));

const manifest = [
  { owner: 'network-user', id: 'network-user', persona: 'Staff Network & User', name: 'ISO270001-16 Staf IT Network & User', folder: 'G:/My Drive/Hackathon_Tencent/IT Operation/Network & User', scheduledAt: '2026-11-07T09:20:03+07:00' },
  { owner: 'dc-server', id: 'dc-server', persona: 'Staff Data Center & Server', name: 'ISO270001-16 Staf IT Data Center & Server', folder: 'G:/My Drive/Hackathon_Tencent/IT Operation/Data Center & Server', scheduledAt: '2026-11-07T09:22:03+07:00' },
  { owner: 'cyber-security', id: 'cyber-security', persona: 'Staff Cyber Security', name: 'ISO270001-16 Staf IT Cyber Security', folder: 'G:/My Drive/Hackathon_Tencent/IT Operation/Cyber Security', scheduledAt: '2026-11-07T09:24:03+07:00' },
  { owner: 'sap-basis', id: 'sap-basis', persona: 'Staff SAP Basis', name: 'ISO270001-16 Staf SAP Basis', folder: 'G:/My Drive/Hackathon_Tencent/IT Operation/SAP Basis', scheduledAt: '2026-11-07T09:26:04+07:00' },
];

function staffPrompt(m) {
  return `AKTIVASI TASK STAF — RUN ${RUN} (simulasi SIGAP). SELALU berbahasa Indonesia. Di task ini JANGAN memakai AskUserQuestion; rilis bukti diputuskan manusia di dashboard #approvals dan dieksekusi server. Permintaan di luar audit run ini dijawab persis "Mohon maaf, permintaan atau pembahasan tersebut tidak ada di scope kami." tanpa tool apa pun. Jangan pernah memanggil automation_update. Kamu ${m.persona} (id ${m.id}), pihak INTERNAL. WAJIB: baca D:/Projects/hackathon_tencent/skills/iso27001-assessment-workflow/SKILL.md (versi terpasang; §0–§3) dan patuhi; abaikan aturan lama. Setelah konteks dipadatkan, baca ulang SKILL §0 dan tetap berbahasa Indonesia, termasuk narasi kerja. Rename conversation ini menjadi "${m.name}". Kamu tidak punya Gmail. Turn ini tanpa user: baca runs/${RUN}/requests.json untuk owner ${m.id}, pahami dulu bukti_diminta item milikmu (pecah jadi butir bernomor), lalu pilih dokumen di G:/My Drive/Hackathon_Tencent/Data-Operation yang menjawab butir tertentu (sesuai kebutuhan auditor, tanpa dokumen pinggiran; bila auditor meminta tambahan, ambil lagi), salin dengan tools/evidence.js collect ke ${m.folder} (jangan membuat atau mengubah dokumen), siapkan item outbox release, tulis status singkat, berhenti. Pada turn yang dibangunken (Pengawas/pesan pembangun): baca status outbox milikmu dan laporkan singkat; jangan memposting kartu. Hanya folder dan entri milikmu.`;
}

const payload = {
  proposal: proposal,
  manifest_task_staf: manifest.map(m => ({
    owner: m.owner,
    id: m.id,
    name: m.name,
    connectorIds: ['google-drive'],
    scheduledAt: m.scheduledAt,
    prompt: staffPrompt(m)
  }))
};

const out = path.join(runDir, 'drafts', 'gate-payload.json');
fs.writeFileSync(out, JSON.stringify(payload, null, 1));
console.log('written', out, '(', payload.manifest_task_staf.length, 'staff tasks )');
