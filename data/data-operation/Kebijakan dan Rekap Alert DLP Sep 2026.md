# KEBIJAKAN & REKAP ALERT DLP - SEPTEMBER 2026
**Kontrol**: A.8.12 | **Owner**: IT Security (kebijakan) + IT Ops (operasional) | **Klasifikasi**: Internal

- Kebijakan DLP v1.2 (efektif Mar 2026), terpasang di email gateway, proxy, dan endpoint

## Kanal terpantau & aturan
| Kanal | Aturan utama | Aksi |
|---|---|---|
| Email keluar | Lampiran berlabel Rahasia/Sangat dibatasi; pola NIK/rekening/nomor tagihan | Blokir + tawarkan tautan aman (A.5.14) |
| Upload web | Kategori penyimpanan file publik & bentuk data sensitif | Blokir + alert |
| USB | Tulis media non-terdaftar | Blokir (register A.7.10) |
| Cetak | Cetak massal data pelanggan | Alert ke atasan |

## Rekap alert September 2026
- Total alert: 12
- False positive: 10 (laporan resmi berisi nomor tagihan klien diizinkan lewat kanal sFTP - di-whitelist kasus)
- True positive: 2:
  1. Staf mencoba kirim rekap klien ke email pribadi - DIBLOKIR; coaching + teguran lisan (A.6.4 catatan)
  2. Upload besar dokumen ke layanan cloud pribadi - DIBLOKIR; diarahkan ke kanal resmi (A.5.14)
- Rata-rata waktu triage alert: < 4 jam (masuk event management A.5.25)
