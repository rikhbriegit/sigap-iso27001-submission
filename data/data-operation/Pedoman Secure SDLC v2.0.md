# PEDOMAN SECURE SDLC - v2.0
**Kontrol**: A.8.25 | **Owner**: Bagus Nugroho (Dev Lead) | **Klasifikasi**: Internal

- Kode: NDP-DEV-STD-25 | Efektif: 1 Februari 2026 | Berlaku seluruh pengembangan (100% tim internal - lihat justifikasi A.8.30)

## Tahap & gerbang keamanan
1. REQUIREMENTS: kebutuhan keamanan ditulis bersama bisnis (template A.8.26); data yang diproses dipetakan klasifikasinya (A.5.12).
2. DESIGN: prinsip arsitektur aman (A.8.27) + kajian desain untuk modul sensitif; approval IT Security.
3. CODE: pedoman secure coding (A.8.28); peer review wajib (2 reviewer untuk modul sensitif - A.8.4).
4. BUILD/CI: SAST + dependency scan (SCA) otomatis per merge request; temuan high memblokir merge.
5. TEST: test case keamanan di QA/UAT (A.8.29); snapshot data uji hanya hasil masking (A.8.11).
6. RELEASE: deploy oleh IT Ops via pipeline (pemisahan tugas A.5.3; manajemen perubahan A.8.32); konfigurasi sesuai baseline (A.8.9).
7. OPERASI: pemantauan log aplikasi masuk SIEM (A.8.15); kerentanan dikelola (A.8.8).

Komponen open source: hanya dari repo resmi + hasil SCA; daftar & lisensi dikelola (lihat A.5.32, A.5.21).
