# PROSEDUR DATA PENGUJIAN & PROTEKSINYA - v1.1
**Kontrol**: A.8.33 | **Owner**: Bagus Nugroho (Dev) + QA | **Klasifikasi**: Internal

- Kode: NDP-DEV-PRO-833 | Efektif: 1 Mei 2026

## Ketentuan
1. Data pengujian WAJIB: (a) data sintetis/dummy, atau (b) snapshot produksi yang sudah lewat pipeline masking (A.8.11) - tidak ada data produksi mentah di test.
2. Snapshot masked di-refresh kuartal; lama snapshot dihapus setelah refresh (log penghapusan A.8.10).
3. Data pengujian BERLABEL "TEST - DATA FIKSI" pada tampilan aplikasi staging agar tidak tertukar produksi.
4. Akses lingkungan test: hanya tim dev/QA + reviewer; TIDAK bisa diakses dari jaringan publik (A.8.31).
5. Hasil pengujian/laporan TIDAK boleh memuat data pribadi nyata (screenshot staging otomatis memuat data dummy).
6. Audit kepatuhan data uji: semesteran (terakhir Sep 2026 - 1 temuan minor: file dump lama di share dev; langsung dihapus & dicatat).
