// Builder payload RELEASE network-user (A.5.15) — RUN ISO270001-16
// Menyusun payload dari runs/ISO270001-16/selection-network-user.json (hash sudah divalidasi manifest saat collect).
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const RUN = 'ISO270001-16';
const sel = JSON.parse(fs.readFileSync(path.join(ROOT, 'runs', RUN, 'selection-network-user.json'), 'utf8'));

const urut = [
  'ev-a5-01-kebijakan-ksi-v3.0.md',
  'ev-a5-18-sop-access-control-v1.2-2024.md',
  'Prosedur Pengamanan Kantor, Ruang, dan Fasilitas v1.2.md',
  'ev-a5-15-matriks-akses.md',
  'Definisi Peran RBAC Aplikasi HRIS v1.1.md',
  'Daftar Akun Istimewa dan Pengelolaan PAM Sep 2026.csv',
  'Pengumuman HR No.112-2026 Review Hak Akses Kuartalan 27 Okt 2026.md'
];

const byFile = new Map(sel.map(e => [e.file, e]));
const files = urut.filter(f => byFile.has(f));
if (files.length !== urut.length) {
  console.error('MISMATCH: selection tidak lengkap:', urut.filter(f => !byFile.has(f)));
  process.exit(1);
}
const sha = {};
for (const f of files) sha[f] = byFile.get(f).sha256;

const payload = {
  owner: 'network-user',
  item: 'A.5.15',
  sumber_folder: 'G:/My Drive/Hackathon_Tencent/IT Operation/Network & User',
  tujuan_folder: 'G:/My Drive/Hackathon_Tencent/ISO 27001/Evidence/ISO270001-16/network-user',
  files,
  sha256: sha,
  catatan_kejujuran:
    'Semua berkas adalah salinan byte-identik dari Data-Operation (hash = simulation/data-operation-manifest.json); tidak ada dokumen yang dibuat atau diubah. Pemetaan butir: butir 1 (kebijakan kontrol akses fisik & logika yang disetujui manajemen) = KSI v3.0 (disetujui CISO 5 Jun 2026, prinsip least privilege/need-to-know) + SOP Pengelolaan Hak Akses v1.2 (logika) + Prosedur Pengamanan Kantor v1.2 (fisik); butir 2 (matriks hak akses per peran/sistem) = Matriks Hak Akses Okt 2026 + Definisi Peran RBAC HRIS v1.1 + Daftar Akun Istimewa/PAM Sep 2026; butir 3 (review berkala 12 bulan) = Pengumuman HR 112/2026 (kuartalan mulai 1 Nov 2026) + rekaman review 20-24 Mei 2026 di dalam SOP v1.2. KETERBATASAN YANG DILAPORKAN: (a) tidak ada satu dokumen kebijakan A.5.15 khusus - kebijakan tersebar pada 3 dokumen; (b) tidak ada log access review tersendiri (tanpa rekaman per akun/berita acara) - hanya ringkasan naratif review Mei 2026 di SOP, dan review kuartalan pertama Q4 2026 belum terlaksana per 7 Nov 2026, sehingga butir 3 terpenuhi sebagian; (c) konflik sumber: SOP v1.2 (2024) masih menyebut review tahunan sedangkan Pengumuman HR 27 Okt 2026 menetapkan kuartalan - sumber terbaru berlaku dan SOP v1.2 ditandai perlu diperbarui; (d) matriks akses adalah ekstrak 7 baris role, belum seluruh sistem.',
  options: ['Revisi', 'Tolak', 'Tunda', 'Setujui sesuai preview']
};

const out = path.join(ROOT, 'runs', RUN, 'drafts', 'release-network-user-a515.json');
fs.writeFileSync(out, JSON.stringify(payload, null, 2) + '\n');
console.log(out);
console.log('files=' + files.length);
