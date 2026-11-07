# LAPORAN INTELIJEN ANCAMAN - Q3 2026
**Kontrol**: A.5.7 | **Owner**: Rina Kartika (IT Infrastructure) | **Klasifikasi**: Internal

- Periode: Juli-September 2026 | Disusun tim SOC | Diserahkan ke komite keamanan 6 Oktober 2026

## Ringkasan ancaman relevan
1. Kampanye phishing "invoice palsu" menargetkan vendor/pemasok perusahaan BUMN - email dengan lampiran PDF berisi tautan kredensial harvesting. Dua gelombang teramati Agustus-September. Mitigasi: aturan filter email gateway diperketat, IOC diblokir firewall (lihat INC-2026-013).
2. Ransomware kelompok X menargetkan sektor logistik/layanan via akses VPN tanpa MFA - NDP sudah MFA penuh untuk VPN (lihat A.8.5); tetap diwaspadai akun vendor.
3. Eksploitasi kerentanan perangkat tepi jaringan - dipantau via umpan advisory (bukan target aktif NDP).

## Indikator kompromi terkait (telah diblokir)
- alamat-IP-malicious-1 (198.51.100.77) - blocked di firewall 2026-09-09
- domain-bogus-invoice.example - blocked di gateway 2026-09-09

## Tindak lanjut
- Ringkasan intelijen dibawakan pada briefing SOC bulanan; input ke manajemen kerentanan dan simulasi phishing terencana November 2026.
