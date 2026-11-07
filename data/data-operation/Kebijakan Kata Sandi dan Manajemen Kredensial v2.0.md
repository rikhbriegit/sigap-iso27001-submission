# KEBIJAKAN KATA SANDI DAN MANAJEMEN KREDENSIAL - v2.0
**Kontrol**: A.5.17 | **Owner**: IT Security | **Klasifikasi**: Internal

- Kode: NDP-KBL-017 | Efektif: 9 Februari 2026

## Kata sandi pengguna
- Minimal 12 karakter; dilarang 50 kata sandi umum (blocklist internal); tidak wajib rotasi berkala untuk pengguna akhir namun WAJIB ganda saat ada indikasi bocor.
- Penyimpanan hanya di password manager yang disetujui (lisensi korporat untuk staf IT & posisi sensitif).

## Kredensial istimewa
- Rotasi 90 hari; akun admin terpisah dari akun harian (lihat A.8.2); kredensial di vault PAM.
- Kunci SSH/kunci API disimpan terenkripsi; pencabutan otomatis saat pemegang resign.

## Reset & pemulihan
- Reset hanya via helpdesk dengan verifikasi identitas (callback ke nomor kantor) atau self-service dengan MFA.
- MFA wajib: VPN, email, SAP, aplikasi keuangan (lihat A.8.5).
