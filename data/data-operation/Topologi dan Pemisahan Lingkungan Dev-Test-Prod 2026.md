# TOPOLOGI & PEMISAHAN LINGKUNGAN DEV-TEST-PROD - 2026
**Kontrol**: A.8.31 | **Owner**: Bagus Nugroho & IT Ops | **Klasifikasi**: Rahasia

## Lingkungan
| Lingkungan | Subnet/host | Data | Akses | Deploy |
|---|---|---|---|---|
| Development | VLAN dev (80) - VM dev internal | Data dummy & snapshot MASKED (A.8.11) | Tim dev (12 engineer) | Bebas (pipeline dev) |
| Test/QA & staging | VLAN 80 (host staging) | Snapshot masked, refresh kuartal | QA + dev + reviewer UAT | Pipeline QA (otomatis) |
| Produksi | VLAN 10 (lihat A.8.22) | Data produksi NYATA | Hanya operator & akun teknis | HANYA IT Ops via pipeline rilis (A.5.3, A.8.32) |

## Kontrol pemisahan
1. Secara JARINGAN: VLAN terpisah + firewall antar zona; dev TIDAK bisa rute ke produksi.
2. Secara AKSES: kredensial produksi tidak dipegang dev (bastion - A.8.2); dev log-in bastion tidak ada.
3. Secara DATA: dilarang menyalin data produksi ke dev/test (verifikasi sampling audit Sep 2026: bersih; 1 temuan minor 2025 tertutup).
4. Secama PROSES: gate rilis (UAT keamanan A.8.29, approval perubahan A.8.32).
