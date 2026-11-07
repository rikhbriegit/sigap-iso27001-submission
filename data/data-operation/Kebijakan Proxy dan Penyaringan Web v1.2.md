# KEBIJAKAN PROXY & PENYARINGAN WEB - v1.2
**Kontrol**: A.8.23 | **Owner**: IT Ops & IT Security | **Klasifikasi**: Internal

- Efektif: 1 April 2026 | Proxy wajib seluruh endpoint kantor & koneksi VPN (transparent-ish: deny direct 80/443 keluar)

## Kategori yang DIBLOKIR
1. Malware/phishing (umpan reputasi + intel A.5.7)
2. Judi & konten ilegal
3. Berbagi file/storage publik (untuk data perusahaan - gunakan kanal resmi A.5.14; DLP memperkuat, A.8.12)
4. Media sosial pribadi pada jam kerja (kebijakan longgar: kategori berat diblokir; lainnya diperbolehkan via jaringan tamu)

## Pengecualian
- Approval per kasus via tiket (mis. keperluan pelanggan, R&D keamanan); dicatat dengan masa berlaku.

## Rekap pemblokiran September 2026
- Total hit diblokir: 1.243 (dominan kategori malware/umbrella & judi)
- Situs kategori malware: 217 hit; di antaranya 2 domain baru ditambahkan manual setelah INC-2026-013 (lihat A.5.7)
- Pemutakhiran daftar kategori: otomatis harian (umpan vendor kategori + intel internal)
