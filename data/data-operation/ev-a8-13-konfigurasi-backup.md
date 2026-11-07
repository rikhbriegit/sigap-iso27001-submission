# KONFIGURASI BACKUP & UJI PEMULIHAN
**Kontrol**: A.8.13 | **Owner**: Andi Pratama (IT Operations) | **Data per**: 27 Oktober 2026

## Kebijakan & konfigurasi
- Backup harian otomatis (22:30 WIB): SAP DB, HRIS DB, file server utama, konfigurasi jaringan
- Retensi: 30 hari (harian), 12 bulan (mingguan)
- Salinan offsite: weekly ke fasilitas cabang Makassar (transfer terenkripsi)
- Monitoring: notifikasi gagal backup otomatis ke tim IT (dashboard NOC)

## Riwayat keberhasilan
- Tingkat keberhasilan backup 90 hari terakhir: 99,2% (2 kegagalan, keduanya selesai manual keesokan hari)
- Kapasitas penyimpanan ditambah Oktober 2026 (lihat chat Rina Kartika 27 Okt)

## Uji restore (RESTORATION TEST)
- Uji restore terakhir: 14 AGUSTUS 2025 (14 bulan lalu) — hasil: SAP DB & file server berhasil dipulihkan ke lingkungan uji
- Uji restore berikutnya: BELUM DITENTUKAN (tidak ada jadwal tercatat)
- Catatan: SOP Backup v1.1 (2024) mensyaratkan uji restore minimal 2x per tahun → TIDAK TEPAT WAKTU
