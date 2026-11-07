# KEBIJAKAN AKSES KODE SUMBER & BRANCH PROTECTION - 2026
**Kontrol**: A.8.4 | **Owner**: Bagus Nugroho (Dev Lead) | **Klasifikasi**: Internal

- Repo: gitlab-01 self-hosted (GitLab Community Edition - lihat A.5.32) | Kode produksi portal, HRIS-tools internal, e-proc integration

## Ketentuan
1. Akses repo: hanya tim pengembangan internal (12 engineer) + IT Security (read-only untuk audit); akses via akun unik + MFA (A.8.5).
2. Branch utama (main) PROTECTED: tidak ada push langsung; wajib merge request dengan minimal 1 peer review (modul sensitif: 2 reviewer).
3. Merge request yang menyentuh autentikasi/pembayaran: review tambahan IT Security (security checklist).
4. CI/CD: pipeline menjalankan SAST + dependency scan tiap merge request (hasil ringkas di A.8.28); deploy ke produksi hanya oleh IT Ops via pipeline (dev tidak bisa deploy - lihat A.5.3).
5. Kredensial/rahasia TIDAK boleh di repo: secret di vault CI; linter secret-detection aktif; temuan = MR diblokir.
6. Hak akses repo dicabut saat mutasi/terminasi (bersama akses lain, lihat A.5.11).
