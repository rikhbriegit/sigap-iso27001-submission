# PEDOMAN SECURE CODING - v1.1
**Kontrol**: A.8.28 | **Owner**: Bagus Nugroho (Dev Lead) | **Klasifikasi**: Internal

- Kode: NDP-DEV-STD-28 | Efektif: 1 Desember 2025 | Acuan: OWASP Top 10 + ASVS L1

## Aturan inti (ringkas)
1. Input: validasi whitelist di server; parameterized query WAJIB (no string concat SQL); TIDAK ada eksekusi shell dengan input mentah.
2. Output: encoding kontekstual (HTML/JS/URL); template engine auto-escape default.
3. Autentikasi/sesi: password hashing bcrypt/argon2; token sesi httpOnly+secure+SameSite.
4. Kriptografi: ikuti Standar Kriptografi v1.0 (algoritma & panjang kunci resmi); JANGAN buat kripto sendiri (lihat A.8.24).
5. Secret: TIDAK di kode/config repo (vault CI); detektor secret aktif di pipeline.
6. Error handling: log teknis internal; pesan pengguna generik.
7. Dependency: library dari repo resmi; versi tidak ditinggalkan (SCA - A.8.25).
8. Fungsi terlarang: eval, exec, deserialization tidak aman, md5/sha1 untuk keamanan.

Pelatihan onboarding dev: modul secure coding wajib (tercantum di program pelatihan; rekaman pelaksanaan di HR).
