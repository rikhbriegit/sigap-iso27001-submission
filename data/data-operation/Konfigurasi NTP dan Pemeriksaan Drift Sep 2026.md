# KONFIGURASI NTP & PEMERIKSAAN DRIFT - SEP 2026
**Kontrol**: A.8.17 | **Owner**: Rina Kartika (IT Infra) | **Klasifikasi**: Internal

## Konfigurasi
- Sumber internal: 2 server NTP internal (stratum-2, sinkron ke sumber waktu nasional/resmi upstream) - host ntp-01 & ntp-02
- Seluruh server produksi, perangkat jaringan, SIEM, bastion: klien NTP internal (interval 5 menit)
- Endpoint pengguna: sinkron domain (PDC emulator -> ntp internal) via GPO
- Zona waktu: server WIB (Asia/Jakarta); log mencantumkan WIB/WITA sesuai sumber

## Pemeriksaan drift September 2026
- Metode: audit NTP bulanan (script otomatis menyertasi status offset per host; dicek mingguan NOC)
- Hasil: drift maksimum 0,9 detik (server SAP - dalam toleransi <=1 detik); rata-rata 0,3 detik; SELURUH host dalam toleransi
- Log SIEM: timestamp konsisten antar sistem (relevan untuk investigasi insiden, lihat A.8.15)

Rencana perbaikan: menambah sumber NTP upstream kedua (redundansi sumber) - Q4 2026.
