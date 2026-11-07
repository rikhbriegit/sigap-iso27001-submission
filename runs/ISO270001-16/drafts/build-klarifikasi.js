// Payload kartu KLARIFIKASI (FASE 4) — dibangun dari klarifikasi-bukti.json agar teks kartu = teks rekaman.
'use strict';
const fs = require('fs');
const path = require('path');
const RUN = 'ISO270001-16';
const dir = path.join(__dirname, '..');
const k = JSON.parse(fs.readFileSync(path.join(dir, 'klarifikasi-bukti.json'), 'utf8'));
const OPTIONS = ['Dokumen tersedia di Data-Operation', 'Akan tersedia (tanggal)', 'Belum tersedia', 'Perlu diskusi'];
for (const e of k.queue) {
  const payload = {
    run: RUN,
    jenis: 'klarifikasi bukti FASE 4 (SIGAP v5.2 §2 / §4)',
    id_klarifikasi: e.id,
    item: e.item,
    judul_item: e.judul_item,
    owner: e.owner,
    pic_kontak: e.pic_kontak,
    task_pengumpul: e.task_pengumpul,
    butir_kurang: e.butir_kurang,
    pertanyaan: e.pertanyaan,
    bukti_terkait_di_indeks: e.bukti_terkait_di_indeks,
    options: OPTIONS,
    catatan: 'Keputusan diambil MANUSIA di dashboard http://127.0.0.1:4173/?run=' + RUN + '#approvals. Auditor DILARANG menjawab sendiri. Jawaban kartu disalin ke klarifikasi-bukti.json pada turn berikutnya sebagai jawaban_kartu + conversation = "dashboard #approvals" (state.js menolak status dijawab tanpa keduanya). Teks bebas bukan approval.'
  };
  const out = path.join(__dirname, 'klarifikasi-' + e.id.toLowerCase() + '.json');
  fs.writeFileSync(out, JSON.stringify(payload, null, 1));
  console.log(out);
}
