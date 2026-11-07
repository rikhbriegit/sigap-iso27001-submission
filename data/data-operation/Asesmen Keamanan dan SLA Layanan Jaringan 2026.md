# ASESMEN KEAMANAN & SLA LAYANAN JARINGAN - 2026
**Kontrol**: A.8.21 | **Owner**: IT Ops | **Klasifikasi**: Internal

## Layanan jaringan yang digunakan
| Layanan | Penyedia | SLA | Ketentuan keamanan dalam perjanjian |
|---|---|---|---|
| Internet primer + IP publik | PT Jaring Andalan Indonesia | 99,7% uptime; MTTR 4 jam | Monitoring 24/7, notifikasi gangguan 30 menit, larangan mengubah rute tanpa persetujuan |
| Fiber & internet sekunder | TelkomArea | 99,5% uptime | Teknisi masuk lokasi wajib koordinasi & pendampingan (lihat A.7.2); larangan intercept trafik pelanggan |
| SD-WAN/link JKT-MKS | Provider terkontrak (MPLS L3VPN) | 99,5% | Isolasi VPN rute; jaminan tidak dibagikan VLAN pelanggan lain; audit tahunan |

## Asesmen keamanan layanan (ringkas, terakhir: April 2026)
1. Sertifikasi keamanan penyedia diverifikasi (ISO 27001 provider utama - salinan sertifikat diterima).
2. Enkripsi lintas provider: trafik sensitif JKT-MKS tetap dienkripsi application/IPsec di atas MPLS (defence in depth - lihat A.8.24 untuk standar kriptografi).
3. Kewajiban notifikasi insiden penyedia: maksimal 24 jam; termuat dalam kontrak (template A.5.20).
4. Capaian SLA Q3-2026: primer 99,95%, sekunder 99,88% (lihat rekap A.5.22).
