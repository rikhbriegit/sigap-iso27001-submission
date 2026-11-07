# KEBIJAKAN KEAMANAN PERANGKAT PENGGUNA & MDM - v2.0
**Kontrol**: A.8.1 | **Owner**: Andi Pratama (IT Ops) | **Klasifikasi**: Internal

- Kode: NDP-KBL-801 | Efektif: 9 Februari 2026

## Ketentuan
1. Endpoint pengguna (laptop, tablet kerja) WAJIB terdaftar MDM (Microsoft Intune) + agen EDR (lihat A.8.7).
2. Enkripsi disk penuh (BitLocker) wajib; kunci pemulihan di escrow MDM - bukan milik pribadi pengguna.
3. Kunci layar otomatis 10 menit + PIN minimal 6 digit; patch OS terjadwal mingguan (ringan) / bulanan (OS build) via MDM.
4. Aplikasi hanya dari katalog MDM (whitelist, lihat A.8.19); jailbreak/root dideteksi dan diblokir.
5. Kehilangan perangkat: lapor kanal resmi; remote lock/wipe via MDM (prosedur A.7.9).
6. Perangkat pribadi TIDAK boleh memproses data perusahaan (BYOD dilarang untuk data Rahasia ke atas).
