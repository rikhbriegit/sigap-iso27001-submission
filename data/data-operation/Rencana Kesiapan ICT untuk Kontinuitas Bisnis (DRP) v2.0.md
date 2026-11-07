# RENCANA KESIAPAN ICT UNTUK KONTINUITAS BISNIS (DRP) - v2.0
**Kontrol**: A.5.30 | **Owner**: Andi Pratama (IT Ops) | **Klasifikasi**: Rahasia

- Kode: NDP-BCM-DRP-030 | Efektif: 15 Juni 2026 | Disetujui: CISO & Direksi IT

## Target pemulihan per sistem (dari BIA 2026)
| Sistem | RTO | RPO | Strategi |
|---|---|---|---|
| Portal pelanggan | 4 jam | 15 menit | HA 2 node + replikasi DB (lihat A.8.14) |
| SAP | 8 jam | 24 jam | Backup harian + server standby dingin |
| HRIS & e-proc | 8 jam | 24 jam | Backup harian + restore ke VM cadangan |
| File server utama | 4 jam | 24 jam | Backup harian + salinan offsite Makassar |
| Email & kolaborasi | 2 jam | 1 jam | Layanan cloud (SaaS) - SRD provider |

## Pengujian
- Uji failover teknis terakhir: 14 Mei 2026 (portal & file server) - LOLOS (detail lihat A.8.14).
- Tabletop ransomware: 20 Agustus 2026 (lihat A.5.24).
- Uji pemulihan penuh berikutnya: terjadwal Q1 2027 (setelah audit fase 1).
- Catatan: uji restore data rutin TERPISAH dari DRP - lihat kontrol A.8.13 untuk catatan keterlambatan.
