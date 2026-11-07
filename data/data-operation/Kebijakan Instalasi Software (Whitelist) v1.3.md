# KEBIJAKAN INSTALASI SOFTWARE (WHITELIST) - v1.3
**Kontrol**: A.8.19 | **Owner**: IT Ops | **Klasifikasi**: Internal

- Kode: NDP-KBL-819 | Efektif: 1 Maret 2026

## Ketentuan
1. Endpoint & server: hanya software dalam katalog (whitelist MDM) yang boleh diinstal; instalasi lain diblokir secara teknis.
2. Permintaan software baru: form tiket IT (keperluan, nama software, sumber, lisensi) - approval atasan + IT Security (risiko) + IT Ops (lisensi/teknis).
3. Server produksi: instalasi hanya via tiket perubahan (A.8.32) & window resmi.
4. Software portable/USB tanpa instalasi juga terblokir default (EDR + AppLocker policy ringan).
5. Pengecualian teknis (tool diagnostic jangka pendek): ditandai dengan masa berlaku & auto-uninstall.

Penegakan: laporan blokir MDM direkap bulanan; temuan percobaan instalasi masuk review kepatuhan (A.5.36).
