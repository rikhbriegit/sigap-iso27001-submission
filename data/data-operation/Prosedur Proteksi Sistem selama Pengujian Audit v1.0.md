# PROSEDUR PROTEKSI SISTEM INFORMASI SELAMA PENGUJIAN AUDIT - v1.0
**Kontrol**: A.8.34 | **Owner**: Fajar Hidayat (IT Security) | **Klasifikasi**: Internal

- Efektif: 1 Juli 2026 | Diterapkan untuk: audit internal, audit sertifikasi (Des 2026), audit BPKP/otsider

## Ketentuan
1. Kesepakatan SCOPE audit tertulis sebelum pengujian: sistem mana boleh diperiksa, metode, jadwal, penanggung jawab.
2. Akses auditor: READ-ONLY; akun auditor terpisah + tercatat; TIDAK ada kredensial operator yang dipinjamkan.
3. Pengujian yang berpotensi membebani sistem (scan, query besar) dijalankan DI LUAR jam sibuk dengan persetujuan owner sistem + pemantauan NOC.
4. Auditor dilarang: mengekstrak data produksi mentah; hasil pemeriksaan disajikan ter-mask/di-ringkas (A.8.11); bila butuh sampel data - via pendampingan IT Security.
5. Perubahan apapun di sistem SELAMA pengujian dilarang (freeze change di lingkup audit; daftar CHG dicek - A.8.32).
6. Rencana pemulihan/fallback bila pengujian mengganggu layanan (kontak NOC + P3 insiden).
7. Bukti praktik: observasi audit BPKP di cabang Makassar 15 Okt 2026 berjalan dengan escort & scope agreement (lihat log pengunjung A.7.2).
