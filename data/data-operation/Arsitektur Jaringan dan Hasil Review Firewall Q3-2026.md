# ARSITEKTUR JARINGAN & HASIL REVIEW FIREWALL - Q3 2026
**Kontrol**: A.8.20 | **Owner**: Andi Pratama (IT Ops) | **Klasifikasi**: Rahasia

## Arsitektur ringkas (zone-based, firewall fw-core-01 + kebijakan deny-by-default)
- DMZ: proxy terbalik portal (klien publik -> hanya 443 ke app node)
- Zona server: aplikasi & DB (akses hanya dari DMZ/app + bastion)
- Zona manajemen: bastion, NTP, patch server (akses hanya dari Zona IT mgmt)
- Zona kantor JKT & MKS (WAN): karyawan + NOC; klien WiFi tamu terisolasi penuh (internet saja)

## Review aturan firewall Q3 2026 (30 Sep - 2 Okt)
- Total aturan aktif sebelum review: 142
- Hasil: 5 aturan OBSOLETE dihapus (sisa layanan pilot 2024-2025); 3 aturan DIPERSEMPIT (any->spesifik host/port); 2 aturan dinonaktifkan sementara menunggu konfirmasi owner
- Tidak ada aturan any-any tersisa; aturan admin-plane wajib dari bastion (sesuai A.8.2)
- Konfigurasi tersimpan (backup sebelum perubahan; tiket CHG-2026-0987-0991)

## Pengelolaan
- Perubahan aturan hanya via manajemen perubahan (A.8.32); konfigurasi firewall dibackup otomatis harian (A.8.13 mencakup "konfigurasi jaringan").
- Review firewall: semesteran (berikutnya Maret 2027).
