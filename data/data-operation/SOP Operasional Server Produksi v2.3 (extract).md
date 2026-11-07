# SOP OPERASIONAL SERVER PRODUKSI - v2.3 (EXTRACT)
**Kontrol**: A.5.37 | **Owner**: Andi Pratama (IT Ops) | **Klasifikasi**: Internal

- Kode: NDP-SOP-OPS-01 | Efektif: 1 Juni 2026 | Tersedia di portal internal (baca untuk semua staf IT)

## Bagian 3 - Patching mingguan (extract)
1. Patching dijadwalkan SABTU 00:00-04:00 WIB (window resmi; server kritis bergilir dua mingguan).
2. Urutan: uji di staging - server non-produksi - server produksi (dengan approval perubahan lihat A.8.32).
3. Rollback: snapshot/rencana rollback WAJIB disiapkan sebelum patch server kritis.
4. Bila patch gagal dan berdampak layanan, eskalasi P2 ke on-call.

## Bagian 5 - Restart layanan (extract)
- Restart layanan non-kritis boleh oleh teknisi NOC sesuai checklist; restart SAP/HRIS wajib approval owner sistem.
- Seluruh tindakan dicatat di tiket operasi (jejak audit).

## Bagian 7 - Checklist harian NOC (extract)
- Verifikasi pekerjaan backup malam (dashboard; alarm gagal otomatis - lihat A.8.13).
- Verifikasi sinkron jam & health monitoring dasar.
