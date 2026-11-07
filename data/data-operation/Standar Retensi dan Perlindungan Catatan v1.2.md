# STANDAR RETENSI DAN PERLINDUNGAN CATATAN - v1.2
**Kontrol**: A.5.33 | **Owner**: Legal & IT Security | **Klasifikasi**: Internal

- Kode: NDP-LEG-STD-033 | Efektif: 1 Agustus 2025

## Jadwal retensi (ringkas)
| Jenis catatan | Retensi | Penyimpanan |
|---|---|---|
| Keuangan & pajak | 10 tahun | SAP + arsip fisik ruang terkunci |
| Data SDM (kontrak, NDA, pelatihan) | 5 tahun pasca terminasi | HRIS + arsip HR |
| Catatan pelamar | 2 tahun pasca proses | HRIS (auto-purge) |
| Kontrak vendor & pelanggan | 10 tahun pasca selesai | Arsip Legal |
| Log keamanan | 180 hari hot + 1 tahun arsip (WORM) | SIEM (lihat A.8.15) |
| Dokumen insiden keamanan | 5 tahun | Berkas kasus IT Security |
| Dokumen proyek | 7 tahun pasca tutup | File server terstruktur |

## Perlindungan
1. Catatan dilindungi dari kehilangan, pemalsuan, dan akses tidak sah: arsip digital WORM/tulis-sekali; arsip fisik ruang terkunci dengan daftar akses (lihat A.7.3).
2. Penghapusan catatan hanya sesuai jadwal (lihat A.8.10) dan butuh persetujuan owner kategori.
3. Pemalsuan dicegah: sistem catatan keuangan tidak dapat diedit manual (audit trail SAP aktif).
