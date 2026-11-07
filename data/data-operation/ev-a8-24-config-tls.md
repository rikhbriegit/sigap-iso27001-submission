# KONFIGURASI TLS PORTAL PELANGGAN (publik)
**Kontrol**: A.8.24 | **Owner**: Andi Pratama (IT Operations) | **Tanggal capture**: 26 Oktober 2026

## Hasil capture konfigurasi (nginx, portal.ndp-fiction.example)
```
ssl_protocols TLSv1.0 TLSv1.1 TLSv1.2;
ssl_ciphers HIGH:!aNULL:!MD5:DES-CBC3-SHA:AES128-SHA:AES256-SHA;
ssl_prefer_server_ciphers on;
ssl_certificate .../wildcard-ndp-2025.crt   (RSA 2048, SHA-256)
ssl_session_tickets on;
HSTS: TIDAK AKTIF
```

## Temuan awal (untuk diverifikasi agen)
1. TLSv1.0 dan TLSv1.1 masih AKTIF — protokol usang (RFC 8996 melarang)
2. Cipher DES-CBC3-SHA (3DES) masih diizinkan — cipher lemah (SWEET32)
3. Sertifikat wildcard RSA 2048 masih memadai, namun tanpa ECDSA fallback
4. HSTS tidak diaktifkan pada portal publik

Standar internal NDP "Standar Kriptografi v1.0 (2025)" — bagian 3.2:
"Protokol TLS untuk sistem publik WAJIB TLS 1.2 ke atas, cipher modern
(AEAD), HSTS aktif."
