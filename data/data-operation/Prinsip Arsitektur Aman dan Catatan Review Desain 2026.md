# PRINSIP ARSITEKTUR AMAN & CATATAN REVIEW DESAIN - 2026
**Kontrol**: A.8.27 | **Owner**: Bagus Nugroho (Dev) + Rina Kartika (Infra) | **Klasifikasi**: Internal

## Prinsip yang ditetapkan (Standar Arsitektur Aman v1.0, Jan 2026)
1. Secure by design: validasi input di server-side; output encoding default.
2. Least privilege antar-komponen: app->DB memakai akun khusus read/write terbatas; TIDAK ada akun aplikasi dengan akses admin DB.
3. Defense in depth: DMZ -> app -> DB berlapis (A.8.22); TIDAK ada akses langsung internet->DB.
4. Fail secure: error tidak membocorkan stack/detail; state gagal menolak akses.
5. Logging & keterlacakan: tindakan sensitif tercatat (A.8.15).
6. Tidak ada rahasia di kode (lihat A.8.4 secret-detection).

## Catatan review desain 2026 (2 terakhir)
1. 26 Aug 2026 - modul pembayaran portal R2.4: diputuskan tokenisasi nomor tagihan; penolakan akses DB langsung dari DMZ; review oleh IT Security - LOLOS dengan 1 catatan (timeout sesi, lihat A.8.26 SEC-01).
2. 7 Apr 2026 - integrasi e-proc ke SAP: kredensial via vault, bukan hardcode; antrean retry memakai akun service tanpa login interaktif (A.5.16) - LOLOS.
