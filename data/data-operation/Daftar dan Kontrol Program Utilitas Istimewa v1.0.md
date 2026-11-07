# DAFTAR & KONTROL PROGRAM UTILITAS ISTIMEWA - v1.0
**Kontrol**: A.8.18 | **Owner**: IT Ops & IT Security | **Klasifikasi**: Internal

- Efektif: 1 April 2026

## Utilitas yang dapat mengesampingkan kontrol sistem
| Utilitas | Kontrol penerapan | Justifikasi |
|---|---|---|
| PowerShell | Mode Constrained Language di endpoint non-IT; logging blok skrip aktif di server; eksekusi skrip ditandatangani internal | Otomasi operasional |
| PsExec / tool remote-exec | Terbatas hanya dari bastion (adalah default di endpoint); blokir di laptop staf | Akses admin terpantau |
| Registry Editor (regedit) | Blokir staf via GPO; aktif hanya akun admin via bastion | Troubleshooting |
| Database CLI (sqlcmd/psql) | Hanya dari bastion + akun admin DB; sesi direkam | Operasi DB |
| Boot/PE tools, imaging (Rufus dsb.) | Hanya device technician; USB boot blokir di endpoint biasa | Instalasi terkontrol |

## Pemantauan
- Eksekusi utilitas istimewa di luar jalur di atas memicu alert EDR/SIEM (aturan "tool misuse").
- Kasus pelanggaran: 0 pada Q3 2026 (1 alert FP - skrip internal tidak ter-tanda tangan, langsung diberi label).
