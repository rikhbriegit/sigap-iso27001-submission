# Alur Audit ISO/IEC 27001:2022 — SIGAP v5.0

Prosedur rinci: `skills/iso27001-assessment-workflow/SKILL.md` v5.0. Dokumen ini adalah peta per peran. Versi lama: `legacy/REAL-ASSESSMENT-FLOW-v4.md`.

## Pembagian pihak
- **Eksternal**: Auditor ISO 27001 (task `ISO270001-<NN> Auditor`). Menilai dan menerbitkan hasil audit.
- **Internal (auditee)**: Manager IT (chat manager), 6 staf pemilik bukti (task staf, tanpa Gmail), Direksi/CISO (penerima laporan).
- Manager tidak menilai, tidak melakukan QA, tidak menerbitkan atau mengirim hasil audit. Auditor tidak menyetujui rilis bukti milik internal.

## Swimlane
| Fase | Auditor (eksternal) | Manager (internal) | Staf pemilik (internal) | Kartu / alat |
|---|---|---|---|---|
| 0 Engagement | — | **Trigger → `npm run ensure` (dashboard hidup dulu)**, baru alokasi RUN, item outbox task Auditor | — | OUTBOX · `schedule.js at/future` |
| 1 Usulan kickoff | Fokus 3–5 item + alasan risiko, pemilik, bukti diminta, jadwal multi-zona → `proposal.json`, `requests.json` | — | — | `schedule.js slot` |
| 2 GATE 1 | — | Setujui proposal + manifest task staf (hanya pemilik fokus) | — | OUTBOX |
| 3 Rilis bukti | — | Rilis folder Manager (bila diminta) | Daftar folder sendiri → rilis per file | RELEASE · `evidence.js add` |
| 4 Kelengkapan | Bandingkan indeks vs permintaan → klarifikasi | — | Jawab klarifikasi milik sendiri | KLARIFIKASI |
| 5 Penilaian | Per item: bukti → kriteria → status + bukti objektif + CAP usulan | — | — | `evidence.js list` |
| 6 QA | `evidence.js check` lulus, hitung ulang ringkasan, ≤3 iterasi | Menerima eskalasi bila gagal | — | — |
| 7 Penerbitan | SoA, temuan, laporan → terbitkan → distribusi ke Direksi/CISO + Manager | Menerima | — | OUTBOX (report, email) |
| 8 Penutupan | Usulan rapat penutupan (multi-zona) | Terima laporan, CAP (≤90 hari Minor NC), cleanup task | — | OUTBOX (calendar, automation) · TERIMA LAPORAN |

> **Aturan 0 / trigger:** frase `mulai audit ISO 27001` adalah juga perintah menyalakan dashboard SIGAP. Langkah pertama = `npm run ensure` di `progress-dashboard` (idempoten: reuse instance sehat, atau hidupkan watchdog lalu tunggu port 4173). Bila hasilnya `DASHBOARD_DOWN`, **fail-closed** — RUN jangan dialokasikan dan tidak ada aksi keluar. Detail: `skills/iso27001-assessment-workflow/SKILL.md` §0 dan §4.

## Status conformity (tanpa skor)
Conform · Minor NC · Major NC · OFI · N/A. Major NC = kontrol tidak diterapkan, klausul wajib tanpa bukti, atau tujuan ISMS gagal (belum layak sertifikasi). Minor NC = penerapan tidak lengkap/konsisten, CAP ≤ 90 hari. OFI = peluang perbaikan. N/A = dikecualikan dengan justifikasi.

## Artefak per run (`runs/<RUN_ID>/`)
`proposal.json` · `requests.json` · `klarifikasi-bukti.json` · `evidence-index.json` · `outbox/` · `drafts/` · `notes/` · `penilaian-auditor.md` · laporan di `reports/<RUN_ID>/`.
