# DEFINISI PERAN RBAC APLIKASI HRIS - v1.1
**Kontrol**: A.8.3 | **Owner**: Rina Kartika (teknis) & Sari Dewi (bisnis) | **Klasifikasi**: Internal

- Contoh implementasi pembatasan akses informasi per aplikasi (matriks lintas aplikasi: lihat A.5.15)

## Peran HRIS
| Peran | Akses data | Akses fungsi | Pemegang |
|---|---|---|---|
| Karyawan (self) | Data pribadi sendiri, slip gaji sendiri | Absensi, cuti | 214 karyawan |
| HR Staff | Data karyawan divisi HR (non-gaji) | Input data kepegawaian | 4 staf HR |
| HR Payroll | Data gaji SELURUH karyawan (peran khusus terpisah) | Proses payroll (maker) | 1 staf + HR Manager (checker) |
| HR Manager | Data HR penuh | Approve payroll, laporan | Sari Dewi |
| IT Admin teknis | TANPA akses data bisnis | Konfigurasi, patch, troubleshooting | Rina Kartika (adm-hris) |

## Ketentuan teknis
1. Akses gaji terpisah peran "HR Payroll" - di luar matriks umum (catatan matriks A.5.15); akses dicatat log (A.8.15).
2. IT admin sengaja TIDAK punya akses data bisnis (pemisahan tugas teknis vs data, lihat A.5.3).
3. Perubahan definisi peran = tiket perubahan + approval owner sistem (A.8.32).
