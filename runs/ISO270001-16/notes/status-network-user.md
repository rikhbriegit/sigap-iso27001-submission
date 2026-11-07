# Status — Staff Network & User (network-user) — RUN ISO270001-16

Waktu: 7 November 2026, 10:15 WIB · Item: **A.5.15 Kontrol akses** (PIC c04 Rina Kartika)

## Yang sudah dikerjakan
1. `requests.json` item A.5.15 dibaca; 3 baris `bukti_diminta` dipecah menjadi butir 1–3 di `notes/selection-network-user.md`.
2. 7 dokumen dipilih dari `Data-Operation/` (read-only) dan disalin byte-identik dengan `tools/evidence.js collect` ke `IT Operation/Network & User/` (hash = manifest):
   - butir 1: `ev-a5-01-kebijakan-ksi-v3.0.md`, `ev-a5-18-sop-access-control-v1.2-2024.md`, `Prosedur Pengamanan Kantor, Ruang, dan Fasilitas v1.2.md`
   - butir 2: `ev-a5-15-matriks-akses.md`, `Definisi Peran RBAC Aplikasi HRIS v1.1.md`, `Daftar Akun Istimewa dan Pengelolaan PAM Sep 2026.csv`
   - butir 3: `Pengumuman HR No.112-2026 Review Hak Akses Kuartalan 27 Okt 2026.md`
3. `requests.json` A.5.15 → status `dikumpulkan` (dengan catatan gap). `node tools/state.js check --run ISO270001-16` = **OK**.
4. Item outbox **RELEASE-006** dibuat (PENDING_APPROVAL, sha256 `18c3871f7604e6ba…`), tercatat di `progress.json` `menunggu_kartu` dan di log audit (entri 569).

## Keterbatasan yang dilaporkan (bukan disembunyikan)
- Butir 1 hanya terpenuhi secara gabungan 3 dokumen; tidak ada satu kebijakan A.5.15 khusus.
- Butir 3 terpenuhi **sebagian**: tidak ada log access review tersendiri (hanya ringkasan naratif review 20–24 Mei 2026 di dalam SOP v1.2); review kuartalan pertama (Q4 2026) belum terlaksana per 7 Nov 2026.
- Konflik sumber: SOP v1.2 (2024, review tahunan) vs Pengumuman HR 112/2026 (kuartalan sejak 1 Nov 2026) → sumber terbaru berlaku, SOP ditandai perlu diperbarui.

## Status akhir turn
Menunggu keputusan manusia di dashboard `http://127.0.0.1:4173/?run=ISO270001-16#approvals` (kartu RELEASE untuk `network-user`). Server dashboard terdeteksi hidup (LISTENING 127.0.0.1:4173, PID 29260). Rilis dieksekusi server, bukan oleh agen. Belum ada pekerjaan lain yang bisa dilakukan sampai keputusan keluar.
