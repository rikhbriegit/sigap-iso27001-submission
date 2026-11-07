# PROSEDUR DATA MASKING LINGKUNGAN DEV-TEST - v1.2
**Kontrol**: A.8.11 | **Owner**: Bagus Nugroho (Dev) & IT Security | **Klasifikasi**: Internal

- Kode: NDP-DEV-PRO-811 | Efektif: 1 Mei 2026

## Ketentuan
1. LINGKUNGAN DEV/TEST DILARANG memakai data produksi apa pun.
2. Sumber data uji WAJIB salah satu:
   - Data sintetis/dummy (generator; dataset dummy standar per modul)
   - Snapshot produksi yang sudah DI-MASK (pipeline masking otomatis: nama, NIK, email, telepon, rekening, alamat diganti dummy; hash konsisten untuk relasi)
3. Pipeline masking dijalankan kuartal (refresh terakhir: 28 Sep 2026); log masking menyimpan jumlah baris & aturan.
4. Verifikasi sampel pasca-masking oleh QA + IT Security (5 record acak per tabel sensitif) sebelum snapshot boleh dipakai.

## Contoh hasil masking (kolom data pribadi)
| Kolom | Nilai produksi (contoh fiktif) | Nilai di dev-test |
|---|---|---|
| Nama | Andi Pratama | Pengguna Test 0847 |
| NIK | 3271010101900001 | 9000000000000042 |
| Telepon | 0812-3456-7890 | 0812-0000-0042 |
| Email | budi.santoso@ndp-fiction.example | user0847@test.ndp-fiction.example |

Catatan audit Sep 2026: 1 temuan minor (kamus masking tertinggal di share dev seminggu) - ditutup dengan pemindahan ke vault.
