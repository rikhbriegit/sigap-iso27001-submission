# Persetujuan CAP — RUN ISO270001-16

**Status**: CAP v1.0 DISETUJUI sebagai rencana kerja internal (bukan penutupan temuan)
**Waktu persetujuan**: 2026-11-07T11:03:14+07:00
**Item keputusan**: `CAP-020` di dashboard #approvals — opsi **"Setujui sesuai preview"**
**Aktor**: dashboard (manusia), atas nama Manager IT selaku pemilik CAP

## Artefak yang disetujui

| Berkas | sha256 yang disetujui | Ukuran |
|---|---|---|
| `reports/ISO270001-16/CAP-ISO270001-16.docx` | `37e81e23a6e7bf630b7afd2c9d16a3a67946cf4122ff3a417810067d209185a3` | 11.128 byte |

Berkas **tidak diubah** setelah persetujuan — hash dihitung ulang pasca-keputusan dan cocok. Persetujuan terikat pada hash tersebut di `runs/ISO270001-16/outbox/CAP-020.json`.

## Yang disetujui

Rencana tindakan korektif atas **5 Minor NC**: hipotesis akar masalah, tindakan bertenggat, bukti objektif penerimaan, PIC, dan jadwal verifikasi efektivitas.

- A.8.13 Backup informasi — PIC c03 — didahulukan
- Klausul 9.1 Pemantauan & pengukuran — PIC c01
- A.8.7 Proteksi malware — PIC c02
- A.5.15 Kontrol akses — PIC c04
- A.8.15 Logging — PIC c06

Tenggat penutupan: **2027-02-05**. Verifikasi efektivitas: **2027-01-29**.

## Yang TIDAK disetujui (batas yang mengikat)

1. **Penutupan temuan.** Kelima Minor NC tetap TERBUKA sampai Auditor memverifikasi bukti objektif pada FASE 8.
2. **Perubahan status conformity.** Status dari dokumen FINAL Auditor tidak berubah oleh persetujuan ini.
3. **Tenggat tinjauan manajemen 9.3.** Daftar temuan menyebut "< akhir Q1 2027", sedangkan CAP berbatas 90 hari. Usulan tinjauan interim 2027-01-29 **belum disepakati** dan bukan wewenang Manager untuk menetapkannya; perlu keputusan Auditor.
4. **Distribusi ke Direksi/CISO.** Item terpisah, belum diajukan.

## Catatan keterbatasan

- **Label dokumen**: kepala `CAP-ISO270001-16.docx` masih berbunyi "DRAFT v1.0" karena berkas tidak boleh diubah setelah hash-nya disetujui. Status otoritatif ada di dokumen ini dan di `CAP-020` — konsekuensi mengikat keputusan pada hash, bukan kealpaan.
- **Akar masalah = hipotesis**: ditandai eksplisit di dokumen; wajib dikonfirmasi PIC sebelum pelaksanaan. CAP yang akar masalahnya tidak dikonfirmasi cenderung berulang.
- **Klarifikasi**: KL-01..KL-05 dijawab "Belum tersedia" (7 November 2026 10:37 WIB), sehingga penilaian bergantung pada bukti yang ada.
- **Lingkup**: 5 item fokus, bukan 93 kontrol Annex A maupun seluruh klausul 4–10.
- **Deviasi alat**: `python-docx` tidak terpasang; dokumen dibangun via OOXML offline (`runs/ISO270001-16/.ref/build-cap.py`).
- **SIMULASI**: RUN ini fiktif; persetujuan diberikan operator atas nama persona simulasi dan manager. Bukan bukti komitmen manajemen yang sesungguhnya.
