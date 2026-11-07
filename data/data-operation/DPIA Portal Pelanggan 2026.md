# DPIA - PORTAL PELANGGAN (PEMBAHARUAN MODUL LAYANAN)
**Kontrol**: A.5.34 | **Owner**: Dewi Lestari (DPO) | **Klasifikasi**: Rahasia

- Tanggal: 12 Mei 2026 | Review berikutnya: Mei 2027 atau saat perubahan material

## Ringkasan pemrosesan
- Data pribadi pelanggan: nama, email, nomor tagihan, alamat layanan; tujuan: pelayanan & penagihan.
- Dasar pemrosesan: pelaksanaan kontrak; pemberitahuan privasi diperbarui Maret 2026 (versi publik di portal).

## Risiko & mitigasi
| Risiko | Tingkat | Mitigasi |
|---|---|---|
| Akses internal tanpa keperluan | Sedang | RBAC + log akses data sensitif (A.8.3, A.8.15) |
| Kebocoran saat transfer ke sistem tagihan | Sedang | sFTP terenkripsi per perjanjian (A.5.14) |
| Pengumpulan berlebihan | Rendah | Formulir hanya data yang diperlukan |

## Keputusan
DPIA lolos; pemrosesan dapat dilanjutkan dengan mitigasi aktif; tanpa transfer data pribadi ke luar negeri.
