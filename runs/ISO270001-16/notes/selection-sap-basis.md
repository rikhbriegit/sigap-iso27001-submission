# Seleksi Bukti — Staff SAP Basis (sap-basis) — A.8.15 Logging

**Run**: ISO270001-16 | **Perusahaan**: PT Nusantara Digital Pratama
**Pemilik kontrol (pic_kontak)**: c06 (Yoga Saputra) | **Task pengumpul**: sap-basis (Staff SAP Basis, INTERNAL)
**Sumber tunggal**: `G:/My Drive/Hackathon_Tencent/Data-Operation/` (hanya salinan byte-identik, tidak dibuat/diubah)

## Pemecahan `bukti_diminta` menjadi butir
1. **Butir 1** — Kebijakan logging (apa yang dilog, level, pemilik)
2. **Butir 2** — Contoh log sistem (SAP/infrastruktur) yang dihasilkan
3. **Butir 3** — Kebijakan retensi log dan bukti perlindungan terhadap manipulasi log

## Dokumen yang DIAMBIL (dikumpulkan)
| Dokumen | Hash (manifest) | Butir | Alasan |
|---|---|---|---|
| `ev-a8-15-kebijakan-logging.md` (1234 B) | `8b0961c6…e034931` | 1, 2, 3 | Kebijakan Logging (Log-Policy v2, Maret 2026): event wajib dilog (autentikasi sukses/gagal, perubahan hak akses, aktivitas akun istimewa, perubahan konfigurasi, akses data sensitif), field severity pada sampel (level), pemilik Rina Kartika (IT Infrastructure). Juga memuat **Sampel log SIEM 27 Okt 2026** (auth.success/failed, alert bruteforce, config.change, access.granted) → butir 2. Serta retensi 180 hari hot + 1 tahun arsip WORM, akses log hanya SOC & IT Security + log-of-log → butir 3. |
| `Standar Retensi dan Perlindungan Catatan v1.2.md` (1156 B) | `99833395…980943` | 3 | Retensi Log keamanan 180 hari hot + 1 tahun arsip (WORM) dan perlindungan catatan dari pemalsuan via arsip digital WORM/tulis-sekali serta audit trail SAP yang tidak dapat diedit manual → menguatkan butir 3 (retensi + bukti perlindungan manipulasi). |

## Keterbatasan yang DILAPORKAN (jujur, bukan disembunyikan)
- **Butir 1 (level)**: tidak ada skema level/verbosity logging formal (DEBUG/INFO/WARN/ERROR) yang didefinisikan; hanya field `severity` pada sampel SIEM (mis. `medium`).
- **Butir 2 (contoh log SAP)**: sampel yang tersedia adalah ekstrak **log SIEM/keamanan infrastruktur**, BUKAN contoh log transaksi aplikasi SAP secara spesifik (mis. SM21 / audit log SAP). Butir 2 terpenuhi **sebagian**.
- **Konflik pemilik**: dokumen ev-a8-15 menyebut owner **Rina Kartika (IT Infrastructure)**, sedangkan `requests.json` menetapkan `pic_kontak = c06 (Yoga Saputra)`. Ini perbedaan pemilik kontrol vs task pengumpul; tidak menghalangi keabsahan bukti — diserahkan ke penilaian Auditor (FASE 5).

## Dokumen dipertimbangkan TETAPI TIDAK diambil (pinggiran / tidak menjawab butir)
- `ev-a7-02-log-pengunjung.md` (A.7.2): log pengunjung ruang server (fisik), bukan log sistem SAP/infrastruktur → tidak relevan A.8.15.
- `Jadwal Retensi dan Log Penghapusan Informasi Q3-2026.md` (A.8.10): jadwal penghapusan informasi & log penghapusan umum, bukan retensi/proteksi log keamanan A.8.15 secara langsung → dihindari sebagai dokumen pinggiran.
- `Log Permintaan Reset Kata Sandi (sampel Okt 2026).csv`: contoh log aplikasi, tetapi domain reset password, bukan SAP/infrastruktur SIEM → tidak diambil agar seleksi tetap fokus; bila Auditor meminta tambahan, akan diambil lagi (FASE 3).

## Status
- Seleksi selesai; 2 dokumen dikumpulkan via `tools/evidence.js collect` ke `IT Operation/SAP Basis`.
- Item outbox `release` RELEASE-009 disiapkan, menunggu keputusan manusia di dashboard `#approvals` (dieksekusi server).
- `requests.json` A.8.15 → status `dikumpulkan`.
