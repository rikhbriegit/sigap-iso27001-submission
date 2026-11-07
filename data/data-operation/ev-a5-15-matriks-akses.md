# MATRIKS HAK AKSES APLIKASI (extract)
**Kontrol**: A.5.15 | **Owner**: Andi Pratama (IT Operations) | **Periode data**: Oktober 2026

| Aplikasi | Role | Divisi | Level Akses |
|---|---|---|---|
| SAP-FI | Finance Analyst | Keuangan | Baca+posting JV |
| SAP-FI | Finance Manager | Keuangan | Baca+posting+approve |
| e-proc | Procurement Staff | Pengadaan | Buat PO (maker) |
| e-proc | Procurement Manager | Pengadaan | Approve PO (checker) |
| HRIS | HR Staff | HR | Data karyawan sendiri-divisi (read) |
| HRIS | HR Manager | HR | Full divisi HR |
| File Server | Semua karyawan | Semua | Share dept masing-masing |

Catatan:
- Prinsip maker-checker diterapkan di e-proc (PO butuh approval manager).
- Akses HRIS ke data gaji dibatasi role khusus "HR Payroll" — di luar matriks umum ini.
- Matriks diperbarui terakhir: 15 Oktober 2026 oleh Andi Pratama.