# DENAH PENEMPATAN PERANGKAT - RUANG SERVER JAKARTA (DC MINI)
**Kontrol**: A.7.8 | **Owner**: Andi Pratama & Facilities | **Klasifikasi**: Rahasia

- Diperbarui: 20 Agustus 2026 (setelah penataan rak ulang)

## Tata letak
- Rak A (42U): server produksi (sap-prod-01, hris-prod-01, eproc-app-01, fs-01) - panel rak terkunci
- Rak B (42U): perangkat jaringan (fw-core-01, core switch, patch panel) + KVM
- Rak C (24U): backup-srv-01 + storage expansion (kapasitas +2TB per 27 Okt, lihat A.8.13/A.8.6), siem-01
- Posisi: rak menjauh dari jendela; TIDAK ada pipa air melewati atas rak; sensor bocor di lantai bawah Rak A
- Power: dua jalur UPS (2x40 kVA, lihat A.7.11) + genset gedung (perjanjian sewa gedung)
- Lingkungan: AC presisi 2 unit (N+1, service CV Sinar Teknik), suhu 22-24 C terpantau NOC
- Pergeseran/perubahan tata letak: wajib approval IT Ops + tiket perubahan (A.8.32) agar rute kabel (A.7.12) tetap sahih
