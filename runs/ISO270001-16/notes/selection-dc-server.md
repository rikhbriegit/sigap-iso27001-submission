# Selection — dc-server (A.8.13 Backup informasi) — RUN ISO270001-16

Pemilik bukti: Staff Data Center & Server (id `dc-server`), pic_kontak `c03` (Andi Pratama).
Sumber: `G:/My Drive/Hackathon_Tencent/Data-Operation` (read-only, diverifikasi manifest `simulation/data-operation-manifest.json`).
Target kerja: `G:/My Drive/Hackathon_Tencent/IT Operation/Data Center & Server`.

## Pecahan `bukti_diminta` → butir
Item **A.8.13 — Backup informasi**, bukti_diminta:
1. Konfigurasi backup (jadwal, retensi, jenis full/incremental, lokasi)
2. Hasil uji restore (backup test report) dalam 12 bulan terakhir
3. Bukti enkripsi media backup bila berada di luar lokasi

## Dokumen terpilih (disalin byte-identik lewat `tools/evidence.js collect`)
- **`ev-a8-13-konfigurasi-backup.md`** — satu-satunya dokumen A.8.13 di Data-Operation; memuat seksi Konfigurasi, Riwayat keberhasilan, dan Uji restore (RESTORATION TEST). Dipetakan ke ketiga butir:
  - **Butir 1**: jadwal harian otomatis 22:30 WIB (SAP DB, HRIS DB, file server utama, konfigurasi jaringan), retensi 30 hari harian + 12 bulan mingguan, salinan offsite mingguan ke fasilitas cabang Makassar. *Catatan jujur:* jenis backup (full/incremental/differential) tidak dinyatakan eksplisit.
  - **Butir 2**: uji restore terakhir 14 AGUSTUS 2025 (14 bulan lalu), SAP DB & file server berhasil dipulihkan ke lingkungan uji; berikutnya belum ditentukan. *Catatan jujur:* di luar jendela 12 bulan yang diminta dan melanggar SOP Backup v1.1 (minimal 2x/tahun) → **GAP**. Tidak ada laporan uji restore terpisah dalam 12 bulan di Data-Operation.
  - **Butir 3**: salinan offsite mingguan ke Makassar via **transfer terenkripsi** (enkripsi tahap transport). *Catatan jujur:* enkripsi media backup pada saat di-rest (at-rest) di luar lokasi TIDAK disebutkan eksplisit; tidak ada dokumen lain di Data-Operation yang membuktikannya → **GAP kedua**.

## Dokumen dipertimbangkan namun TIDAK dipilih (agar seleksi proporsional, tanpa dokumen pinggiran)
- `Register Media Penyimpanan dan SOP Pengelolaannya v1.2.md` (A.7.10): menyebut "Media tape backup offsite … (lihat A.8.13)" dan tas terkunci, tetapi tidak membuktikan enkripsi media at-rest; bukan bukti langsung enkripsi → tidak diambil.
- `Rencana Kesiapan ICT untuk Kontinuitas Bisnis (DRP) v2.0` (A.5.30): memuat strategi backup/RPO, namun milik A.5.30; eksplisit menyatakan uji restore rutin terpisah dari DRP dan merujuk A.8.13 → tidak diambil (hindari tumpang tindih).
- `Prosedur Keamanan Aset di Luar Lokasi Kantor v1.1` (A.7.9): umum untuk aset offsite, bukan media backup spesifik → tidak diambil.

Semua kekurangan disajikan terbuka; tidak ada dokumen relevan yang disembunyikan.
