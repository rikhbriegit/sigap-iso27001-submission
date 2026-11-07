# BASELINE HARDENING SERVER v2.1 (CIS LEVEL 1) & REGISTER PENGECUALIAN
**Kontrol**: A.8.9 | **Owner**: Andi Pratama (IT Ops) | **Klasifikasi**: Internal

- Kode: NDP-IS-STD-809 | Efektif: 1 Juni 2026 | Acuan: CIS Benchmark L1 (server Windows & Linux)

## Penerapan
1. Seluruh server produksi dibangun dari template image hardening (checklist 42 poin; audit trail via pipeline IaC).
2. Deviasi dari baseline HANYA lewat register pengecualian di bawah + approval owner + masa berlaku + re-review.

## Register pengecualian aktif (per 28 Okt 2026)
| No | Deviasi | Alasan | Approval | Masa berlaku / review |
|---|---|---|---|---|
| 1 | Portal ndp: TLS 1.0/1.1 masih aktif (Standar Kriptografi v1.0 bag. 3.2 dilanggar) | Kompatibilitas klien pelanggan BUMN lama; migrasi klien berjalan | CISO (Jul 2026) | Review ulang komite NOV 2026 - prioritas ditutup sebelum audit fase 1 (terkait temuan pentest A.8.8 #1 & bukti A.8.24) |
| 2 | 4 VM uji tanpa agen EDR | Lingkungan lab isolasi, tanpa data produksi | IT Ops (Jun 2026) | Permanen untuk lab; dikecualikan dari lingkup produksi |
| 3 | 3 scan gun gudang Makassar tanpa BitLocker | Perangkat embedded tidak mendukung | IT Ops (Feb 2026) | Sampai penggantian unit Q1 2027 |

Audit baseline: kuartalan oleh IT Security (terakhir 30 Sep 2026 - 2 deviasi baru tidak ber-label ditemukan & langsung diregistrasi).
