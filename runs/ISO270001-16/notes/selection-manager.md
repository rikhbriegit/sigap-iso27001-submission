# Seleksi Bukti — Klausul 9.1 (Manager / c01) — RUN ISO270001-16

Pemilik: Manager IT (c01, Rikh). Item: **Klausul 9.1 — Pemantauan, pengukuran, analisis dan evaluasi**.
Sumber wajib: `G:/My Drive/Hackathon_Tencent/Data-Operation/` (salinan byte-identik via `tools/evidence.js collect`).

## Pecahan butir `bukti_diminta`
1. Kebijakan pemantauan, pengukuran, analisis, dan evaluasi beserta metrik ISMS.
2. Laporan hasil pemantauan/pengukuran periodik (termasuk hasil audit internal).
3. Bukti tinjauan manajemen (management review) atas kinerja ISMS.

## Dokumen terpilih (collect dilakukan, hash tervalidasi manifest)
- **Butir 1** — `Statistik Pelaporan Event 2026 Q1-Q3.csv`
  Alasan: metrik ISMS nyata (tren laporan insiden/event per bulan Jan–Sep 2026, waktu lapor rata-rata); bukti bahwa pemantauan & pengukuran dilaksanakan dan menghasilkan metrik yang diukur.
  **CATATAN JUJUR (gap):** tidak ditemukan dokumen *prosedur tersendiri* "Pemantauan, Pengukuran, Analisis, dan Evaluasi (Klausul 9.1)" di Data-Operation. Kebijakan KSI v3.0 (A.5.1) hanya menetapkan kerangka & komitmen manajemen, bukan prosedur 9.1. → diflag sebagai potensi Minor NC / OFI untuk dinilai Auditor di FASE 5.
- **Butir 2** — `Laporan Audit Internal ISMS Q1-2026.md`
  Alasan: hasil audit internal ISMS (efektivitas, temuan minor/observasi, jadwal audit berikutnya) = bagian dari pemantauan/evaluasi periodik kinerja ISMS.
- **Butir 2** — `Laporan Review Kepatuhan Kebijakan Keamanan Q2-2026.md`
  Alasan: laporan hasil pengukuran/monitoring kepatuhan periodik dengan angka terukur (clear desk 94%, pelabelan 96%, ruang server 100%, dll.).
- **Butir 3** — `Notulen Rapat Komite Keamanan Informasi 2026-09-15.md`
  Alasan: tinjauan manajemen atas kinerja ISMS — komitmen manajemen, alokasi rapat bulanan komite, pengajuan anggaran ISMS 2027, jadwal self-assessment & laporan gap.

## Dokumen dipertimbangkan namun TIDAK dipilih (agar tidak menutupi gap)
- `Matriks Peran dan Tanggung Jawab Keamanan Informasi v1.4.md` (A.5.2) — pembagian peran RACI, bukan prosedur pemantauan 9.1.
- `ev-a5-01-kebijakan-ksi-v3.0.md` (A.5.1) — kebijakan umum ISMS; tidak memuat prosedur pemantauan/pengukuran 9.1 tersendiri.
- `Laporan Pemeliharaan Utilitas Pendukung`, `Ringkasan Manajemen Kerentanan Q3-2026`, `Ringkasan Pentest Eksternal` — metrik operasional lain, tetapi tidak secara langsung menjawab kewajiban prosedur/kebijakan Klausul 9.1; tidak diambil untuk menghindari over-claim.

## Status
- Item Klausul 9.1 → `dikumpulkan` (4 dokumen). Gap prosedur 9.1 tersendiri dicatat jujur untuk penilaian Auditor.
