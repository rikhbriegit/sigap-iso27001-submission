# KAJIAN KEAMANAN PROYEK - PORTAL PEMBAYARAN PELANGGAN
**Kontrol**: A.5.8 | **Gate**: akhir fase desain | **Klasifikasi**: Rahasia

- Proyek: tambah modul pembayaran tagihan di portal pelanggan (release 2.4)
- Tanggal kajian: 8 September 2026 | Penilai: Fajar Hidayat (IT Security) | Dev Lead: Bagus Nugroho

## Risiko teridentifikasi & mitigasi disepakati
| Risiko | Tingkat | Mitigasi |
|---|---|---|
| Kebocoran data transaksi | Tinggi | TLS 1.2+, tokenisasi nomor tagihan, audit trail |
| Brute force login pelanggan | Sedang | Rate limit 5x/menit/IP + CAPTCHA setelah 3 gagal (lihat A.8.26) |
| Penyalahgunaan akses internal | Sedang | Pemisahan maker-checker, log akses data sensitif (A.8.15) |

## Keputusan gerbang
LOLOS dengan syarat: hasil pengujian keamanan pra-go-live diserahkan sebelum rilis (terverifikasi Okt 2026 - lihat A.8.29).
