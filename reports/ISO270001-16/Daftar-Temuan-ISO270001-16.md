# Daftar Temuan - RUN ISO270001-16

**Status dokumen**: FINAL v1.0 - diterbitkan setelah kartu penerbitan disetujui dan outbox.js verify lulus; rujukan persetujuan dicatat pada status-penerbitan.json.  
**Auditor**: ISO 27001 Eksternal (`rikh.brie+assesor@gmail.com`)  
**Perusahaan**: PT Nusantara Digital Pratama (fiksi)  
**Disusun**: 2026-11-07T10:47:30+07:00  
**Metode**: conformity kualitatif ISO/IEC 27001:2022, tanpa nilai angka, persentase, tingkat kematangan, maupun kategori keparahan.

## Rekapitulasi

| Status | Jumlah |
|---|---|
| Conform | 0 |
| Minor NC | 5 |
| Major NC | 0 |
| OFI | 0 |
| N/A | 0 |
| Menunggu klarifikasi | 0 |

0 Major NC: tidak ada penghalang sertifikasi dari 5 item yang dinilai; seluruh Minor NC wajib ditutup via CAP paling lambat 2027-02-05.

## Temuan

### A.5.15 - Kontrol akses: Minor NC

- **PIC kontak**: c04 (Rina Kartika); **pemilik bukti**: network-user
- **Uraian**: Kebijakan tingkat atas disetujui, matriks hak akses berbasis peran tersedia, akun istimewa dikelola lewat bastion dengan MFA dan perekaman sesi, kontrol akses fisik berjalan. Penerapan belum konsisten: tidak ada kebijakan A.5.15 yang berdiri sendiri, rekaman access review tidak ada dalam bentuk yang diwajibkan SOP (hanya ringkasan naratif review 20-24 Mei 2026), dan prosedur belum diselaraskan dengan frekuensi kuartalan yang berlaku sejak 1 November 2026.
- **Bukti objektif**: SOP Pengelolaan Hak Akses v1.2 butir 4.2 mewajibkan review 'minimal SATU KALI SETAHUN' dan butir 5.1 mewajibkan rekaman review diarsipkan 3 tahun, sedangkan Pengumuman HR No.112-2026 menetapkan review kuartalan efektif 1 November 2026; rekaman review tersendiri tidak tersedia (klarifikasi dijawab 'Belum tersedia') dan siklus kuartalan pertama belum berjalan.
- **Berkas bukti**: ev-a5-01-kebijakan-ksi-v3.0.md; ev-a5-18-sop-access-control-v1.2-2024.md; Prosedur Pengamanan Kantor, Ruang, dan Fasilitas v1.2.md; ev-a5-15-matriks-akses.md; Definisi Peran RBAC Aplikasi HRIS v1.1.md; Daftar Akun Istimewa dan Pengelolaan PAM Sep 2026.csv; Pengumuman HR No.112-2026 Review Hak Akses Kuartalan 27 Okt 2026.md
- **Tindakan korektif usulan**: Terbitkan kebijakan kontrol akses tersendiri; revisi SOP v1.2 menjadi v1.3 dengan frekuensi kuartalan; laksanakan dan arsipkan rekaman review kuartalan Q4 2026 sesuai butir 5.1; tetapkan pemilik tunggal dokumentasi.
- **Pemilik tindakan / target**: c04 (Rina Kartika) / <= 90 hari (paling lambat 2027-02-05)

### A.8.13 - Backup informasi: Minor NC

- **PIC kontak**: c03 (Andi Pratama); **pemilik bukti**: dc-server
- **Uraian**: Backup harian terjadwal, retensi 30 hari + 12 bulan, salinan offsite mingguan, dan pemantauan kegagalan tersedia dengan keberhasilan 99,2% pada 90 hari terakhir. Kemampuan pemulihan tidak terbukti dalam jendela 12 bulan: uji restore terakhir 14 bulan lalu tanpa jadwal berikutnya, jenis backup tidak dinyatakan eksplisit, dan enkripsi media offsite saat tersimpan tidak terbukti. Klarifikasi dijawab 'Belum tersedia'. Observasi audit internal Q1-2026 atas uji restore masih terbuka.
- **Bukti objektif**: ev-a8-13-konfigurasi-backup.md: 'Uji restore terakhir: 14 AGUSTUS 2025', 'Uji restore berikutnya: BELUM DITENTUKAN (tidak ada jadwal tercatat)', dan 'SOP Backup v1.1 (2024) mensyaratkan uji restore minimal 2x per tahun -> TIDAK TEPAT WAKTU'. Enkripsi hanya dinyatakan pada transfer, bukan saat media tersimpan.
- **Berkas bukti**: ev-a8-13-konfigurasi-backup.md
- **Tindakan korektif usulan**: Laksanakan uji restore segera (SAP DB + file server) dan dokumentasikan hasil serta waktu pemulihan; tetapkan jadwal >= 2x per tahun dengan penanggung jawab; nyatakan jenis backup secara eksplisit; sediakan bukti enkripsi media offsite saat tersimpan.
- **Pemilik tindakan / target**: c03 (Andi Pratama) / <= 90 hari; uji restore dilakukan segera (paling lambat 2027-02-05)

### A.8.7 - Proteksi terhadap malware: Minor NC

- **PIC kontak**: c02 (Fajar Hidayat); **pemilik bukti**: cyber-security
- **Uraian**: Proteksi malware nyata dan aktif: perlindungan real-time, isolasi otomatis yang tervalidasi pada insiden nyata (TKT-2026-08-003), pemantauan deteksi berjalan. Penerapan belum konsisten: 4 aset tanpa EDR meski disebut pengecualian resmi tanpa daftar justifikasi dan persetujuan; bukti deteksi hanya ringkasan Q3 dan rekap tiket, bukan catatan deteksi mentah; integrasi dengan kesadaran pengguna belum terlaksana (simulasi phishing baru terjadwal November 2026). Klarifikasi dijawab 'Belum tersedia'.
- **Bukti objektif**: ev-a8-07-config-malware.md: 'Agent EDR terpasang: 186/190 server+endpoint' dan '4 VM uji belum tercover - tercatat pengecualian resmi' tanpa daftar pengecualian; Post-Mortem INC-2026-013: 'Simulasi phishing terencana seluruh karyawan ... Terjadwal November 2026' dengan catatan bukti pelaksanaan belum tersedia.
- **Berkas bukti**: ev-a8-07-config-malware.md; Rekap Tiket Event dan Keputusan Klasifikasi Q3-2026.csv; Statistik Pelaporan Event 2026 Q1-Q3.csv; Post-Mortem dan Pembelajaran INC-2026-013.md
- **Tindakan korektif usulan**: Pasang EDR pada 4 aset tersisa atau terbitkan daftar pengecualian resmi berisi aset, justifikasi, risiko, penanggung jawab, dan tanggal persetujuan; tetapkan retensi dan ekspor log deteksi mentah; laksanakan program kesadaran dan simpan materi, daftar peserta, serta hasil evaluasi.
- **Pemilik tindakan / target**: c02 (Fajar Hidayat) / <= 90 hari (paling lambat 2027-02-05)

### A.8.15 - Logging: Minor NC

- **PIC kontak**: c06 (Yoga Saputra); **pemilik bukti**: sap-basis
- **Uraian**: Kebijakan logging, daftar event wajib, retensi, perlindungan integritas WORM, pembatasan akses, log-of-log, dan akurasi waktu NTP terpenuhi. Penerapan belum lengkap: level logging tidak ditetapkan (tidak ada skema tingkat beserta pemetaan event), dan contoh log tidak mencakup aplikasi SAP sebagai sistem inti yang diminta pada permintaan bukti. Klarifikasi dijawab 'Belum tersedia'; pemilik sah dokumen juga belum ditegaskan karena berkas menyebut unit IT Infrastructure.
- **Bukti objektif**: ev-a8-15-kebijakan-logging.md memuat daftar event wajib, retensi 180 hari + 1 tahun WORM, pembatasan akses dengan log-of-log, dan sampel log SIEM 27 Oktober 2026, namun tidak memuat skema level logging dan tidak memuat contoh log transaksi aplikasi SAP.
- **Berkas bukti**: ev-a8-15-kebijakan-logging.md; Standar Retensi dan Perlindungan Catatan v1.2.md
- **Tindakan korektif usulan**: Terbitkan penetapan level logging dan matriks event-ke-level dalam Log-Policy; sediakan contoh log audit/transaksi SAP beserta jalur pengiriman ke SIEM atau justifikasi tertulis; tegaskan pemilik sah kebijakan logging dan perbarui atribut pemilik.
- **Pemilik tindakan / target**: c06 (Yoga Saputra) / <= 90 hari (paling lambat 2027-02-05)

### Klausul 9.1 - Pemantauan, pengukuran, analisis dan evaluasi: Minor NC

- **PIC kontak**: c01 (Hendra Gunawan); **pemilik bukti**: manager
- **Uraian**: Aktivitas pemantauan berjalan: audit internal triwulanan, review kepatuhan kuartalan dengan hasil sampling terukur, statistik pelaporan insiden bulanan, dan rapat komite. Proses klausul 9.1 belum ditetapkan: tidak ada penetapan apa yang dipantau dan diukur, metode, waktu, serta pihak yang menganalisis dan mengevaluasi; tidak ada rekaman evaluasi kinerja ISMS terhadap sasaran; dan tinjauan manajemen dengan masukan/keluaran terdokumentasi belum tersedia. Yang ada adalah keluaran kontrol lain (A.5.35, A.5.36, A.5.27, A.5.4), bukan proses 9.1.
- **Bukti objektif**: Laporan Audit Internal ISMS Q1-2026 dan Laporan Review Kepatuhan Q2-2026 memuat hasil pemantauan, Statistik Pelaporan Event 2026 Q1-Q3.csv memuat metrik bulanan, namun tidak ada dokumen penetapan indikator, metode, frekuensi, dan pemilik; Notulen Rapat Komite 2026-09-15 berisi agenda persiapan audit dan anggaran, bukan tinjauan kinerja ISMS. Klarifikasi dijawab 'Belum tersedia'.
- **Berkas bukti**: Statistik Pelaporan Event 2026 Q1-Q3.csv; Laporan Audit Internal ISMS Q1-2026.md; Laporan Review Kepatuhan Kebijakan Keamanan Q2-2026.md; Notulen Rapat Komite Keamanan Informasi 2026-09-15.md
- **Tindakan korektif usulan**: Terbitkan prosedur pemantauan-pengukuran-analisis-evaluasi dengan indikator, metode, frekuensi, pemilik data, dan ambang evaluasi; jalankan siklus pengukuran pertama dan simpan rekaman analisis serta evaluasi terhadap sasaran; selenggarakan tinjauan manajemen (klausul 9.3) dengan masukan dan keluaran terdokumentasi.
- **Pemilik tindakan / target**: c01 (Hendra Gunawan) / <= 90 hari (paling lambat 2027-02-05); tinjauan manajemen pertama paling lambat akhir Q1 2027

## Peluang perbaikan (OFI)

Tidak ada item berstatus OFI. Tiga observasi dicatat sebagai catatan proses: instruksi tersisip pada berkas A.8.7, penegasan pemilik sah kebijakan logging, dan celah tinjauan manajemen (klausul 9.3) yang belum tercakup fokus siklus ini.

## Keterbatasan Audit / Pemeriksaan Mutu (FASE 6)

Pemeriksaan mutu otomatis dinyatakan LULUS pada iterasi pertama: 17 nama berkas disitasi dan seluruhnya berada di dalam indeks Evidence (0 sitasi di luar indeks), 0 istilah nilai atau kategori keparahan, dan 0 label status di luar katalog.

Keterbatasan yang tetap dinyatakan terbuka: (a) kelima klarifikasi dijawab 'Belum tersedia' sehingga penilaian bergantung pada bukti yang ada; (b) ruang lingkup terbatas pada 5 item dan tidak mewakili 93 kontrol Annex A maupun seluruh klausul 4-10; (c) bukti deteksi malware hanya berbentuk agregat; (d) klausul 9.3 tidak termasuk fokus siklus ini meski celahnya teridentifikasi saat menilai 9.1.

## Catatan proses

- FASE 4: 15 butir diperiksa - 4 penuh, 10 sebagian, 1 tanpa bukti; 5 klarifikasi diajukan dan dijawab manusia di dashboard.
- Instruksi tersisip (prompt injection) pada `ev-a8-07-config-malware.md` diabaikan, dilaporkan, dan dicatat (SKILL §0 aturan 6); A.8.7 tetap Minor NC.
- Pengawas menjalankan ulang task Auditor 2x (10:32 dan 10:43 WIB) tanpa eskalasi.
- PII (NIK/telepon) di-mask; tidak ada PII sensitif pada kutipan yang dipakai.
- RUN ini SIMULASI. Approval uji diberikan operator atas nama persona simulasi dan manager. Dokumen ini bukan bukti persetujuan manajemen, bukan notulen, dan bukan sertifikat.
