# Tindak lanjut CALENDAR-010 (status REVISION)

- Item asal: CALENDAR-010 — "Undangan follow-up kickoff (Andi Pratama) - 13 Nov 13:00 WIB"
- Keputusan manusia: **Revisi** (2026-11-07T10:31:41+07:00, dashboard #approvals)
- Pemeriksaan otomatis saat keputusan: LULUS penerima; LULUS belum pernah dikirim. Artinya penolakan bukan karena alamat atau duplikasi, melainkan isi undangan.
- Alasan tertulis: **tidak ada** (field `answer` hanya "Revisi", tanpa teks bebas).

## Yang dilakukan Manager
1. Tidak menjalankan CALENDAR-010 (sesuai catatan keputusan: "Jangan jalankan isinya").
2. Menanyakan perubahan yang diminta lewat kartu pilihan di chat Manager — bukan menebak, bukan mengulang pertanyaan terbuka.
3. Jawaban manusia: **"Tambah peserta Rina Kartika (c04)"**.

## Item pengganti
- **CALENDAR-016** (PENDING_APPROVAL) — Jumat 13 November 2026, 13:00–13:30 WIB.
  - Penerima (`to`): c03 Andi Pratama (rikh.brie+datacenter@gmail.com), c04 Rina Kartika (rikh.brie+network@gmail.com).
  - Peserta: c03, c04, c05 Rikh (Manager IT).
  - Agenda diperluas: tindak lanjut kickoff + koordinasi bukti A.5.15 (kontrol akses) **dan** A.8.13 (backup) — c04 adalah PIC A.5.15, c03 PIC A.8.13.
  - Slot diverifikasi `tools/schedule.js slot --date 2026-11-13 --start 13:00 --end 13:30 --zone WIB --contacts c03,c04,c05` → verdict **OK** (tidak kena jendela salat Jumat/istirahat 11:30–13:00, dalam jam kerja, hari kerja).
  - Notulen kickoff tetap TIDAK dilampirkan: kickoff baru 2026-11-10 09:00 WIB, belum berlangsung. Tidak dikarang.
- CALENDAR-010 dibiarkan berstatus REVISION sebagai jejak; tidak dihapus dan tidak diubah.

## Batas kewenangan
Pengiriman hanya terjadi setelah manusia menyetujui di dashboard `#approvals` (hash-bound). Manager tidak menandai terkirim tanpa `verify` + `done`.

---

## Ronde kedua — CALENDAR-016 ditolak karena catatan internal

- Item: **CALENDAR-016** (PENDING → **REVISION**, 2026-11-07T10:42:33+07:00).
- Pemeriksaan otomatis: penerima LULUS, belum pernah terkirim LULUS, tetapi **GAGAL** pada butir "isi pesan memuat catatan internal sistem" — frasa yang tertangkap: `#approvals`, `dashboard`, `menunggu persetujuan`, `tools/schedule.js`, `dikembalikan untuk revisi`.
- Itu temuan yang benar: badan undangan CALENDAR-010 memang memuat kalimat "Undangan ini masih menunggu persetujuan di dashboard #approvals", dan CALENDAR-016 menambah kalimat "menggantikan draf sebelumnya … yang dikembalikan untuk revisi". Penerima adalah staf IT, bukan peserta rapat internal SIGAP — mereka tidak boleh membaca mekanisme persetujuan kita.
- Tindakan: **CALENDAR-017** (PENDING_APPROVAL) dibuat dengan badan pesan bersih: tanpa id item, tanpa nama tool, tanpa status persetujuan, tanpa kata "revisi/draf sebelumnya".
  - Isi: Jumat 13 November 2026, 13:00–13:30 WIB; penerima c03 Andi Pratama + c04 Rina Kartika; peserta + c05 Rikh; agenda tindak lanjut kickoff, A.5.15, A.8.13; meminta konfirmasi kehadiran.
  - Divalidasi ulang dengan `checks.js` (`checkItem`) sebelum diserahkan: **3/3 LULUS**, saran otomatis "Setujui sesuai preview", tidak ada opsi yang terkunci.
- CALENDAR-010 dan CALENDAR-016 dibiarkan berstatus REVISION sebagai jejak; tidak diubah dan tidak dijalankan.

## Dampak ke fase audit
Selama masih ada item berstatus PENDING_APPROVAL, Pengawas sengaja **tidak** membangunkan task Auditor (`supervisor.js plan` → Auditor: "menunggu keputusan manusia"). Jadi FASE 5 baru berjalan setelah CALENDAR-017 diputuskan di `#approvals`. Ini bukan macet — ini urutan yang benar: keputusan manusia tidak boleh disalip oleh pekerjaan agen.
