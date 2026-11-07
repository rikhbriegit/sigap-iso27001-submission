# SOP PEMISAHAN TUGAS - v1.2
**Kontrol**: A.5.3 | **Owner**: Fajar Hidayat (IT Security) | **Klasifikasi**: Internal

- Kode: NDP-SOP-IS-003 | Efektif: 1 Maret 2025 | Review: 2 tahunan

## Ketentuan
1. Tugas bertentangan WAJIB dipisah: pembuat (maker) vs pemberi persetujuan (checker):
   - e-proc: pembuatan PO oleh Procurement Staff, persetujuan oleh Procurement Manager
   - SAP-FI: posting JV oleh Finance Analyst, approval oleh Finance Manager
   - Payroll HRIS: input oleh HR Payroll Staff, approval oleh HR Manager
2. Pengembang DILARANG melakukan deploy ke produksi; deploy hanya oleh IT Operations via pipeline.
3. Admin sistem tidak boleh sekaligus menjadi auditor kepatuhan sistemnya sendiri.
4. Pemisahan tugas diverifikasi saat review hak akses (lihat A.5.18) dan audit internal.
