# RINGKASAN MANAJEMEN KERENTANAN - Q3 2026
**Kontrol**: A.8.8 | **Owner**: Rina Kartika & IT Ops | **Klasifikasi**: Internal

- Pemindaian: kuartalan penuh + pemindaian target pasca-patch | Alat: scanner VA terstandar + advisory vendor

## Hasil pemindaian Q3 (Sept 2026)
| Tingkat | Jumlah | SLA perbaikan | Status per 28 Okt |
|---|---|---|---|
| Kritis | 0 | 7 hari | - |
| Tinggi | 2 | 30 hari | 2 selesai (patched 6 & 11 Okt) |
| Sedang | 7 | 60 hari | 4 selesai, 3 berjalan (target 20 Nov) |
| Rendah | 9 | 90 hari | 5 selesai, 4 terjadwal |

## Sumber kerentanan lain yang diproses
1. Advisory perangkat jaringan vendor (Okt 2026) - dievaluasi, NDP tidak terdampak versi rentan (tiket TKT-2026-10-002, lihat A.5.25).
2. Umpan intelijen ancaman (A.5.7) - IOC dipetakan ke kerentanan terkait.

## Pengujian penetrasi
- Pentest eksternal Juni 2026 oleh PT Siber Aman Nusantara (file terpisah); rekomendasi sedang dieksekusi.
- Pentest berikutnya: terjadwal Q2 2027 (tahunan).

SLA tercantum di SOP Manajemen Kerentanan v1.2 (2025): kritis 7 hari / tinggi 30 / sedang 60 / rendah 90.
