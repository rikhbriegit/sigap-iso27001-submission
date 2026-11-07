# STANDAR HAK AKSES ISTIMEWA - v1.1
**Kontrol**: A.8.2 | **Owner**: Rina Kartika (IT Infra) | **Klasifikasi**: Internal

- Kode: NDP-IS-STD-802 | Efektif: 1 Maret 2026

## Prinsip
1. Akses istimewa (admin server, admin jaringan, admin aplikasi, DBA) hanya untuk peran yang tercatat; akun admin TERPISAH dari akun kerja harian (prefix adm-).
2. Seluruh sesi administratif produksi WAJIB melalui bastion host (bastion-01): MFA + perekaman sesi aktif.
3. Akun break-glass darurat: 2 akun tersegel (enkripsi kredensial, akses via double approval CISO+IT Ops); pemakaian memicu alarm & review pasca (lihat A.5.29).
4. Rotasi kredensial istimewa 90 hari (vault PAM); akun layanan (service account) tanpa login interaktif (A.5.16).
5. Review daftar akun istimewa: kuartalan bersama review hak akses (lihat A.5.18; kuartalan per pengumuman HR Okt 2026).
