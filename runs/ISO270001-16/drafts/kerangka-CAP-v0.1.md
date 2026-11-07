# KERANGKA CAP — RUN ISO270001-16

**Status dokumen: KERANGKA (draf kerja) v0.1 — BUKAN dokumen resmi, BELUM dipublikasikan.**
Disusun Manager IT sebagai auditee pada 2026-11-07. Serah terima **sudah tercatat** pada 2026-11-07T10:59:28+07:00 (SERAH_TERIMA-019, jawaban "Terima laporan dan susun CAP", dashboard #approvals), sehingga Manager resmi menjadi pemilik CAP. Kerangka ini belum menjadi CAP resmi: tanggal final, konfirmasi akar masalah oleh PIC, dan persetujuan belum ada. Belum boleh dilampirkan pada distribusi ke Direksi/CISO.

**Dasar**: `reports/ISO270001-16/Daftar-Temuan-ISO270001-16.md` (FINAL v1.0), `reports/ISO270001-16/Laporan-Audit-ISO270001-16.docx`, `penilaian-auditor.md`.
**Rekap**: Conform 0 · Minor NC 5 · Major NC 0 · OFI 0 · N/A 0. Tenggat penutupan ≤ 90 hari → **paling lambat 2027-02-05**.

**Cara membaca kolom "akar masalah"**: itu **hipotesis** yang harus dikonfirmasi PIC masing-masing. Saya tidak akan menuliskan akar masalah seolah fakta sebelum PIC-nya membenarkan — itu justru kebiasaan yang membuat CAP gagal berulang.

---

## 1. A.5.15 — Kontrol akses (Minor NC, PIC c04 Rina Kartika)

| Aspek | Isi |
|---|---|
| Akar masalah (hipotesis) | Kewajiban review hak akses diatur di SOP, tetapi tidak ada pemilik tunggal dokumentasi kontrol akses; saat frekuensi diubah lewat Pengumuman HR No.112/2026 (kuartalan per 1 Nov 2026), SOP v1.2 tidak ikut direvisi sehingga kewajiban lama (tahunan) masih berlaku di dokumen. |
| Tindakan korektif | (a) Terbitkan kebijakan A.5.15 yang berdiri sendiri dan disetujui manajemen; (b) revisi SOP v1.2 → v1.3 butir 4.2 = kuartalan; (c) laksanakan review kuartalan Q4 2026 dan arsipkan rekaman (daftar akun ditinjau, keputusan, penanggung jawab, tanggal) sesuai butir 5.1; (d) tetapkan pemilik tunggal dokumentasi kontrol akses. |
| Bukti penutupan | Kebijakan A.5.15 bertanda tangan/approval manajemen; SOP v1.3 dengan riwayat revisi; rekaman review Q4 2026 lengkap 4 kolom wajib. |
| Tenggat | 2026-12-18 (kebijakan + SOP v1.3) · 2027-01-30 (rekaman review Q4) |
| Verifikasi | Auditor mencocokkan rekaman review dengan butir 5.1 SOP v1.3; bukan sekadar keberadaan dokumen. |

## 2. A.8.13 — Backup informasi (Minor NC, PIC c03 Andi Pratama)

| Aspek | Isi |
|---|---|
| Akar masalah (hipotesis) | Uji restore diperlakukan sebagai kegiatan "bila perlu" — tidak ada jadwal periodik, penanggung jawab, maupun tempat menyimpan hasilnya; karena tidak dijadwalkan, tidak ada yang merasa terlambat saat lewat 12 bulan. |
| Tindakan korektif | (a) Laksanakan uji restore **segera** untuk SAP DB + file server utama, catat hasil dan waktu pemulihan (RTO aktual); (b) tetapkan jadwal ≥ 2×/tahun dengan penanggung jawab dan pengingat; (c) nyatakan jenis backup secara eksplisit (full/incremental/diferensial); (d) sediakan bukti enkripsi media offsite **saat tersimpan** (at rest), bukan hanya saat transfer. |
| Bukti penutupan | Laporan uji restore bertanggal dengan hasil + durasi pemulihan; dokumen jadwal uji restore 2027; pernyataan jenis backup; bukti/kebijakan enkripsi at-rest media Makassar. |
| Tenggat | 2026-11-21 (uji restore pertama) · 2026-12-04 (jadwal + bukti enkripsi at-rest) |
| Verifikasi | Auditor memeriksa tanggal uji berada di dalam jendela 12 bulan dan hasilnya dapat direproduksi. |

## 3. A.8.7 — Proteksi terhadap malware (Minor NC, PIC c02 Fajar Hidayat)

| Aspek | Isi |
|---|---|
| Akar masalah (hipotesis) | Pengecualian EDR diberikan secara lisan/operasional untuk VM uji tanpa jalur persetujuan tertulis, sehingga tidak ada daftar yang bisa ditunjukkan saat diaudit; program awareness dan ekspor log mentah belum pernah dijadikan deliverable. |
| Tindakan korektif | (a) Pasang EDR pada 4 aset tersisa **atau** terbitkan daftar pengecualian resmi (aset, justifikasi, risiko, penanggung jawab, tanggal persetujuan); (b) tetapkan retensi dan prosedur ekspor log deteksi mentah (contoh ekspor 1 periode); (c) laksanakan program awareness malware dan simpan materi, daftar peserta, hasil evaluasi. |
| Bukti penutupan | Daftar pengecualian bertanda tangan **atau** bukti EDR 190/190; file ekspor log deteksi mentah; materi + daftar hadir + hasil kuis/simulasi awareness. |
| Tenggat | 2026-12-04 (daftar pengecualian / EDR penuh) · 2027-01-15 (awareness + log mentah) |
| Verifikasi | Auditor membandingkan jumlah aset tercakup dengan daftar resmi; memeriksa log mentah benar-benar hasil ekspor, bukan ringkasan. |

## 4. A.8.15 — Logging (Minor NC, PIC c06 Yoga Saputra)

| Aspek | Isi |
|---|---|
| Akar masalah (hipotesis) | Kebijakan logging disusun dari sisi infrastruktur/SIEM, sehingga aplikasi inti (SAP) tidak pernah masuk cakupan contoh; level logging dianggap "sudah diatur di alat" tanpa perlu dituliskan; kepemilikan dokumen tidak pernah ditegaskan setelah reorganisasi. |
| Tindakan korektif | (a) Terbitkan penetapan level logging (DEBUG/INFO/WARN/ERROR) + matriks event-ke-level di dalam Log-Policy; (b) sediakan contoh log audit/transaksi SAP beserta jalur pengirimannya ke SIEM, atau justifikasi tertulis bila sengaja tidak dikirim; (c) tegaskan pemilik sah kebijakan logging dan perbarui atribut pemilik pada dokumen. |
| Bukti penutupan | Log-Policy versi baru dengan skema level + matriks; contoh log SAP bertanggal; dokumen dengan atribut pemilik yang benar. |
| Tenggat | 2026-12-18 |
| Verifikasi | Auditor memeriksa setiap event wajib punya level yang terdefinisi, dan contoh log SAP dapat ditelusuri ke jalur pengiriman. |

## 5. Klausul 9.1 — Pemantauan, pengukuran, analisis, evaluasi (Minor NC, PIC c01 Hendra Gunawan)

| Aspek | Isi |
|---|---|
| Akar masalah (hipotesis) | Pengukuran kinerja ISMS berjalan sebagai efek samping kontrol lain (audit internal, review kepatuhan, statistik insiden) — tidak pernah ada dokumen yang menetapkan *apa* yang diukur, *bagaimana*, *seberapa sering*, dan *siapa* yang mengevaluasi, sehingga hasilnya tidak bisa dinilai terhadap sasaran. |
| Tindakan korektif | (a) Terbitkan prosedur pemantauan-pengukuran-analisis-evaluasi: indikator, metode, frekuensi, pemilik data, ambang evaluasi; (b) jalankan siklus pengukuran pertama dan simpan rekaman analisis + evaluasi terhadap sasaran ISMS; (c) selenggarakan tinjauan manajemen (klausul 9.3) dengan masukan dan keluaran terdokumentasi. |
| Bukti penutupan | Prosedur 9.1 disetujui; rekaman siklus pengukuran pertama; notulen tinjauan manajemen yang memuat masukan wajib 9.3 (hasil audit internal, status tindakan korektif, umpan balik pemangku kepentingan, kinerja ISMS) dan keluarannya (keputusan perbaikan, sumber daya). |
| Tenggat | 2026-12-18 (prosedur) · 2027-01-29 (siklus pertama + rekaman) |
| Verifikasi | Auditor memeriksa rekaman evaluasi benar-benar merujuk sasaran ISMS, bukan laporan aktivitas. |

---

## 6. Konflik tenggat yang harus diselesaikan lebih dulu

Daftar temuan menyebut tinjauan manajemen pertama **paling lambat akhir Q1 2027 (2027-03-31)**, sedangkan tenggat CAP keseluruhan **≤ 90 hari (2027-02-05)**. Dua tanggal ini tidak bisa keduanya benar untuk temuan yang sama.

Usulan saya: jadwalkan **tinjauan manajemen interim pada 2027-01-29** (di dalam 90 hari) yang memenuhi masukan/keluaran klausul 9.3 secara minimal namun sah, lalu tinjauan penuh Maret 2027 sebagai siklus normal. Ini perlu **persetujuan Auditor** — bukan keputusan saya. Kalau Auditor menolak, temuan 9.1 harus diberi tenggat terpisah dan itu berarti CAP tidak seluruhnya selesai dalam 90 hari; saya akan menuliskannya apa adanya, bukan menutupinya dengan tanggal yang enak dilihat.

## 7. Yang belum boleh dilakukan

- CAP ini **bukan** dokumen resmi: belum ada penerimaan serah terima, belum ada persetujuan, belum ada verifikasi penutupan.
- Distribusi ke Direksi/CISO dan FASE 8 (rapat penutupan) tetap tertahan sampai SERAH_TERIMA-019 tercatat "Terima laporan dan susun CAP".
- Tenggat di atas adalah usulan Manager sebagai auditee; tanggal final berlaku setelah CAP disetujui, bukan setelah dokumen ini ditulis.

## 8. Milestone ringkas

| Tanggal | Milestone |
|---|---|
| 2026-11-21 | Uji restore A.8.13 dilaksanakan + laporan hasil |
| 2026-12-04 | Daftar pengecualian EDR resmi; jadwal uji restore; bukti enkripsi at-rest |
| 2026-12-18 | Kebijakan A.5.15 + SOP v1.3; Log-Policy (level + contoh log SAP); prosedur 9.1 |
| 2027-01-15 | Program awareness malware + ekspor log deteksi mentah |
| 2027-01-29 | Tinjauan manajemen interim (9.3) + siklus pengukuran pertama |
| 2027-01-30 | Rekaman review hak akses Q4 2026 |
| 2027-02-05 | Batas 90 hari — seluruh CAP siap diverifikasi |
