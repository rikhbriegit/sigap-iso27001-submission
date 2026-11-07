# KEBIJAKAN LOGGING & SAMPEL LOG
**Kontrol**: A.8.15 | **Owner**: Rina Kartika (IT Infrastructure) | **Data per**: Oktober 2026

## Kebijakan logging (Log-Policy v2, Maret 2026)
- Event yang WAJIB dilog: autentikasi (sukses/gagal), perubahan hak akses, aktivitas akun istimewa, perubahan konfigurasi, akses data sensitif
- Retensi: 180 hari hot + 1 tahun arsip (WORM storage)
- Perlindungan: hanya tim SOC & IT Security yang boleh membaca log server; akses dilog juga (log-of-log)

## Sampel log SIEM (extract, 27 Okt 2026)
```
2026-10-27 09:12:44 WIB | auth.success | user=rsantika | src=10.20.1.44 | app=HRIS | action=login
2026-10-27 09:15:02 WIB | auth.failed   | user=unknown | src=203.0.113.88 | app=portal | action=login
2026-10-27 09:15:04 WIB | alert         | rule=bruteforce-portal | severity=medium | status=auto-blocked
2026-10-27 10:41:19 WIB | config.change | user=apratama | target=backup-srv-01 | change=capacity+2TB
2026-10-27 14:00:00 WIB | access.granted | role=SOC | target=SIEM-repo | action=read
```

## Waktu sistem
Seluruh server sinkron NTP ke stratum-2 internal (drift < 1 detik, dicek mingguan).

Catatan: log-of-log (akses tim SOC ke log) aktif sejak Maret 2026, direview
bulanan oleh IT Security Officer.