# SOP MANAJEMEN PERUBAHAN - v1.4
**Kontrol**: A.8.32 | **Owner**: IT Ops (CAB) | **Klasifikasi**: Internal

- Kode: NDP-SOP-832 | Efektif: 1 Juni 2026

## Kategori perubahan
| Kategori | Contoh | Persetujuan |
|---|---|---|
| Standar | Patch rutin terdokumentasi, sudah diuji staging | Pre-approve (window resmi) |
| Normal | Perubahan konfigurasi, rilis aplikasi | CAB mingguan (IT Ops + owner sistem + IT Security bila sentuh keamanan) |
| Darurat | Perubahan untuk pulihkan layanan P1/P2 | Approval lisan CISO/IT Ops -> dokumentasi retro maks 3 hari |

## Ketentuan umum
1. Setiap perubahan WAJIB punya: deskripsi, risiko, rencana ROLLBACK, window, pemilik, hasil uji.
2. Perubahan server kritis: snapshot/backup titik-pulih disiapkan SEBELUM eksekusi (A.8.13).
3. Hasil perubahan diverifikasi pasca-implementasi & dicatat closed di tiket.
4. Rekap CAB dibulanan (lihat file rekap); audit trail perubahan tersimpan (tiket+log SIEM).
