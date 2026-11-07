# LAPORAN INSIDEN INC-2026-013 - PHISHING "INVOICE PALSU"
**Kontrol**: A.5.26 | **Prioritas**: P2 | **Status**: CLOSED | **Klasifikasi**: Internal

- Terdetifikasi: 9 September 2026, 08:52 WIB (dilaporkan karyawan Pengadaan - lihat A.6.8)
- Penanggung jawab: Fajar Hidayat (IT Security) | Terakhir diperbarui: 11 September 2026

## Kronologi
| Waktu | Kejadian |
|---|---|
| 08:52 | 3 laporan karyawan: email "invoice overdue" dari domain mirip vendor |
| 09:05 | Gateway: domain pengirim diblokir global; sampel diaman-kan di sandbox |
| 09:30 | Identifikasi 9 penerima email di divisi Pengadaan & Keuangan |
| 10:10 | 2 karyawan klik tautan; halaman phishing berjalan; TIDAK ada kredensial terkirim (form diblokir sebelum submit oleh filter) |
| 10:15 | Uji coba: token sesi & password kedua klik aman; reset kata sandi preventif 2 akun |
| 11:00 | IOC diblokir di firewall & gateway (lihat laporan intel A.5.7) |
| 13:30 | Pengumuman internal waspada + cara lapor |
| 11 Sep | Status closed; edukasi ulang singkat divisi terdampak |

## Dampak
Tidak ada kebocoran data terkonfirmasi; tidak ada akses tidak sah ke sistem.
