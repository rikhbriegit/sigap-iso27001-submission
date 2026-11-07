# RENCANA SEGMENTASI JARINGAN (VLAN) - 2026
**Kontrol**: A.8.22 | **Owner**: IT Ops | **Klasifikasi**: Rahasia

## Pemetaan VLAN (ringkas)
| VLAN | Zona | Penghuni | Akses lintas zona |
|---|---|---|---|
| 10 | Server produksi (JKT) | App server, DB | Hanya dari DMZ-proxy & bastion |
| 20 | Kantor JKT | Endpoint karyawan | Ke server hanya via port aplikasi resmi; internet via proxy (A.8.23) |
| 30 | WiFi Tamu | Perangkat tamu | INTERNET SAJA; terisolasi penuh dari internal (VLAN 10/20/40/50) |
| 40 | VOIP | IP phone | Terpisah; QoS |
| 50 | Manajemen IT (mgmt) | Bastion, NTP, patch, console perangkat | Dari Zona IT mgmt saja; akses admin via bastion (A.8.2) |
| 60 | Kantor Makassar (WAN) | Endpoint cabang | Rute ke server via MPLS dengan policy sama seperti VLAN 20 |
| DMZ | DMZ | Reverse proxy portal | Hanya 443 ke VLAN 10 app node |

## Pemisahan layanan sensitif
- Portal pelanggan (publik) TIDAK berbagi subnet dengan internal; koneksi DB internal dari DMZ hanya port yang ditentukan.
- Server backup & SIEM di VLAN 10 dengan aturan ketat (hanya bastion & aplikasi sumber log).
- Gudang perangkat Mks (scan gun) di VLAN terpisah 70 (hanya aplikasi gudang).

Implementasi diverifikasi via diagram & audit aturan (review firewall A.8.20, Q3: sesuai denah).
