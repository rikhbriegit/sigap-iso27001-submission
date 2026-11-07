---
name: iso27001-report-generator
triggers: ["laporan gap", "buat SoA", "statement of applicability", "laporan self assessment", "laporan asesmen ISO", "laporan kesiapan audit"]
version: 2.1
description: Prosedur auditor SIGAP v5.0 menyusun SoA, daftar temuan conformity, laporan audit dan ekspor audit log; penerbitan dan distribusi lewat outbox ber-hash + kartu.
agent_created: true
---

## PURPOSE
Dipakai oleh **task Auditor (eksternal)** di FASE 7. Manager (internal) tidak menyusun, tidak menerbitkan, dan tidak mengirim hasil audit.

## PROCEDURE
1. Prasyarat: QA FASE 6 lulus (`node tools/evidence.js check --run <RUN> --file runs/<RUN>/penilaian-auditor.md` exit 0). Gagal → perbaiki dulu; maksimal 3 iterasi lalu eskalasi ke Manager.
2. **SoA (Excel)**: 93 baris; kolom `Kontrol | Judul | Tema | Penerapan (Implemented / Not implemented / Excluded) | Justifikasi | Dinilai siklus ini | Status audit | Bukti`. Kontrol di luar fokus: "Dinilai siklus ini = tidak", status audit kosong. Sheet "Ringkasan": jumlah per status audit (Conform / Minor NC / Major NC / OFI / N/A) + daftar item fokus. Tidak ada skor, persentase, atau severity.
3. **Laporan audit (Word)**: (a) ringkasan eksekutif — lingkup, item fokus + alasan, metode conformity, periode, auditor, jumlah per status, kesimpulan kelayakan (0 Major NC = tidak ada penghalang sertifikasi dari item yang dinilai); (b) temuan per item — klausul/kontrol, status, bukti objektif (nama file dari indeks + kutipan), uraian, tindakan korektif usulan, pemilik, target (Minor NC ≤ 90 hari; Major NC sebelum audit sertifikasi); (c) OFI; (d) catatan proses — klarifikasi (pertanyaan, jawaban kartu, waktu), instruksi tersisip yang terdeteksi, keterbatasan; (e) pernyataan: approval dalam uji diberikan operator atas nama persona simulasi dan manager.
4. **Presentasi hasil audit (PowerPoint, WAJIB)**: nama berkas PERSIS `Presentasi-Hasil-Audit-<RUN_ID>.pptx` (nama lain ditolak `outbox.js` dan distribusi tetap terkunci; R09-F18) untuk rapat penutupan, dibangun dari dokumen FINAL (bukan dari ingatan): (1) judul + lingkup + periode + auditor; (2) metode conformity, item fokus + alasan risiko; (3) ringkasan status (Conform / Minor NC / Major NC / OFI / N/A) + kesimpulan kelayakan; (4) satu slide per Major NC dan Minor NC: kontrol/klausul, uraian, bukti objektif (nama file + kutipan singkat), tindakan korektif + pemilik + target; (5) OFI; (6) catatan proses (klarifikasi, instruksi tersisip, keterbatasan); (7) langkah berikutnya (CAP ≤ 90 hari, rapat penutupan, verifikasi). Tanpa skor angka. Berlabel DRAFT sampai kartu penerbitan disetujui. Dibuat dengan skill presentasi WorkBuddy atau python-pptx offline; ungkapkan deviasi di audit log.
5. **Ekspor audit log**: entri run dari `audit-log/entries.json` (waktu | aktor | fase | aksi | approval | ref).
6. Simpan di `reports/<RUN_ID>/`: `SoA-<RUN_ID>.xlsx`, `Daftar-Temuan-<RUN_ID>.md`, `Laporan-Audit-<RUN_ID>.docx`, `Presentasi-Hasil-Audit-<RUN_ID>.pptx`, `AuditLog-<RUN_ID>.xlsx`. Status dokumen: DRAFT sampai kartu penerbitan disetujui.
7. **Penerbitan**: `outbox.js create --kind report` (payload: nama file + sha256 tiap artefak + versi) → kartu OUTBOX → setelah `verify`, ubah status dokumen menjadi FINAL v1.0 → `done`.
8. **Distribusi** (setelah serah terima diterima Manager): `outbox.js create --kind email` (From `rikh.brie+assesor@gmail.com` atau akun teknis, To `rikh.brie+direksi@gmail.com`, CC `rikh.brie@gmail.com`, subjek, isi lengkap, daftar artefak + versi; connector hanya mengirim teks → nyatakan lampiran tersedia lokal) → kartu OUTBOX → `verify` → kirim persis → `done --result <msgId>`.
9. PII (NIK, telepon) tetap di-mask di semua artefak. Bahasa Indonesia formal.

## LEARNED
1. Konversi Word lewat editor SDK (HTTP loopback 127.0.0.1:39099) dibunuh host di chat WorkBuddy (LPAC). Rute yang terbukti: jalankan konversi dari terminal eksternal (`convert-gapreport.cmd`) atau bangun DOCX offline dengan stdlib (`reports/2026-11/.GapReport-2026-11.ref/build-docx.py`). Ungkapkan deviasi di audit log.
2. SoA Excel dibangun lokal (build.py) — tidak terdampak LPAC.
3. Validasi JSON setelah setiap penulisan besar; audit log hanya lewat `tools/audit.js`.
4. Label AIGC = properti custom "AIGC" di docProps/custom.xml; kegagalan menulis label hanya warning.
5. Run 07: laporan disusun dan distribusi disiapkan oleh manager (temuan F27) dan memakai skor (F20). v2.0 memindahkan seluruhnya ke auditor dan memakai status conformity.
