# JADWAL RETENSI & LOG PENGHAPUSAN INFORMASI - Q3 2026
**Kontrol**: A.8.10 | **Owner**: owner data per kategori (rekap: IT Security) | **Klasifikasi**: Internal

- Jadwal retensi induk: Standar Retensi Catatan v1.2 (lihat A.5.33)

## Penghapusan terjadwal yang dieksekusi Q3-2026
| Tanggal | Data dihapus | Dasar (retensi) | Metode | Verifikasi |
|---|---|---|---|---|
| 31 Jul 2026 | Data pelamar rekrutmen 2023 (bukan karyawan) | 2 tahun pasca proses | Hapus permanen HRIS + log | Screenshot audit HRIS; disaksikan HR staff |
| 31 Jul 2026 | Salinan laporan keuangan scratch di file server 2022 | 10 tahun versi final tetap disimpan; draft 4 tahun | Penghapusan tercatat + empty recycle | Log tiket OPS-3390 |
| 15 Agu 2026 | Sandbox pengujian pentest Juni (lingkungan uji + data dummy) | Setelah laporan final diterima & disetujui | Teardown VM + hapus snapshot | Konfirmasi vendor & IT Ops |
| 30 Sep 2026 | Video CCTV melewati retensi 30 hari | Otomatis (kebijakan A.7.4) | Auto-purge NVR | Laporan sistem NVR |

Ketentuan: penghapusan data pribadi mencatat dasar pemrosesan (UU PDP); penghapusan atas permintaan subyek data dievaluasi DPO terpisah (lihat A.5.34).
