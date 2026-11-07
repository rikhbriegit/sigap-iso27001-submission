# HASIL LATIHAN TABLETOP - SKENARIO RANSOMWARE
**Kontrol**: A.5.24 | **Tanggal**: 20 Agustus 2026, 09:00-12:00 WIB | **Klasifikasi**: Internal

- Peserta: tim respons insiden (ITSO, IT Ops, IT Infra, Legal, HR, perwakilan cabang via video)
- Skenario: laptop staf keuangan terinfeksi ransomware via lampiran email; enkripsi file share berjalan cepat.

## Hasil positif
1. Deteksi & isolasi endpoint oleh EDR disimulasikan benar (auto-isolate aktif - lihat A.8.7).
2. Keputusan memutus share file server & memulihkan dari backup harian sesuai SOP backup (A.8.13).
3. Komunikasi ke manajemen & jalur eskalasi berjalan sesuai tabel P1.

## Temuan & rencana perbaikan
1. Estimasi waktu pemulihan file share besar belum terdokumentasi rinci - tindak lanjut: dokumentasikan runbook pemulihan per sistem (PIC: Andi Pratama, target Okt 2026).
2. Koordinasi jam kerja cabang Makassar (WITA) perlu ditegaskan di daftar kontak - sudah diperbarui.
