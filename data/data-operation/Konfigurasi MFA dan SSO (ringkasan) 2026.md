# KONFIGURASI MFA & SSO (RINGKASAN) - 2026
**Kontrol**: A.8.5 | **Owner**: IT Ops & IT Security | **Klasifikasi**: Internal

- Diperbarui: 20 Oktober 2026

## Penerapan MFA (wajib)
| Layanan | Metode MFA | Cakupan | Status |
|---|---|---|---|
| VPN remote (vpn-gw-01) | TOTP + push | 100% pengguna remote | Aktif sejak 2024 |
| Email & M365 | Authenticator (number match) | 214/214 | Aktif Mar 2026 |
| SAP & portal internal | SSO korporat + MFA | 100% staf terkait | Aktif |
| Konsol admin cloud (Tencent) | MFA khusus admin | 2 admin (Maya, backup: Rina) | Aktif (lihat A.5.23) |
| Bastion/PAM | MFA hardware token | 6 akun admin | Aktif |
| HRIS (peran Payroll) | MFA tambahan | 2 pemegang peran | Aktif |

## SSO
- Satu identitas korporat (AD) untuk VPN, email, aplikasi internal; aplikasi publik pelanggan TIDAK pakai SSO internal.
- Password policy sesuai A.5.17; biometric Windows Hello didukung endpoint (opsional pengguna).

## Catatan audit
- 1 pengguna gagal MFA berulang Minggu ke-4 Sep (lihat statistik VPN A.6.7) - terverifikasi bukan upaya infiltrasi (staf lupa perangkat baru).
