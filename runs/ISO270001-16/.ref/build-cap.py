#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CAP (Corrective Action Plan) RUN ISO270001-16 - dokumen milik Manager IT (auditee).

Dasar: keputusan manusia pada SERAH_TERIMA-019 (2026-11-07 10:59:28 WIB)
"Terima laporan dan susun CAP". Substansi temuan diambil dari
reports/ISO270001-16/Daftar-Temuan-ISO270001-16.md (FINAL v1.0) - TIDAK diverdict ulang.
Manager tidak menilai conformity; dokumen ini hanya merencanakan tindakan.

Deviasi diungkap: python-docx tidak terpasang -> DOCX dibangun offline via zipfile +
OOXML stdlib. Tidak menyentuh tools/ atau server dashboard.
"""
import datetime
import json
import os
import subprocess
import zipfile

ROOT = r"D:\Projects\hackathon_tencent"
RUN = "ISO270001-16"
OUT_DIR = os.path.join(ROOT, "reports", RUN)
OUT = os.path.join(OUT_DIR, "CAP-%s.docx" % RUN)

NOW = os.environ.get("SIGAP_NOW") or json.loads(subprocess.check_output(
    ["node", "tools/schedule.js", "now"], cwd=ROOT, text=True))["WIB"]
TANGGAL = NOW[:10]
BATAS = (datetime.date.fromisoformat(TANGGAL) + datetime.timedelta(days=90)).isoformat()

WNS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def xesc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
             .replace('"', "&quot;").replace("'", "&apos;"))


def R(t, bold=False, italic=False, sz=None, color=None):
    props = ""
    if bold:
        props += "<w:b/>"
    if italic:
        props += "<w:i/>"
    if color:
        props += '<w:color w:val="%s"/>' % color
    if sz:
        props += '<w:sz w:val="%d"/><w:szCs w:val="%d"/>' % (sz, sz)
    rpr = "<w:rPr>%s</w:rPr>" % props if props else ""
    return '<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r>' % (rpr, xesc(str(t)))


def par(runs, style=None, after=120, ind=None, align=None):
    ppr = "<w:pPr>"
    if style:
        ppr += '<w:pStyle w:val="%s"/>' % style
    if ind:
        ppr += '<w:ind w:left="%d"/>' % ind
    if align:
        ppr += '<w:jc w:val="%s"/>' % align
    ppr += '<w:spacing w:after="%d"/></w:pPr>' % after
    return "<w:p>%s%s</w:p>" % (ppr, "".join(runs))


def P(s, bold=False, italic=False, sz=None, **kw):
    return par([R(s, bold=bold, italic=italic, sz=sz)], **kw)


def H(s, level=1):
    return par([R(s, bold=True, sz=32 if level == 1 else 26, color="1E3A5F")],
               style="Heading%d" % level, after=140)


def BUL(s, bold=False, ind=360):
    return par([R("- ", bold=True), R(s, bold=bold)], ind=ind, after=80)


def KV(label, value):
    return par([R(label + ": ", bold=True), R(value)], ind=0, after=70)


def TBL(rows, widths):
    borders = ("<w:tblBorders>" + "".join(
        '<w:%s w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>' % s
        for s in ("top", "left", "bottom", "right", "insideH", "insideV")) + "</w:tblBorders>")
    out = ['<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>%s</w:tblPr>' % borders]
    out.append("<w:tblGrid>%s</w:tblGrid>" % "".join(
        '<w:gridCol w:w="%d"/>' % w for w in widths))
    for i, row in enumerate(rows):
        out.append("<w:tr>")
        for j, cell in enumerate(row):
            out.append('<w:tc><w:tcPr><w:tcW w:w="%d" w:type="dxa"/></w:tcPr>' % widths[j]
                       + par([R(cell, bold=(i == 0), sz=18)], after=40) + "</w:tc>")
        out.append("</w:tr>")
    out.append("</w:tbl>")
    return "".join(out)


body = []
body.append(P("RENCANA TINDAKAN KOREKTIF (CAP)", bold=True, sz=40, align="center", after=80))
body.append(P("Audit Kesiapan ISO/IEC 27001:2022 - RUN %s" % RUN, sz=26, align="center", after=40))
body.append(P("PT Nusantara Digital Pratama (perusahaan fiksi)", sz=22, align="center", after=60))
body.append(P("Dokumen milik Manager IT selaku auditee - bukan dokumen auditor",
              sz=18, italic=True, align="center", after=200))

body.append(H("Kontrol Dokumen"))
body.append(TBL([
    ["Atribut", "Keterangan"],
    ["Judul", "CAP-%s - Rencana Tindakan Korektif atas 5 Minor NC" % RUN],
    ["Versi", "DRAFT v1.0"],
    ["Tanggal disusun", NOW],
    ["Penyusun / pemilik", "Manager IT (auditee), conversation ISO270001-16 Manager"],
    ["Dasar mandat", "Keputusan manusia pada SERAH_TERIMA-019, 2026-11-07 10:59:28 WIB: "
                     "\"Terima laporan dan susun CAP\" (dashboard #approvals)"],
    ["Sumber temuan", "reports/%s/Daftar-Temuan-%s.md (FINAL v1.0) dan "
                      "reports/%s/Laporan-Audit-%s.docx - status conformity TIDAK diubah "
                      "dan tidak dinilai ulang oleh Manager" % (RUN, RUN, RUN, RUN)],
    ["Batas waktu penutupan", "<= 90 hari, paling lambat %s" % BATAS],
    ["Status persetujuan", "Belum disetujui. Menunggu persetujuan Manager dan verifikasi "
                           "efektivitas oleh Auditor pada FASE 8."],
    ["Catatan terbuka", "Tenggat tinjauan manajemen klausul 9.3 pada daftar temuan "
                        "(< akhir Q1 2027) melewati batas 90 hari; lihat bagian 6."],
], [2000, 6800]))

body.append(H("1. Ringkasan"))
body.append(P("Audit RUN %s menghasilkan 5 Minor NC dan 0 Major NC pada 5 item yang dinilai. "
              "Tidak ada penghalang sertifikasi dari ruang lingkup ini, tetapi kelima Minor NC "
              "wajib ditutup melalui CAP paling lambat %s, sesuai klausul 10.1 ISO/IEC 27001:2022."
              % (RUN, BATAS)))
body.append(P("Urutan prioritas yang saya pilih sebagai auditee: A.8.13 lebih dahulu karena "
              "menyangkut kesanggupan memulihkan layanan bila terjadi gangguan; disusul "
              "Klausul 9.1 karena tanpa proses pengukuran yang ditetapkan, perbaikan kontrol lain "
              "tidak dapat dibuktikan berhasil; lalu A.8.7 (cakupan proteksi), A.5.15 "
              "(konsistensi prosedur review akses), dan A.8.15 (kelengkapan logging). Urutan ini "
              "adalah keputusan pengelolaan risiko oleh auditee, bukan penilaian tingkat keparahan "
              "oleh auditor - auditor tidak menetapkan peringkat keparahan."))
body.append(P("Kelima temuan berbagi satu pola yang sama dan itu perlu dikatakan terbuka: "
              "aktivitas kontrolnya berjalan, tetapi bukti pelaksanaannya tidak pernah dijadikan "
              "keluaran yang disimpan. Uji restore dilakukan lalu dilupakan, pengecualian EDR "
              "disepakati lisan, level logging dianggap urusan alat. Karena itu separuh tindakan "
              "di bawah bukan menambah kontrol baru, melainkan menetapkan siapa menyimpan apa."))

body.append(H("2. Rekapitulasi Rencana"))
body.append(TBL([
    ["Kontrol", "Inti temuan", "PIC", "Tenggat", "Status"],
    ["A.8.13", "Uji restore terakhir 14 bulan lalu tanpa jadwal berikutnya; enkripsi media "
               "off-site baru terbukti saat transfer", "c03", BATAS, "Belum dimulai"],
    ["Klausul 9.1", "Tidak ada penetapan indikator/metode/frekuensi/pemilik pengukuran; "
                    "tinjauan manajemen 9.3 belum terdokumentasi", "c01", BATAS, "Belum dimulai"],
    ["A.8.7", "4 aset tanpa EDR tanpa daftar pengecualian resmi; log deteksi hanya agregat; "
              "awareness belum terlaksana", "c02", BATAS, "Belum dimulai"],
    ["A.5.15", "SOP v1.2 masih tahunan vs Pengumuman HR 112/2026 (kuartalan); rekaman review "
               "tidak tersedia", "c04", BATAS, "Belum dimulai"],
    ["A.8.15", "Skema level logging tidak ditetapkan; contoh log aplikasi SAP tidak ada; "
               "pemilik dokumen belum tegas", "c06", BATAS, "Belum dimulai"],
], [1100, 4200, 700, 1500, 1300]))

FINDINGS = [
    {
        "kode": "A.8.13",
        "pic": "c03 (Andi Pratama)",
        "judul": "Backup informasi - kemampuan pemulihan belum terbukti",
        "temuan": "Backup harian 22:30 WIB, retensi 30 hari + 12 bulan mingguan, salinan off-site "
                  "mingguan, keberhasilan 99,2% dalam 90 hari. Namun uji restore terakhir "
                  "14 Agustus 2025 (14 bulan) dan jadwal berikutnya 'BELUM DITENTUKAN', sehingga "
                  "tidak memenuhi SOP Backup v1.1 yang mensyaratkan minimal 2x per tahun. Jenis "
                  "backup tidak dinyatakan eksplisit dan enkripsi media off-site baru dinyatakan "
                  "pada saat transfer, bukan saat tersimpan.",
        "akar": [
            "Uji restore diperlakukan sebagai kegiatan bila perlu, bukan kewajiban terjadwal "
            "dengan tanggal, pemilik, dan tempat menyimpan hasilnya.",
            "Tidak ada pemantauan kepatuhan terhadap SOP Backup itu sendiri, sehingga "
            "keterlambatan 14 bulan tidak pernah memicu peringatan siapa pun.",
            "Pernyataan konfigurasi (jenis backup, enkripsi at-rest) tidak pernah dituangkan, "
            "hanya terimplikasi dalam tindakan teknis sehari-hari.",
        ],
        "tindakan": [
            ("Laksanakan uji restore penuh untuk SAP DB dan file server utama; catat tanggal, "
             "RTO/RPO aktual, dan hasil verifikasi integritas data.", "2026-11-21"),
            ("Terbitkan SOP Backup v1.2: jadwal uji minimal 2x/tahun dengan tanggal kalender "
             "tetap (Q2 dan Q4), penanggung jawab, dan daftar bukti yang wajib diarsipkan.",
             "2026-12-04"),
            ("Daftarkan jadwal uji ke kalender operasi Data Center + pengingat 14 hari sebelum "
             "tenggat, agar ketergantungan pada ingatan orang hilang.", "2026-12-04"),
            ("Nyatakan jenis backup secara eksplisit dan buktikan enkripsi media off-site "
             "dalam keadaan tersimpan (konfigurasi/atestasi kunci), bukan hanya saat transfer.",
             "2026-12-18"),
        ],
        "bukti": [
            "Berita acara uji restore bertanggal dengan RTO/RPO aktual dan hasil verifikasi data.",
            "SOP Backup v1.2 + bukti pendaftaran jadwal di kalender operasi.",
            "Pernyataan jenis backup + bukti enkripsi at-rest media off-site Makassar.",
        ],
        "risiko": "Saat layanan terganggu, kemampuan memulihkan dalam waktu yang dijanjikan tidak "
                  "dapat dibuktikan; risiko gangguan berkepanjangan tetap terbuka.",
    },
    {
        "kode": "Klausul 9.1",
        "pic": "c01 (Hendra Gunawan)",
        "judul": "Pemantauan dan pengukuran - prosesnya belum ditetapkan",
        "temuan": "Aktivitas pemantauan berjalan (audit internal triwulanan, review kepatuhan "
                  "kuartalan, statistik insiden bulanan, rapat komite), tetapi tidak ada dokumen "
                  "yang menetapkan apa yang diukur, metode, frekuensi, pemilik data, dan ambang "
                  "evaluasi; tidak ada rekaman evaluasi kinerja ISMS terhadap sasaran; tinjauan "
                  "manajemen dengan masukan/keluaran terdokumentasi belum tersedia. Yang ada "
                  "adalah keluaran kontrol lain (A.5.35, A.5.36, A.5.27, A.5.4), bukan proses 9.1.",
        "akar": [
            "Pengukuran kinerja ISMS tumbuh sebagai efek samping kontrol lain, bukan sebagai "
            "proses yang dirancang - tidak ada dokumen yang pernah menetapkan indikator.",
            "Tanpa ambang evaluasi, angka yang terkumpul tidak bisa dinyatakan baik atau buruk, "
            "sehingga tidak menghasilkan keputusan.",
            "Rapat komite dipakai untuk agenda lain (persiapan audit, anggaran), sehingga "
            "tinjauan kinerja ISMS tidak pernah punya forum tersendiri.",
        ],
        "tindakan": [
            ("Terbitkan prosedur pemantauan-pengukuran-analisis-evaluasi: daftar indikator, "
             "metode, frekuensi, pemilik data, ambang evaluasi, dan format rekaman.",
             "2026-11-28"),
            ("Jalankan siklus pengukuran pertama memakai data yang sudah ada (statistik insiden, "
             "hasil audit internal Q1-2026, review kepatuhan Q2-2026) dan simpan rekaman "
             "analisis + evaluasi terhadap sasaran ISMS.", "2027-01-22"),
            ("Selenggarakan tinjauan manajemen (klausul 9.3) dengan masukan wajib dan keluaran "
             "terdokumentasi; usulan tanggal interim 2027-01-29 - lihat bagian 6 karena tenggat "
             "ini belum disepakati Auditor.", "2027-01-29"),
        ],
        "bukti": [
            "Prosedur 9.1 disetujui dengan tabel indikator-metode-frekuensi-pemilik-ambang.",
            "Rekaman siklus pengukuran pertama + evaluasi terhadap sasaran ISMS (bukan laporan "
            "aktivitas).",
            "Notulen tinjauan manajemen yang memuat masukan 9.3 dan keputusan keluaran.",
        ],
        "risiko": "Perbaikan kontrol tidak dapat dibuktikan berhasil atau gagal; keputusan "
                  "manajemen atas ISMS berjalan tanpa dasar pengukuran.",
    },
    {
        "kode": "A.8.7",
        "pic": "c02 (Fajar Hidayat)",
        "judul": "Proteksi malware - cakupan dan bukti deteksi belum lengkap",
        "temuan": "EDR real-time aktif, isolasi otomatis tervalidasi pada insiden nyata "
                  "(TKT-2026-08-003), pemantauan deteksi berjalan. Namun 186/190 aset tercakup: "
                  "4 VM uji disebut 'pengecualian resmi' tanpa daftar justifikasi dan persetujuan; "
                  "bukti deteksi hanya ringkasan Q3 dan rekap tiket, tanpa log mentah; integrasi "
                  "dengan kesadaran pengguna belum terlaksana (simulasi phishing terjadwal "
                  "November 2026).",
        "akar": [
            "Pengecualian cakupan diberikan secara operasional/lisan tanpa jalur persetujuan "
            "tertulis, sehingga tidak ada daftar yang bisa ditunjukkan saat diminta.",
            "Log deteksi dianggap konsekuensi alat, bukan deliverable yang perlu diekspor dan "
            "disimpan dengan retensi tertentu.",
            "Program awareness belum pernah dijadikan keluaran dengan materi, daftar peserta, "
            "dan evaluasi hasil.",
        ],
        "tindakan": [
            ("Pasang EDR pada 4 aset tersisa, atau terbitkan daftar pengecualian resmi berisi "
             "aset, justifikasi, risiko, penanggung jawab, dan tanggal persetujuan.",
             "2026-12-04"),
            ("Tetapkan retensi log deteksi dan prosedur ekspor; lampirkan satu contoh ekspor "
             "log mentah satu periode sebagai bukti.", "2027-01-15"),
            ("Laksanakan program awareness malware; simpan materi, daftar peserta, dan hasil "
             "evaluasi (kuis atau hasil simulasi).", "2027-01-15"),
        ],
        "bukti": [
            "Daftar pengecualian EDR bertanda tangan ATAU bukti cakupan 190/190.",
            "Berkas ekspor log deteksi mentah (bukan ringkasan kuartalan).",
            "Materi + daftar hadir + hasil evaluasi awareness.",
        ],
        "risiko": "Aset tanpa proteksi menjadi jalur masuk yang tidak terpantau; tanpa log mentah, "
                  " investigasi insiden bergantung pada ringkasan yang tidak dapat diuji ulang.",
    },
    {
        "kode": "A.5.15",
        "pic": "c04 (Rina Kartika)",
        "judul": "Kontrol akses - konsistensi prosedur review hak akses",
        "temuan": "Kebijakan tingkat atas disetujui (KSI v3.0), matriks akses berbasis peran, akun "
                  "istimewa lewat bastion dengan MFA dan perekaman sesi, kontrol akses fisik "
                  "berjalan. Namun tidak ada kebijakan A.5.15 yang berdiri sendiri; rekaman access "
                  "review tidak ada dalam bentuk yang diwajibkan SOP (hanya ringkasan naratif "
                  "review 20-24 Mei 2026); dan SOP v1.2 belum diselaraskan dengan frekuensi "
                  "kuartalan yang berlaku sejak 1 November 2026.",
        "akar": [
            "Tidak ada pemilik tunggal dokumentasi kontrol akses, sehingga ketentuan tersebar di "
            "tiga dokumen dan tidak ada yang merasa bertanggung jawab menyelaraskannya.",
            "Perubahan frekuensi diumumkan lewat Pengumuman HR, tetapi tidak diikuti revisi SOP "
            "induk - dua sumber aturan hidup bersamaan.",
            "Hasil review dianggap cukup diceritakan dalam SOP, bukan disimpan sebagai rekaman "
            "yang diwajibkan butir 5.1.",
        ],
        "tindakan": [
            ("Terbitkan kebijakan A.5.15 yang berdiri sendiri dan disetujui manajemen.",
             "2026-12-18"),
            ("Revisi SOP Pengelolaan Hak Akses v1.2 -> v1.3: butir 4.2 menjadi kuartalan, dengan "
             "riwayat revisi yang menyebut Pengumuman HR No.112/2026 sebagai dasar.", "2026-12-18"),
            ("Laksanakan review hak akses kuartal Q4 2026 dan arsipkan rekamannya (daftar akun "
             "ditinjau, keputusan, penanggung jawab, tanggal) sesuai butir 5.1.", "2027-01-30"),
            ("Tetapkan pemilik tunggal dokumentasi kontrol akses beserta kewajiban "
             "penyelarasannya.", "2026-12-18"),
        ],
        "bukti": [
            "Kebijakan A.5.15 dengan bukti persetujuan manajemen.",
            "SOP v1.3 dengan riwayat revisi dan butir 4.2 = kuartalan.",
            "Rekaman review Q4 2026 lengkap empat kolom wajib, diarsipkan.",
        ],
        "risiko": "Hak akses berlebih bertahan lebih lama dari yang dijanjikan kebijakan, dan "
                  "ketidaksesuaian tidak terdeteksi karena tidak ada rekaman yang bisa ditinjau.",
    },
    {
        "kode": "A.8.15",
        "pic": "c06 (Yoga Saputra)",
        "judul": "Logging - level logging dan cakupan aplikasi inti",
        "temuan": "Kebijakan logging, daftar event wajib, retensi 180 hari + 1 tahun WORM, "
                  "perlindungan integritas, pembatasan akses, log-of-log, dan akurasi waktu NTP "
                  "terpenuhi. Namun level logging tidak ditetapkan (tidak ada skema tingkat dan "
                  "pemetaan event-ke-level), dan contoh log tidak mencakup aplikasi SAP sebagai "
                  "sistem inti; pemilik sah dokumen juga belum ditegaskan.",
        "akar": [
            "Kebijakan logging disusun dari sisi infrastruktur/SIEM, sehingga aplikasi inti "
            "(SAP) tidak pernah masuk cakupan contoh maupun daftar event.",
            "Level logging dianggap urusan konfigurasi alat, bukan keputusan yang perlu "
            "didokumentasikan dan disetujui.",
            "Kepemilikan dokumen tidak pernah diperbarui setelah perubahan struktur unit, "
            "sehingga tertulis IT Infrastructure sementara pengelolanya SAP Basis.",
        ],
        "tindakan": [
            ("Terbitkan penetapan level logging (DEBUG/INFO/WARN/ERROR) beserta matriks "
             "event-ke-level di dalam Log-Policy.", "2026-12-18"),
            ("Sediakan contoh log audit/transaksi SAP bertanggal beserta jalur pengirimannya ke "
             "SIEM - atau justifikasi tertulis bila memang sengaja tidak dikirim.", "2027-01-15"),
            ("Tegaskan pemilik sah kebijakan logging dan perbarui atribut pemilik pada dokumen.",
             "2026-12-18"),
        ],
        "bukti": [
            "Log-Policy versi baru dengan skema level + matriks event-ke-level.",
            "Contoh log SAP yang dapat ditelusuri ke jalur pengiriman (atau justifikasi tertulis).",
            "Dokumen dengan atribut pemilik yang sudah benar.",
        ],
        "risiko": "Aktivitas pada sistem inti tidak terlihat pada tingkat detail yang dibutuhkan "
                  "investigasi, dan klasifikasi event tidak konsisten antar sistem.",
    },
]

body.append(H("3. Rincian Tindakan per Temuan"))
for f in FINDINGS:
    body.append(H("3.%d %s - %s" % (FINDINGS.index(f) + 1, f["kode"], f["judul"]), level=2))
    body.append(KV("Status auditor", "Minor NC (dikutip apa adanya dari daftar temuan FINAL v1.0)"))
    body.append(KV("PIC", f["pic"]))
    body.append(P("Temuan:", bold=True, after=60))
    body.append(P(f["temuan"], after=100))
    body.append(P("Akar masalah (hipotesis auditee - wajib dikonfirmasi PIC sebelum pelaksanaan):",
                  bold=True, after=60))
    for a in f["akar"]:
        body.append(BUL(a))
    body.append(P("", after=40))
    body.append(P("Tindakan korektif:", bold=True, after=60))
    body.append(TBL([["#", "Tindakan", "Tenggat"]] +
                    [["%d" % (i + 1), t, d] for i, (t, d) in enumerate(f["tindakan"])],
                    [500, 7100, 1200]))
    body.append(P("", after=60))
    body.append(P("Bukti objektif penerimaan:", bold=True, after=60))
    for b in f["bukti"]:
        body.append(BUL(b))
    body.append(KV("Tanggal verifikasi efektivitas",
                   "2027-01-29 (semua tindakan selesai dan bukti tersedia; penutupan resmi "
                   "paling lambat %s)" % BATAS))
    body.append(KV("Risiko bila tidak ditindak", f["risiko"]))

body.append(H("4. Tonggak Waktu"))
body.append(TBL([
    ["Tanggal", "Tonggak"],
    ["2026-11-21", "Uji restore penuh dilaksanakan (A.8.13) - bukti pertama tersedia"],
    ["2026-11-28", "Prosedur 9.1 terbit dengan tabel indikator-metode-frekuensi-pemilik-ambang"],
    ["2026-12-04", "EDR 190/190 atau daftar pengecualian resmi (A.8.7); SOP Backup v1.2 + "
                   "jadwal uji terdaftar (A.8.13)"],
    ["2026-12-18", "Kebijakan A.5.15 + SOP v1.3 (A.5.15); Log-Policy level + matriks (A.8.15); "
                   "bukti enkripsi at-rest off-site (A.8.13)"],
    ["2027-01-15", "Awareness malware + ekspor log deteksi mentah (A.8.7); contoh log SAP "
                   "(A.8.15)"],
    ["2027-01-22", "Siklus pengukuran pertama + rekaman evaluasi terhadap sasaran ISMS (9.1)"],
    ["2027-01-29", "Tinjauan manajemen interim (9.3) + verifikasi efektivitas oleh Auditor"],
    ["2027-01-30", "Rekaman review hak akses Q4 2026 diarsipkan (A.5.15)"],
    [BATAS, "Batas akhir 90 hari - seluruh Minor NC siap diverifikasi"],
], [1400, 7400]))

body.append(H("5. Tata Kelola Pelaksanaan"))
body.append(BUL("Rapat tinjauan CAP setiap dua minggu dipimpin Manager IT; status per tindakan "
                "dicatat sebagai Belum dimulai / Berjalan / Selesai / Terhambat."))
body.append(BUL("Setiap penyelesaian wajib disertai bukti objektif yang dapat diuji ulang, "
                "bukan pernyataan lisan atau tangkapan layar tanpa konteks."))
body.append(BUL("Keterlambatan satu tonggak dilaporkan pada rapat tinjauan berikutnya beserta "
                "rencana pemulihan; tidak ada perpanjangan tenggat tanpa persetujuan Manager dan "
                "pemberitahuan kepada Auditor."))
body.append(BUL("Perubahan status CAP dicatat pada log audit SIGAP sebagai aktor manager, "
                "sehingga jejaknya dapat diaudit."))
body.append(BUL("Verifikasi efektivitas dilakukan Auditor pada FASE 8 terhadap bukti objektif; "
                "Manager tidak menyatakan temuannya tertutup sendiri."))

body.append(H("6. Persoalan Terbuka yang Butuh Keputusan Auditor"))
body.append(P("Daftar temuan memberi tenggat tinjauan manajemen klausul 9.3 'paling lambat akhir "
              "Q1 2027' (2027-03-31), sedangkan CAP wajib tuntas <= 90 hari (%s). Kedua tanggal "
              "itu tidak dapat berlaku untuk temuan yang sama." % BATAS))
body.append(P("Usulan auditee: selenggarakan tinjauan manajemen interim pada 2027-01-29 yang "
              "memenuhi masukan dan keluaran klausul 9.3 secara minimal namun sah, lalu tinjauan "
              "penuh pada Maret 2027 sebagai siklus normal. Usulan ini BELUM disepakati dan bukan "
              "keputusan Manager. Bila Auditor menolak, temuan 9.1 harus diberi tenggat terpisah "
              "dan CAP ini dinyatakan tidak seluruhnya selesai dalam 90 hari - dicatat terbuka, "
              "bukan ditutupi dengan tanggal yang enak dilihat."))

body.append(H("7. Batas Penggunaan dan Kejujuran Uji"))
body.append(P("RUN ini adalah SIMULASI SIGAP dengan perusahaan fiksi. Persetujuan dalam uji "
              "diberikan operator atas nama persona simulasi dan manager, dan seluruh keputusan "
              "tercatat pada dashboard #approvals serta log audit berantai hash. Dokumen ini bukan "
              "bukti komitmen manajemen yang sesungguhnya, bukan notulen rapat, dan bukan "
              "sertifikat. CAP disusun oleh Manager IT selaku auditee; auditor tidak menyetujui "
              "isi rencana, hanya memverifikasi efektivitasnya pada FASE 8."))

body.append(H("8. Persetujuan"))
body.append(P("Disusun oleh Manager IT sebagai pemilik CAP. Verifikasi efektivitas dilakukan "
              "Auditor pada FASE 8 dengan merujuk bukti objektif pada bagian 3."))
body.append(TBL([
    ["Peran", "Nama / aktor", "Tanggal", "Status"],
    ["Penyusun (auditee)", "Manager IT - ISO270001-16 Manager", TANGGAL, "DRAFT v1.0"],
    ["Persetujuan", "Manager IT", "-", "Menunggu"],
    ["Verifikasi efektivitas", "Auditor ISO 27001 Eksternal", "2027-01-29", "Belum"],
], [2000, 3800, 1600, 1400]))

SECT = ('<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" '
        'w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>')
document = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:document xmlns:w="%s"><w:body>%s%s</w:body></w:document>'
            % (WNS, "".join(body), SECT))
styles = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          '<w:styles xmlns:w="%s"><w:docDefaults><w:rPrDefault><w:rPr>'
          '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/>'
          '</w:rPr></w:rPrDefault></w:docDefaults>'
          '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">'
          '<w:name w:val="Normal"/></w:style>'
          '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/>'
          '<w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="280" w:after="120"/>'
          '</w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="1E3A5F"/></w:rPr></w:style>'
          '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/>'
          '<w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="220" w:after="100"/>'
          '</w:pPr><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="1E3A5F"/></w:rPr></w:style>'
          '</w:styles>') % WNS
settings = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:settings xmlns:w="%s"><w:zoom w:percent="100"/></w:settings>') % WNS
ctypes = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
          '<Default Extension="xml" ContentType="application/xml"/>'
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
          '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
          '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'
          '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
          '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
          '<Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/>'
          '</Types>')
rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
        '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="docProps/custom.xml"/>'
        '</Relationships>')
docrels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
           '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
           '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
           '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>'
           '</Relationships>')
core = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" '
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
        '<dc:title>CAP RUN %s - Rencana Tindakan Korektif</dc:title>'
        '<dc:creator>Manager IT (auditee) - ISO270001-16</dc:creator>'
        '<cp:lastModifiedBy>Manager IT (auditee) - ISO270001-16</cp:lastModifiedBy>'
        '<dcterms:created xsi:type="dcterms:W3CDTF">%s</dcterms:created>'
        '<dcterms:modified xsi:type="dcterms:W3CDTF">%s</dcterms:modified>'
        '</cp:coreProperties>') % (RUN, NOW, NOW)
app = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
       '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">'
       '<Application>SIGAP CAP - offline OOXML builder</Application></Properties>')
custom = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" '
          'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
          '<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="AIGC">'
          '<vt:lpwstr>Dokumen dihasilkan dengan bantuan AI - RUN %s - DRAFT v1.0</vt:lpwstr>'
          '</property></Properties>') % RUN

PARTS = {
    "[Content_Types].xml": ctypes, "_rels/.rels": rels,
    "word/document.xml": document, "word/_rels/document.xml.rels": docrels,
    "word/styles.xml": styles, "word/settings.xml": settings,
    "docProps/core.xml": core, "docProps/app.xml": app, "docProps/custom.xml": custom,
}
os.makedirs(OUT_DIR, exist_ok=True)
tmp = OUT + ".tmp"
with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
    for name, data in PARTS.items():
        z.writestr(name, data)
os.replace(tmp, OUT)

print(json.dumps({"ok": True, "file": OUT, "now": NOW, "batas": BATAS,
                  "paragraf": len(body)}, ensure_ascii=False))
