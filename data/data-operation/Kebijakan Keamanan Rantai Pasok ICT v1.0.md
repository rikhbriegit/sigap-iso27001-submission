# KEBIJAKAN KEAMANAN RANTAI PASOK ICT - v1.0
**Kontrol**: A.5.21 | **Owner**: Andi Pratama (IT Ops) | **Klasifikasi**: Internal

- Kode: NDP-KBL-021 | Efektif: 15 Maret 2026

## Ketentuan
1. Perangkat keras hanya dari distributor resmi/pemasok tersertifikasi (anti grey market); keaslian diverifikasi saat terima (serial + garansi).
2. Perangkat lunak & komponen open source: hanya dari sumber resmi/repo internal mirror; dependency pihak ketiga dipindai kerentanannya (SCA) sebelum dipakai (lihat A.8.8/A.8.25).
3. Rantai pasok layanan cloud mengikuti Kebijakan Cloud v2.1 (lihat A.5.23) - assesmen risiko per layanan.
4. Perangkat dari pemasok WAJIB masuk inventaris dan baseline hardening sebelum masuk produksi (A.5.9, A.8.9).
5. Kerentanan pemasok (advisory vendor, mis. firewall/OS) dipantau dan dikelola di manajemen kerentanan.
6. Risiko rantai pasok dibahas saat review layanan pemasok (lihat A.5.22) dan komite keamanan.
