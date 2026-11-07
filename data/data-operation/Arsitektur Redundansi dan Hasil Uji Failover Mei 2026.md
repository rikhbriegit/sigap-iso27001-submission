# ARSITEKTUR REDUNDANSI & HASIL UJI FAILOVER - 14 MEI 2026
**Kontrol**: A.8.14 | **Owner**: Andi Pratama & Rina Kartika | **Klasifikasi**: Internal

## Arsitektur kritis
| Sistem | Redundansi | RTO target | Teruji |
|---|---|---|---|
| Portal pelanggan | 2 node app (portal-app-01/02) behind load balancer; DB replikasi | 4 jam | Ya - 14 Mei 2026 |
| SAP | Server standby dingin + backup harian | 8 jam | Sebagian (restore level data, lihat A.8.13) |
| Email & kolaborasi | Redundansi provider (SaaS SLA) | 2 jam | Laporan SLA provider Q3 100% |
| Jaringan kantor | Dual ISP (PT Jaring Andalan + TelkomArea) | - | Failover ISP diuji 14 Mei (OK 40 detik) |

## Uji failover 14 Mei 2026 (portal & infra pendukung)
1. Skenario: node-1 portal dimatikan (simulasi gagal hardware) + jalur ISP primer diputus.
2. Hasil: traffic pindah otomatis ke node-2; waktu cutover 4 MENIT (termasuk drain koneksi lama) - RTO 4 jam TERPENUHI jauh di bawah target.
3. ISP failover: 40 detik; sesi VPN re-dial otomatis.
4. Temuan: satu notifikasi health-check terlambat (alarm 90 detik) - penyebab: nilai interval; dikoreksi 15 Mei (CHG-2026-0521).
5. Berita acara uji disetujui CISO 20 Mei 2026; uji berikutnya terjadwal Q1 2027.

Catatan: pengujian PEMULIHAN DATA (restore) terpisah - status terakhir di A.8.13.
