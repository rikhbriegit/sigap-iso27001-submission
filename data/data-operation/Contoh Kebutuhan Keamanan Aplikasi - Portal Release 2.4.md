# CONTOH KEBUTUHAN KEAMANAN APLIKASI - PORTAL PELANGGAN RELEASE 2.4
**Kontrol**: A.8.26 | **Owner**: Bagus Nugroho & IT Security | **Klasifikasi**: Internal

- Dokumen kebutuhan (user story keamanan) disepakati 20 Agustus 2026; baseline acuan: OWASP ASVS L1

## User story keamanan (kutipan)
| ID | Sebagai... | Saya butuh... | Kriteria terima |
|---|---|---|---|
| SEC-01 | Pelanggan | Sesi login otomatis berakhir setelah idle | Timeout 15 menit; perpanjangan via re-auth ringan |
| SEC-02 | Sistem | Proteksi brute force login | Rate limit 5x/menit/IP; CAPTCHA setelah 3 gagal; blok 15 menit |
| SEC-03 | Sistem | Audit trail aktivitas pelanggan | Log login & transaksi masuk SIEM (A.8.15); tidak mencatat data pribadi berlebihan |
| SEC-04 | Pelanggan | Kesalahan login tidak membocokan info | Pesan generik; user enumeration dicegah |
| SEC-05 | Sistem | Perlindungan upload (jika ada lampiran) | Whitelist jenis file, batas ukuran, scan malware (A.8.7) |
| SEC-06 | Data | Penyimpanan identitas aman | Nomor tagihan tampilkan masked; tokenisasi di modul pembayaran |

Verifikasi: seluruh kebutuhan masuk test case UAT (lihat A.8.29); hasilnya masuk berkas rilis.
