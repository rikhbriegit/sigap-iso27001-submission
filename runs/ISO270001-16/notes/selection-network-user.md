# Seleksi Bukti — A.5.15 Kontrol akses (network-user / c04) — RUN ISO270001-16

Pemilik: Staff Network & User (id `network-user`, Rina Kartika, kontak c04). Item: **A.5.15 — Kontrol akses**.
Sumber wajib: `G:/My Drive/Hackathon_Tencent/Data-Operation/` (salinan byte-identik via `tools/evidence.js collect`, hash = `simulation/data-operation-manifest.json`).
Tujuan: `G:/My Drive/Hackathon_Tencent/IT Operation/Network & User/` → rilis ke `ISO 27001/Evidence/ISO270001-16/network-user/`.

## Pecahan butir `bukti_diminta`
1. Dokumen kebijakan kontrol akses (fisik dan logika) yang disetujui manajemen.
2. Matriks hak akses per peran / sistem (role-based access matrix).
3. Bukti peninjauan hak akses berkala (access review log) 12 bulan terakhir.

## Dokumen terpilih (collect dilakukan, hash tervalidasi manifest)

### Butir 1 — kebijakan kontrol akses (logika & fisik) yang disetujui manajemen
- **`ev-a5-01-kebijakan-ksi-v3.0.md`** (A.5.1)
  Alasan: kebijakan puncak KSI-NDP-001 v3.0 **disetujui CISO Hendra Gunawan 5 Juni 2026** (tanda tangan digital) — memuat prinsip kontrol akses logika yang mengikat: *least privilege, need-to-know, ownership aset* (hal. 4 bagian 2.1), struktur persetujuan kebijakan & owner kontrol (hal. 5 bagian 2.3). Ini bukti "disetujui manajemen" untuk arah kebijakan akses.
- **`ev-a5-18-sop-access-control-v1.2-2024.md`** (A.5.18)
  Alasan: prosedur operasional kontrol akses **logika** — review hak akses minimal 1×/tahun oleh IT Ops bersama owner sistem (4.2), alur permintaan akses baru dengan persetujuan atasan + owner sistem (4.3), pencabutan akses resign ≤ 1×24 jam (4.5), arsip rekaman review ≥ 3 tahun (5.1). Dokumen ini juga memuat **riwayat review terakhir** (lihat butir 3).
- **`Prosedur Pengamanan Kantor, Ruang, dan Fasilitas v1.2.md`** (A.7.3)
  Alasan: sisi **fisik** dari kontrol akses — ruang server & arsip berpintu terkunci otomatis dengan daftar akses resmi (butir 1), kabinet dokumen sensitif terkunci dua tingkat dengan pinjam tercatat (2), kaca anti-tembus area IT (4), kunci layar terminal area umum (5).

### Butir 2 — matriks hak akses per peran/sistem (RBAC)
- **`ev-a5-15-matriks-akses.md`**
  Alasan: matriks hak akses lintas aplikasi (SAP-FI, e-proc, HRIS, File Server) per role & divisi beserta level akses; mencatat prinsip maker-checker e-proc dan pembaruan terakhir 15 Oktober 2026 (owner Andi Pratama). Dokumen inti butir 2.
- **`Definisi Peran RBAC Aplikasi HRIS v1.1.md`** (A.8.3)
  Alasan: melengkapi matriks pada bagian yang oleh matriks sendiri dinyatakan "di luar matriks umum" — peran **HR Payroll** (akses gaji seluruh karyawan, maker-checker dengan HR Manager), pembatasan IT Admin teknis tanpa akses data bisnis, serta pemegang tiap peran. Tanpa dokumen ini, butir 2 tidak lengkap untuk sistem HRIS.
- **`Daftar Akun Istimewa dan Pengelolaan PAM Sep 2026.csv`** (A.8.2)
  Alasan: matriks peran untuk lapisan **akses istimewa** (admin server/jaringan/aplikasi/DBA): akun adm-* terpisah dari akun harian, pemilik manusia per akun, wajib bastion + MFA, rotasi kredensial, dan pemakaian 90 hari terakhir. Melengkapi butir 2 untuk akses infrastruktur (bukan hanya aplikasi bisnis).

### Butir 3 — bukti peninjauan hak akses berkala 12 bulan terakhir
- **`Pengumuman HR No.112-2026 Review Hak Akses Kuartalan 27 Okt 2026.md`**
  Alasan: sumber **terbaru dan sah** tentang frekuensi review: mulai 1 November 2026 review menjadi **kuartalan**, menggantikan ketentuan tahunan SOP v1.2 bagian 4.2; pelaksanaan pertama Q4 2026 (awal November 2026), pelaksana IT Ops + owner sistem, rekap ke IT Security Officer; SOP akan direvisi menyusul. Ini juga bukti kesadaran & keputusan manajemen (dikuatkan Notulen Komite 15 Sep 2026 agenda 3).
  Catatan: rekaman hasil review terakhir ada pada `ev-a5-18-sop-access-control-v1.2-2024.md` bagian "Riwayat review terakhir tercatat" (sudah dikumpulkan untuk butir 1) — 20–24 Mei 2026, semua sistem utama 100% selesai, 12 akun dormant dinonaktifkan, 3 mutasi hak akses disesuaikan.

## Konflik sumber (dilaporkan, bukan disembunyikan)
- `ev-a5-18-sop-access-control-v1.2-2024.md` (v1.2, **2024**) masih mensyaratkan review **tahunan** (4.2) dan arsip 3 tahun (5.1).
- `Pengumuman HR No.112-2026` (27 Okt 2026) menetapkan review **kuartalan** mulai 1 Nov 2026 dan menyatakan SOP akan direvisi menyusul.
- Keduanya disitasi; sesuai SKILL §5 sumber terbaru yang sah menang → **kuartalan** berlaku, dan **SOP v1.2 ditandai perlu diperbarui** (belum direvisi per 7 Nov 2026).

## Keterbatasan bukti (jujur, untuk penilaian Auditor)
1. **Tidak ada log access review tersendiri** di Data-Operation (tidak ada berkas rekaman per akun/per sistem, daftar hadir reviewer, atau berita acara review). Yang tersedia hanya **ringkasan naratif** hasil review 20–24 Mei 2026 di dalam SOP v1.2. → butir 3 terpenuhi **sebagian**.
2. **Review kuartalan pertama (Q4 2026) belum terlaksana** pada tanggal audit (7 Nov 2026); pengumuman menyebut pelaksanaan "awal November 2026" tanpa tanggal pasti dan tanpa bukti pelaksanaan.
3. **Tidak ada satu dokumen kebijakan khusus "Kontrol Akses (A.5.15)"**; kebijakan tersebar pada KSI v3.0 (prinsip), SOP A.5.18 (logika), dan Prosedur Fasilitas v1.2 (fisik). → butir 1 terpenuhi secara gabungan dokumen, bukan satu kebijakan dedicated.
4. Matriks akses adalah **ekstrak** (7 baris role) dan belum memuat seluruh sistem (mis. SAP BASIS/DB, VPN, file share per departemen terperinci); cakupan penuh ada pada sistem sumber yang tidak disertakan.

## Dokumen dipertimbangkan namun TIDAK dipilih (agar tidak over-claim / dokumen pinggiran)
- `Standar Manajemen Identitas dan Akun v1.3.md` (A.5.16) — pengelolaan identitas/akun generik; kontrol berikutnya, bukan jawaban langsung butir A.5.15.
- `Standar Hak Akses Istimewa v1.1.md` (A.8.2) — kebijakan akses istimewa; sudah terwakili oleh daftar akun istimewa yang dipilih, dokumen ini milik kontrol A.8.2.
- `Prosedur Kerja dan Kunjungan Area Aman (Ruang Server) v1.0.md` (A.7.6) — aturan kunjungan/kerja di area aman; operasional A.7.6, bukan penetapan hak akses.
- `Denah Zona Keamanan Fisik Kantor Jakarta dan Makassar v1.1.md` — tata letak zona; tidak menetapkan hak akses.
- `Kebijakan Kata Sandi dan Manajemen Kredensial v2.0.md` (A.5.17), `Matriks Pemisahan Tugas dan Contoh Transaksi 2026.csv` (A.5.3), `Rekap Exit Clearance 2026.csv` — kontrol terkait (kredensial, SoD, pencabutan saat terminasi) tetapi bukan jawaban butir A.5.15.
- `Hasil Spot Check Clear Desk Q3-2026.md`, `Kebijakan Clear Desk dan Clear Screen v1.2.md` — kontrol pendukung lingkungan kerja, tidak diminta butir ini.

## Status
- Item A.5.15 → `dikumpulkan` (**7 dokumen**). Keterbatasan butir 1 & 3 dicatat jujur di atas untuk penilaian Auditor (FASE 5).
- Rilis menunggu keputusan manusia di dashboard `#approvals` (item outbox `release` milik network-user). Tidak ada dokumen yang dibuat/diubah; semua salinan byte-identik.
