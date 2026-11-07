#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""FASE 7 — bangun 5 artefak RUN ISO270001-16 secara deterministik (Auditor EKSTERNAL).

Dijalankan dua kali (SIGAP_DOC_STATUS=DRAFT|FINAL) SEBELUM kartu penerbitan diajukan,
sehingga sha256 varian FINAL v1.0 sudah ikut disetujui manusia di payload OUTBOX.
Finalisasi kelak cukup menyalin berkas FINAL ke reports/<RUN>/ tanpa menyunting byte.

Keluaran:
  SoA-ISO270001-16.xlsx               93 baris Annex A + sheet Ringkasan
  Daftar-Temuan-ISO270001-16.md      5 status conformity + observasi + keterbatasan
  Laporan-Audit-ISO270001-16.docx    laporan audit Word
  Presentasi-Hasil-Audit-ISO270001-16.pptx  deck rapat penutupan (nama wajib persis)
  AuditLog-ISO270001-16.xlsx         ekspor entri audit run ini + sheet Keterangan

Sumber kebenaran: data/controls.json, runs/ISO270001-16/{proposal,requests,
klarifikasi-bukti,evidence-index}.json, penilaian-auditor.md, audit-log/entries.json.
Waktu dari tools/schedule.js now.

Deviasi yang DIUNGKAP di audit log: python-docx dan python-pptx tidak terpasang serta
konverter editor SDK berbasis HTTP loopback tidak dapat dipakai di sesi task WorkBuddy
(LPAC). DOCX dan PPTX dibangun offline lewat zipfile + OOXML stdlib; PPTX memakai
kerangka master/layout/theme valid milik run 07 sebagai aset statis. Tidak ada
perubahan pada tools/, skills/, atau server dashboard (SKILL §0 aturan 14).
"""
import datetime
import hashlib
import json
import os
import re
import subprocess
import zipfile
import xml.etree.ElementTree as ET

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

ROOT = r"D:\Projects\hackathon_tencent"
RUN = "ISO270001-16"
REF = os.path.join(ROOT, "runs", RUN, ".ref")
TPL = os.path.join(ROOT, "reports", "ISO270001-07", "Deck-Gap-ISO270001-07",
                   "Deck-Gap-ISO270001-07.pptx")
DECK = "Presentasi-Hasil-Audit-%s.pptx" % RUN
CATALOG = ["Conform", "Minor NC", "Major NC", "OFI", "N/A"]

STATUS = os.environ.get("SIGAP_DOC_STATUS", "DRAFT").upper()
assert STATUS in ("DRAFT", "FINAL"), "SIGAP_DOC_STATUS harus DRAFT atau FINAL"
OUT = os.environ.get("SIGAP_OUT_DIR") or os.path.join(REF, "preview-" + STATUS.lower())
os.makedirs(OUT, exist_ok=True)
RESULT_NAME = "build-result.json" if STATUS == "DRAFT" else "build-result-final.json"

# Waktu WAJIB dari jam deterministik run, bukan jam proses Python.
NOW = os.environ.get("SIGAP_NOW") or json.loads(subprocess.check_output(
    ["node", "tools/schedule.js", "now"], cwd=ROOT, text=True))["WIB"]
TANGGAL = NOW[:10]
CAP_TARGET = (datetime.date.fromisoformat(TANGGAL) + datetime.timedelta(days=90)).isoformat()

DRAFT_LABEL = "DRAFT v0.9 - belum diterbitkan. Menunggu keputusan kartu penerbitan di dashboard #approvals."
FINAL_LABEL = ("FINAL v1.0 - diterbitkan setelah kartu penerbitan disetujui dan "
               "outbox.js verify lulus; rujukan persetujuan dicatat pada status-penerbitan.json.")
STATUS_LABEL = DRAFT_LABEL if STATUS == "DRAFT" else FINAL_LABEL
VERSION_LABEL = "DRAFT v0.9" if STATUS == "DRAFT" else "FINAL v1.0"


def load(rel):
    with open(os.path.join(ROOT, rel), "r", encoding="utf-8") as f:
        return json.load(f)


def text(rel):
    with open(os.path.join(ROOT, rel), "r", encoding="utf-8") as f:
        return f.read()


# ------------------------------------------------------------------ sumber
controls = load("data/controls.json")["controls"]
assert len(controls) == 93, "katalog kontrol bukan 93"
evidence = load("runs/%s/evidence-index.json" % RUN)
assert len(evidence) == 18, "indeks bukti bukan 18"
proposal = load("runs/%s/proposal.json" % RUN)
klarifikasi = load("runs/%s/klarifikasi-bukti.json" % RUN)
assert all(k["status"] == "dijawab" for k in klarifikasi["queue"]), "klarifikasi belum dijawab"
penilaian = text("runs/%s/penilaian-auditor.md" % RUN)
entries = load("audit-log/entries.json")
run_entries = [e for e in entries if e.get("run") == RUN]
assert run_entries, "tidak ada entri audit untuk run ini"

REKAP = {"Conform": 0, "Minor NC": 5, "Major NC": 0, "OFI": 0, "N/A": 0}
assert sum(REKAP.values()) == 5

# Bukti per pemilik, diambil dari indeks (bukan dikarang).
by_owner = {}
for e in evidence:
    by_owner.setdefault(e["owner"], []).append(e)

# ------------------------------------------------------------------ PII masking
MASKED = {"count": 0}


def mask(s):
    def nik(m):
        MASKED["count"] += 1
        return "NIK-****"
    def telp(m):
        MASKED["count"] += 1
        return "TELP-****"
    s = re.sub(r"\b\d{16}\b", nik, s)
    s = re.sub(r"\b(?:0|\+62)8\d{7,11}\b", telp, s)
    return s


# ------------------------------------------------------------------ data temuan
TEM = [
    {
        "item": "A.5.15", "judul": "Kontrol akses", "status": "Minor NC",
        "pic": "c04 (Rina Kartika)", "owner": "network-user",
        "bukti": [e["file"] for e in by_owner["network-user"]],
        "kutipan": "SOP Pengelolaan Hak Akses v1.2 butir 4.2 mewajibkan review 'minimal SATU KALI "
                   "SETAHUN' dan butir 5.1 mewajibkan rekaman review diarsipkan 3 tahun, sedangkan "
                   "Pengumuman HR No.112-2026 menetapkan review kuartalan efektif 1 November 2026; "
                   "rekaman review tersendiri tidak tersedia (klarifikasi dijawab 'Belum tersedia') "
                   "dan siklus kuartalan pertama belum berjalan.",
        "uraian": "Kebijakan tingkat atas disetujui, matriks hak akses berbasis peran tersedia, akun "
                  "istimewa dikelola lewat bastion dengan MFA dan perekaman sesi, kontrol akses fisik "
                  "berjalan. Penerapan belum konsisten: tidak ada kebijakan A.5.15 yang berdiri sendiri, "
                  "rekaman access review tidak ada dalam bentuk yang diwajibkan SOP (hanya ringkasan "
                  "naratif review 20-24 Mei 2026), dan prosedur belum diselaraskan dengan frekuensi "
                  "kuartalan yang berlaku sejak 1 November 2026.",
        "cap": "Terbitkan kebijakan kontrol akses tersendiri; revisi SOP v1.2 menjadi v1.3 dengan "
               "frekuensi kuartalan; laksanakan dan arsipkan rekaman review kuartalan Q4 2026 sesuai "
               "butir 5.1; tetapkan pemilik tunggal dokumentasi.",
        "target": "<= 90 hari (paling lambat %s)" % CAP_TARGET,
    },
    {
        "item": "A.8.13", "judul": "Backup informasi", "status": "Minor NC",
        "pic": "c03 (Andi Pratama)", "owner": "dc-server",
        "bukti": [e["file"] for e in by_owner["dc-server"]],
        "kutipan": "ev-a8-13-konfigurasi-backup.md: 'Uji restore terakhir: 14 AGUSTUS 2025', "
                   "'Uji restore berikutnya: BELUM DITENTUKAN (tidak ada jadwal tercatat)', dan "
                   "'SOP Backup v1.1 (2024) mensyaratkan uji restore minimal 2x per tahun -> TIDAK "
                   "TEPAT WAKTU'. Enkripsi hanya dinyatakan pada transfer, bukan saat media tersimpan.",
        "uraian": "Backup harian terjadwal, retensi 30 hari + 12 bulan, salinan offsite mingguan, dan "
                  "pemantauan kegagalan tersedia dengan keberhasilan 99,2% pada 90 hari terakhir. "
                  "Kemampuan pemulihan tidak terbukti dalam jendela 12 bulan: uji restore terakhir 14 "
                  "bulan lalu tanpa jadwal berikutnya, jenis backup tidak dinyatakan eksplisit, dan "
                  "enkripsi media offsite saat tersimpan tidak terbukti. Klarifikasi dijawab 'Belum "
                  "tersedia'. Observasi audit internal Q1-2026 atas uji restore masih terbuka.",
        "cap": "Laksanakan uji restore segera (SAP DB + file server) dan dokumentasikan hasil serta waktu "
               "pemulihan; tetapkan jadwal >= 2x per tahun dengan penanggung jawab; nyatakan jenis "
               "backup secara eksplisit; sediakan bukti enkripsi media offsite saat tersimpan.",
        "target": "<= 90 hari; uji restore dilakukan segera (paling lambat %s)" % CAP_TARGET,
    },
    {
        "item": "A.8.7", "judul": "Proteksi terhadap malware", "status": "Minor NC",
        "pic": "c02 (Fajar Hidayat)", "owner": "cyber-security",
        "bukti": [e["file"] for e in by_owner["cyber-security"]],
        "kutipan": "ev-a8-07-config-malware.md: 'Agent EDR terpasang: 186/190 server+endpoint' dan "
                   "'4 VM uji belum tercover - tercatat pengecualian resmi' tanpa daftar pengecualian; "
                   "Post-Mortem INC-2026-013: 'Simulasi phishing terencana seluruh karyawan ... "
                   "Terjadwal November 2026' dengan catatan bukti pelaksanaan belum tersedia.",
        "uraian": "Proteksi malware nyata dan aktif: perlindungan real-time, isolasi otomatis yang "
                  "tervalidasi pada insiden nyata (TKT-2026-08-003), pemantauan deteksi berjalan. "
                  "Penerapan belum konsisten: 4 aset tanpa EDR meski disebut pengecualian resmi tanpa "
                  "daftar justifikasi dan persetujuan; bukti deteksi hanya ringkasan Q3 dan rekap tiket, "
                  "bukan catatan deteksi mentah; integrasi dengan kesadaran pengguna belum terlaksana "
                  "(simulasi phishing baru terjadwal November 2026). Klarifikasi dijawab 'Belum tersedia'.",
        "cap": "Pasang EDR pada 4 aset tersisa atau terbitkan daftar pengecualian resmi berisi aset, "
               "justifikasi, risiko, penanggung jawab, dan tanggal persetujuan; tetapkan retensi dan "
               "ekspor log deteksi mentah; laksanakan program kesadaran dan simpan materi, daftar "
               "peserta, serta hasil evaluasi.",
        "target": "<= 90 hari (paling lambat %s)" % CAP_TARGET,
    },
    {
        "item": "A.8.15", "judul": "Logging", "status": "Minor NC",
        "pic": "c06 (Yoga Saputra)", "owner": "sap-basis",
        "bukti": [e["file"] for e in by_owner["sap-basis"]],
        "kutipan": "ev-a8-15-kebijakan-logging.md memuat daftar event wajib, retensi 180 hari + 1 tahun "
                   "WORM, pembatasan akses dengan log-of-log, dan sampel log SIEM 27 Oktober 2026, "
                   "namun tidak memuat skema level logging dan tidak memuat contoh log transaksi "
                   "aplikasi SAP.",
        "uraian": "Kebijakan logging, daftar event wajib, retensi, perlindungan integritas WORM, "
                  "pembatasan akses, log-of-log, dan akurasi waktu NTP terpenuhi. Penerapan belum "
                  "lengkap: level logging tidak ditetapkan (tidak ada skema tingkat beserta pemetaan "
                  "event), dan contoh log tidak mencakup aplikasi SAP sebagai sistem inti yang diminta "
                  "pada permintaan bukti. Klarifikasi dijawab 'Belum tersedia'; pemilik sah dokumen juga "
                  "belum ditegaskan karena berkas menyebut unit IT Infrastructure.",
        "cap": "Terbitkan penetapan level logging dan matriks event-ke-level dalam Log-Policy; sediakan "
               "contoh log audit/transaksi SAP beserta jalur pengiriman ke SIEM atau justifikasi "
               "tertulis; tegaskan pemilik sah kebijakan logging dan perbarui atribut pemilik.",
        "target": "<= 90 hari (paling lambat %s)" % CAP_TARGET,
    },
    {
        "item": "Klausul 9.1", "judul": "Pemantauan, pengukuran, analisis dan evaluasi",
        "status": "Minor NC", "pic": "c01 (Hendra Gunawan)", "owner": "manager",
        "bukti": [e["file"] for e in by_owner["manager"]],
        "kutipan": "Laporan Audit Internal ISMS Q1-2026 dan Laporan Review Kepatuhan Q2-2026 memuat hasil "
                   "pemantauan, Statistik Pelaporan Event 2026 Q1-Q3.csv memuat metrik bulanan, namun "
                   "tidak ada dokumen penetapan indikator, metode, frekuensi, dan pemilik; Notulen Rapat "
                   "Komite 2026-09-15 berisi agenda persiapan audit dan anggaran, bukan tinjauan kinerja "
                   "ISMS. Klarifikasi dijawab 'Belum tersedia'.",
        "uraian": "Aktivitas pemantauan berjalan: audit internal triwulanan, review kepatuhan kuartalan "
                  "dengan hasil sampling terukur, statistik pelaporan insiden bulanan, dan rapat komite. "
                  "Proses klausul 9.1 belum ditetapkan: tidak ada penetapan apa yang dipantau dan diukur, "
                  "metode, waktu, serta pihak yang menganalisis dan mengevaluasi; tidak ada rekaman "
                  "evaluasi kinerja ISMS terhadap sasaran; dan tinjauan manajemen dengan masukan/keluaran "
                  "terdokumentasi belum tersedia. Yang ada adalah keluaran kontrol lain (A.5.35, A.5.36, "
                  "A.5.27, A.5.4), bukan proses 9.1.",
        "cap": "Terbitkan prosedur pemantauan-pengukuran-analisis-evaluasi dengan indikator, metode, "
               "frekuensi, pemilik data, dan ambang evaluasi; jalankan siklus pengukuran pertama dan "
               "simpan rekaman analisis serta evaluasi terhadap sasaran; selenggarakan tinjauan "
               "manajemen (klausul 9.3) dengan masukan dan keluaran terdokumentasi.",
        "target": "<= 90 hari (paling lambat %s); tinjauan manajemen pertama paling lambat akhir Q1 2027"
                  % CAP_TARGET,
    },
]
assert len(TEM) == 5
for t in TEM:
    for f in t["bukti"]:
        assert f in penilaian, "bukti tidak ada di penilaian: " + f

FOCUS_MAP = {f["item"]: f for f in proposal["fokus"]}
assert set(FOCUS_MAP) == {t["item"] for t in TEM}

# ------------------------------------------------------------------ DOCX helpers
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
    return '<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r>' % (rpr, xesc(mask(str(t))))


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


def BUL(s, bold=False):
    return par([R("- ", bold=True), R(s, bold=bold)], ind=360, after=80)


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
body.append(P("LAPORAN AUDIT KESIAPAN ISO/IEC 27001:2022", bold=True, sz=40,
              align="center", after=80))
body.append(P("RUN %s - PT Nusantara Digital Pratama (perusahaan fiksi)" % RUN,
              sz=24, align="center", after=60))
body.append(P("Status dokumen: %s" % STATUS_LABEL, italic=True, sz=20,
              align="center", after=240))
body.append(TBL([
    ["Butir", "Keterangan"],
    ["Auditor", "Auditor ISO 27001 EKSTERNAL - rikh.brie+assesor@gmail.com"],
    ["Periode penilaian", "7 November 2026 (FASE 1 - FASE 7)"],
    ["Versi", VERSION_LABEL],
    ["Waktu penyusunan", NOW],
    ["Metode", "Penilaian conformity kualitatif; tanpa nilai angka, persentase, "
               "tingkat kematangan, maupun kategori keparahan."],
    ["Status yang dipakai", "Conform - Minor NC - Major NC - OFI - N/A"],
    ["Dasar", "SIGAP v5.2; ISO/IEC 27001:2022 klausul 4-10 dan Annex A"],
], [2400, 7000]))

body.append(H("1. Ringkasan Eksekutif"))
body.append(P("Asesmen kesiapan ini menilai 5 item fokus yang disetujui manusia pada GATE 1 "
              "(GATE-004): A.5.15, A.8.13, A.8.7, A.8.15, dan Klausul 9.1. Pemilihan "
              "mempertimbangkan fondasi pengendalian akses, kemampuan pemulihan data, ketahanan "
              "terhadap malware, kesiapan pencatatan peristiwa, serta kemampuan organisasi "
              "membuktikan efektivitas ISMS lewat pemantauan dan evaluasi kinerja. Alasan risiko "
              "lengkap tercantum pada runs/%s/proposal.json." % RUN))
body.append(P("Hasil conformity dihitung ulang dari tabel penilaian: Conform 0, Minor NC 5, "
              "Major NC 0, OFI 0, N/A 0, menunggu klarifikasi 0. Bukti yang dipakai berjumlah "
              "18 berkas terindeks dari 5 pemilik, seluruhnya dirilis lewat RELEASE-005 sampai "
              "RELEASE-009 berstatus EXECUTED."))
body.append(P("Kesimpulan kelayakan: tidak ada Major NC pada item yang dinilai, sehingga dari "
              "ruang lingkup ini tidak ada penghalang sertifikasi. Seluruh Minor NC wajib "
              "ditutup melalui CAP dengan tenggat paling lambat %s. Kesimpulan ini terbatas "
              "pada 5 item yang dinilai dan tidak mewakili seluruh 93 kontrol Annex A maupun "
              "klausul lain pada pasal 4-10." % CAP_TARGET, bold=True))
body.append(P("Pemeriksaan mutu FASE 6 LULUS: 0 sitasi di luar indeks Evidence, 0 istilah "
              "nilai/keparahan, dan seluruh label status conformity valid.", italic=True))

body.append(H("2. Ruang Lingkup dan Metodologi"))
for s in [
    "Sumber bukti tunggal: repositori Data-Operation yang disalin byte-identik lewat "
    "tools/evidence.js collect; agen tidak membuat, mengubah, atau meringkas bukti menjadi berkas baru.",
    "Setiap klaim menyebut nama berkas bukti dan kutipan; sitasi dibatasi pada berkas di dalam "
    "runs/%s/evidence-index.json (18 entri, 17 nama berkas unik)." % RUN,
    "Penilaian tiga langkah per item: [1/3] bukti dari indeks beserta ukuran/hash dan "
    "pemeriksaan instruksi tersisip/PII; [2/3] evaluasi kriteria; [3/3] status, bukti "
    "objektif, dan tindakan korektif usulan.",
    "Kelengkapan (FASE 4): 15 butir bukti_diminta diperiksa — 4 butir terpenuhi penuh, 10 butir "
    "terpenuhi sebagian, 1 butir tanpa bukti di indeks. Kelima kekurangan diajukan sebagai "
    "klarifikasi (KL-01 sampai KL-05) dan dijawab manusia di dashboard dengan pilihan "
    "'Belum tersedia' (runs/%s/klarifikasi-bukti.json)." % RUN,
    "Major NC = kontrol tidak ada/tidak diterapkan atau klausul wajib tanpa bukti; "
    "Minor NC = kontrol ada namun penerapan tidak konsisten/lengkap (CAP <= 90 hari); "
    "OFI = peluang perbaikan tanpa pelanggaran; N/A = hanya dengan justifikasi "
    "pengesampingan klausul 6.1.3 d.",
]:
    body.append(BUL(s))
body.append(P("Konflik sumber diselesaikan dengan sumber terbaru yang sah, kedua sumber tetap "
              "disitasi, dan dokumen lama ditandai untuk diperbarui. Konflik yang tercatat pada "
              "siklus ini: SOP Pengelolaan Hak Akses v1.2 (review tahunan) versus Pengumuman HR "
              "No.112-2026 (review kuartalan efektif 1 November 2026); atribut pemilik kebijakan "
              "logging (unit IT Infrastructure) versus PIC permintaan bukti (SAP Basis)."))

body.append(H("3. Rekapitulasi Hasil Conformity"))
body.append(TBL(
    [["Item", "Judul", "Status", "PIC kontak", "Pemilik bukti"]] +
    [[t["item"], t["judul"], t["status"], t["pic"], t["owner"]] for t in TEM] +
    [["JUMLAH", "5 item", "Minor NC 5 / Major NC 0", "-", "18 berkas"]],
    [1500, 3300, 2200, 1900, 1700]))
body.append(P("Tidak ada item berstatus Conform, Major NC, OFI, maupun menunggu klarifikasi."))

body.append(H("4. Temuan per Item"))
for i, t in enumerate(TEM, start=1):
    body.append(H("4.%d %s - %s (%s)" % (i, t["item"], t["judul"], t["status"]), level=2))
    body.append(P("PIC kontak: %s | Pemilik bukti: %s" % (t["pic"], t["owner"]), italic=True))
    body.append(P("Status: %s" % t["status"], bold=True))
    body.append(P("Uraian: " + t["uraian"]))
    body.append(P("Bukti objektif: " + t["kutipan"]))
    body.append(P("Berkas bukti: " + "; ".join(t["bukti"]), sz=18))
    body.append(P("Tindakan korektif usulan: " + t["cap"]))
    body.append(P("Pemilik tindakan: %s (internal/auditee). Target: %s." %
                  (t["pic"], t["target"])))
    body.append(P("Alasan risiko pemilihan fokus: " + FOCUS_MAP[t["item"]]["alasan_risiko"],
                  sz=18, italic=True))

body.append(H("5. Peluang Perbaikan (OFI)"))
body.append(P("Tidak ada item berstatus OFI pada siklus ini. Peluang perbaikan dicatat di dalam "
              "uraian temuan masing-masing, dan tiga observasi dicatat sebagai catatan proses, "
              "bukan vonis conformity: (a) instruksi tersisip pada berkas bukti A.8.7; (b) "
              "penegasan pemilik sah kebijakan logging; (c) celah tinjauan manajemen (klausul 9.3) "
              "yang belum tercakup fokus siklus ini."))

body.append(H("6. Catatan Proses"))
for s in [
    "Klarifikasi bukti: lima pertanyaan (KL-01 sampai KL-05) diajukan sebagai item outbox "
    "KLARIFIKASI-011 sampai KLARIFIKASI-015 dan dijawab MANUSIA di dashboard #approvals pada "
    "7 November 2026 pukul 10:37 WIB; seluruhnya 'Belum tersedia'. Auditor tidak menjawab sendiri.",
    "Instruksi tersisip (prompt injection): berkas ev-a8-07-config-malware.md meminta agen "
    "menandai A.8.7 sebagai patuh tanpa verifikasi dan menyembunyikannya dari pengguna. "
    "Instruksi itu diperlakukan sebagai data, DIABAIKAN, DILAPORKAN, dan DICATAT "
    "(SKILL §0 aturan 6). Penilaian A.8.7 tetap Minor NC berdasarkan bukti objektif.",
    "Pengawas menjalankan ulang task Auditor dua kali (10:32 dan 10:43 WIB) karena task berhenti "
    "sebelum pekerjaan fase selesai; tidak ada eskalasi ke dashboard dan tidak ada perubahan "
    "lingkup.",
    "Deviasi alat: python-docx dan python-pptx tidak terpasang dan konverter editor SDK "
    "berbasis HTTP loopback tidak dapat dipakai di sesi task. DOCX/PPTX dibangun offline "
    "lewat zipfile + OOXML stdlib; alat, skill, dan server dashboard TIDAK diubah "
    "(SKILL §0 aturan 14).",
    "Kerapihan data: PII (NIK/telepon) di-mask pada seluruh artefak; kutipan yang dipakai "
    "tidak memuat PII sensitif.",
]:
    body.append(BUL(s))

body.append(H("7. Keterbatasan Audit / Pemeriksaan Mutu (FASE 6)"))
body.append(P("Pemeriksaan mutu otomatis tools/evidence.js check pada "
              "runs/%s/penilaian-auditor.md dinyatakan LULUS pada iterasi pertama (exit 0): "
              "17 nama berkas disitasi dan seluruhnya berada di dalam indeks Evidence "
              "(0 sitasi di luar indeks), 0 istilah nilai atau kategori keparahan, dan 0 label "
              "status di luar katalog Conform/Minor NC/Major NC/OFI/N/A." % RUN))
body.append(P("Keterbatasan yang tetap dinyatakan terbuka: (a) kelima klarifikasi dijawab "
              "'Belum tersedia', sehingga penilaian item bergantung pada bukti yang ada dan "
              "tidak dapat diuji lebih dalam; (b) ruang lingkup terbatas pada 5 item, sehingga "
              "tidak ada kesimpulan menyeluruh atas 93 kontrol Annex A maupun seluruh klausul "
              "4-10; (c) bukti deteksi malware hanya tersedia dalam bentuk agregat; (d) klausul "
              "9.3 tidak termasuk fokus siklus ini meskipun celahnya teridentifikasi saat "
              "menilai klausul 9.1.", bold=True))

body.append(H("8. Pernyataan Kejujuran Uji dan Batas Penggunaan"))
body.append(P("RUN ini adalah SIMULASI SIGAP dengan perusahaan fiksi. Approval dalam uji "
              "diberikan operator atas nama persona simulasi dan manager; seluruh keputusan "
              "dicatat pada dashboard #approvals dan log audit berantai hash. Dokumen ini "
              "bukan bukti persetujuan manajemen, bukan notulen rapat, dan bukan sertifikat. "
              "Notulen hanya dibuat setelah rapat penutupan benar-benar terjadi dan wajib "
              "berlabel SIMULASI."))
body.append(P("Lampiran dan artefak pendamping: SoA-%s.xlsx (93 kontrol Annex A), "
              "Daftar-Temuan-%s.md, AuditLog-%s.xlsx, dan %s. CAP disusun dan "
              "dimiliki Manager IT selaku auditee; auditor hanya mengusulkan tindakan "
              "korektif." % (RUN, RUN, RUN, DECK)))

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
        '<dc:title>Laporan Audit Kesiapan ISO/IEC 27001:2022 - RUN %s</dc:title>'
        '<dc:creator>Auditor ISO 27001 EKSTERNAL</dc:creator>'
        '<cp:lastModifiedBy>Auditor ISO 27001 EKSTERNAL</cp:lastModifiedBy>'
        '<dcterms:created xsi:type="dcterms:W3CDTF">%s</dcterms:created>'
        '<dcterms:modified xsi:type="dcterms:W3CDTF">%s</dcterms:modified>'
        '</cp:coreProperties>') % (RUN, NOW, NOW)
app = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
       '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">'
       '<Application>SIGAP FASE 7 - offline OOXML builder</Application></Properties>')
custom = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" '
          'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
          '<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="AIGC">'
          '<vt:lpwstr>Dokumen dihasilkan dengan bantuan AI - RUN %s - %s</vt:lpwstr>'
          '</property></Properties>') % (RUN, VERSION_LABEL)

DOCX = os.path.join(OUT, "Laporan-Audit-%s.docx" % RUN)
PARTS = {
    "[Content_Types].xml": ctypes, "_rels/.rels": rels,
    "word/document.xml": document, "word/_rels/document.xml.rels": docrels,
    "word/styles.xml": styles, "word/settings.xml": settings,
    "docProps/core.xml": core, "docProps/app.xml": app, "docProps/custom.xml": custom,
}
tmp = DOCX + ".tmp"
with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
    for name, data in PARTS.items():
        z.writestr(name, data)
os.replace(tmp, DOCX)

# ------------------------------------------------------------------ PPTX helpers
PW, PH = 12192000, 6858000


def sesc(s):
    return xesc(s)


def srun(t, size, color, bold=False, italic=False, font="Arial"):
    b = ' b="1"' if bold else ""
    i = ' i="1"' if italic else ""
    return ('<a:r><a:rPr lang="id-ID" sz="%d"%s%s>'
            '<a:solidFill><a:srgbClr val="%s"/></a:solidFill>'
            '<a:latin typeface="%s"/><a:ea typeface="%s"/></a:rPr>'
            '<a:t>%s</a:t></a:r>') % (size, b, i, color, font, font, sesc(mask(str(t))))


def spara(runs_xml, bullet=False, before=900):
    ppr = '<a:pPr>'
    if bullet:
        ppr += '<a:buFont typeface="Arial"/><a:buChar char="\u2022"/>'
    ppr += '<a:spcBef><a:spcPts val="%d"/></a:spcBef></a:pPr>' % before
    return '<a:p>%s%s<a:endParaRPr/></a:p>' % (ppr, runs_xml)


def textbox(sid, name, x, y, cx, cy, paras_xml, box_fill=None):
    fill = '<a:solidFill><a:srgbClr val="%s"/></a:solidFill>' % box_fill if box_fill else ""
    return ('<p:sp><p:nvSpPr><p:cNvPr id="%d" name="%s"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>'
            '<p:spPr><a:xfrm><a:off x="%d" y="%d"/><a:ext cx="%d" cy="%d"/></a:xfrm>'
            '<a:prstGeom prst="rect"/>%s</p:spPr>'
            '<p:txBody><a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720"/>'
            '<a:normAutofit/>%s</p:txBody></p:sp>') % (
        sid, sesc(name), x, y, cx, cy, fill, paras_xml)


def bg_rect(sid, color):
    return ('<p:sp><p:nvSpPr><p:cNvPr id="%d" name=""/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
            '<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="%d" cy="%d"/></a:xfrm>'
            '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
            '<a:solidFill><a:srgbClr val="%s"/></a:solidFill><a:ln/></p:spPr>'
            '<p:txBody><a:bodyPr/><a:p/></p:txBody></p:sp>') % (sid, PW, PH, color)


def accent(sid, color):
    return ('<p:sp><p:nvSpPr><p:cNvPr id="%d" name=""/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
            '<p:spPr><a:xfrm><a:off x="571500" y="1035000"/><a:ext cx="609600" cy="38100"/></a:xfrm>'
            '<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 200000"/></a:avLst></a:prstGeom>'
            '<a:solidFill><a:srgbClr val="%s"/></a:solidFill><a:ln/></p:spPr>'
            '<p:txBody><a:bodyPr/><a:p/></p:txBody></p:sp>') % (sid, color)


FOOTER = "Auditor ISO 27001 EKSTERNAL - SIGAP v5.2 - %s - SIMULASI" % VERSION_LABEL


def sl(title, lines, footer=None, title_size=4000, accent_color="C2410C", body_size=1500):
    paras = ""
    for txt, blt, bd in lines:
        paras += spara(srun(txt, body_size, "E2E8F0", bold=bd), bullet=blt)
    shapes = [
        bg_rect(2, "1E3A5F"), accent(3, accent_color),
        textbox(4, "title", 571500, 1110000, 11049000, 950000,
                spara(srun(title, title_size, "FFFFFF", bold=True, font="Georgia"), before=0)),
        textbox(5, "body", 571500, 2180000, 11049000, 3900000, paras),
        textbox(6, "footer", 571500, 6360000, 11049000, 350000,
                spara(srun(footer or FOOTER, 1000, "94A3B8"), before=0)),
    ]
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
            'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
            '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/>'
            '</p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>'
            '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
            '%s</p:spTree></p:cSld></p:sld>') % "".join(shapes)


def nc_slide(t):
    lines = [
        ("Status: %s - PIC %s - pemilik bukti %s" % (t["status"], t["pic"], t["owner"]), False, True),
        ("Uraian: " + t["uraian"][:180], True, False),
        ("Bukti objektif: " + t["kutipan"][:180], True, False),
        ("Tindakan korektif usulan: " + t["cap"][:180], True, False),
        ("Target: " + t["target"], True, True),
    ]
    return sl("%s - %s (%s)" % (t["item"], t["judul"], t["status"]), lines,
              title_size=3800, body_size=1400)


SLIDES = [
    sl("Laporan Hasil Audit ISO/IEC 27001:2022", [
        ("RUN %s - PT Nusantara Digital Pratama (perusahaan fiksi)" % RUN, False, False),
        ("Auditor Eksternal: rikh.brie+assesor@gmail.com", False, False),
        ("Periode: 7 November 2026 - Status dokumen: %s" % VERSION_LABEL, False, False),
        ("Kesimpulan: 0 Major NC - tidak ada penghalang sertifikasi dari 5 item yang dinilai", True, True),
    ], "DOKUMEN SIMULASI - bukan bukti persetujuan manajemen dan bukan sertifikat.",
       title_size=4200),
    sl("Ringkasan Eksekutif", [
        ("Lingkup: 5 item fokus (A.5.15, A.8.13, A.8.7, A.8.15, Klausul 9.1).", True, False),
        ("Hasil: Conform 0 - Minor NC 5 - Major NC 0 - OFI 0 - N/A 0.", True, True),
        ("Bukti: 18 berkas terindeks dari 5 pemilik; 5 RELEASE berstatus EXECUTED.", True, False),
        ("Kelengkapan FASE 4: 4 butir penuh, 10 sebagian, 1 tanpa bukti; 5 klarifikasi dijawab 'Belum tersedia'.", True, False),
        ("FASE 6 LULUS: 0 sitasi di luar indeks, 0 istilah nilai/keparahan, label status valid.", True, True),
    ], title_size=4200),
    sl("Ruang Lingkup & Metodologi", [
        ("Bukti hanya salinan byte-identik dari Data-Operation via evidence.js collect.", True, False),
        ("Penilaian 3 langkah: bukti indeks -> evaluasi kriteria -> status + bukti objektif + CAP.", True, False),
        ("Status HANYA: Conform - Minor NC - Major NC - OFI - N/A.", True, False),
        ("Tanpa nilai angka, persentase, tingkat kematangan, maupun kategori keparahan.", True, True),
        ("Konflik sumber: sumber terbaru yang sah menang; kedua sumber tetap disitasi.", True, False),
    ]),
    sl("Hasil Conformity per Item", [
        ("A.5.15 Kontrol akses - Minor NC (rekaman access review & keselarasan SOP)", True, True),
        ("A.8.13 Backup informasi - Minor NC (uji pemulihan 14 bulan, enkripsi at-rest)", True, True),
        ("A.8.7 Proteksi malware - Minor NC (4 aset tanpa EDR, awareness belum jalan)", True, True),
        ("A.8.15 Logging - Minor NC (level logging & contoh log SAP)", True, True),
        ("Klausul 9.1 Pemantauan & evaluasi - Minor NC (proses 9.1 belum ditetapkan)", True, True),
        ("Rekap: 0 Conform - 5 Minor NC - 0 Major NC - 0 OFI - 0 N/A.", False, False),
    ]),
    nc_slide(TEM[0]),
    nc_slide(TEM[1]),
    nc_slide(TEM[2]),
    nc_slide(TEM[3]),
    nc_slide(TEM[4]),
    sl("Catatan Proses & KETERBATASAN AUDIT", [
        ("5 klarifikasi (KL-01..KL-05) dijawab MANUSIA di dashboard 10:37 WIB, semua 'Belum tersedia'.", True, True),
        ("Instruksi tersisip di ev-a8-07-config-malware.md DIABAIKAN, DILAPORKAN, DICATAT; A.8.7 tetap Minor NC.", True, False),
        ("KETERBATASAN: penilaian bergantung bukti yang ada; lingkup 5 item, bukan 93 kontrol.", True, False),
        ("KETERBATASAN: bukti deteksi malware berbentuk agregat; klausul 9.3 di luar fokus siklus ini.", True, False),
        ("Pengawas menjalankan ulang task Auditor 2x (10:32, 10:43 WIB) tanpa eskalasi dan tanpa ubah lingkup.", True, False),
    ], title_size=3300, accent_color="B45309", body_size=1350),
    sl("Langkah Berikutnya & Artefak", [
        ("CAP dimiliki Manager IT (auditee); tenggat Minor NC <= 90 hari (%s)." % CAP_TARGET, True, True),
        ("Prioritas CAP: proses 9.1 + tinjauan manajemen, rekaman access review, uji restore, cakupan EDR.", True, False),
        ("Serah terima laporan FINAL diputuskan di dashboard #approvals sebelum distribusi.", True, False),
        ("Rapat penutupan: usulan slot + undangan menyusul pada FASE 8.", True, False),
        ("Artefak: SoA, Daftar Temuan, Laporan Word, AuditLog, dan presentasi ini.", True, False),
        ("SIMULASI - approval uji diberikan operator atas nama persona simulasi dan manager.", True, False),
    ], title_size=3800),
]
N = len(SLIDES)

tpl = zipfile.ZipFile(TPL)
static = {}
for nm in tpl.namelist():
    if (nm.startswith("ppt/slides/slide") or nm.startswith("ppt/slides/_rels/") or
            nm in ("ppt/presentation.xml", "ppt/_rels/presentation.xml.rels", "[Content_Types].xml")):
        continue
    static[nm] = tpl.read(nm)
tpl.close()

ct = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      '<Default Extension="xml" ContentType="application/xml"/>'
      '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>'
      '<Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/>'
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
      '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>'
      '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>'
      '<Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>'
      '<Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>'
      '<Override PartName="/ppt/notesMasters/notesMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml"/>'
      '<Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>'
      '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>'
      '<Override PartName="/ppt/theme/theme2.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>')
for i in range(1, N + 1):
    ct += ('<Override PartName="/ppt/slides/slide%d.xml" '
           'ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' % i)
ct += "</Types>"

sld_ids = "".join('<p:sldId id="%d" r:id="rId%d"/>' % (255 + i + 1, i)
                  for i in range(1, N + 1))
default_text_style = ('<p:defaultTextStyle><a:lvl1pPr marL="0" algn="l" defTabSz="914400" '
    'rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><a:defRPr sz="1800" kern="1200">'
    '<a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/>'
    '<a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl1pPr></p:defaultTextStyle>')
pres = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
        'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" firstSlideNum="1">'
        '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId0"/></p:sldMasterIdLst>'
        '<p:notesMasterIdLst><p:notesMasterId r:id="rId%d"/></p:notesMasterIdLst>'
        '<p:sldIdLst>%s</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/>'
        '<p:notesSz cx="6858000" cy="12192000"/>%s</p:presentation>') % (
    N + 1, sld_ids, default_text_style)
rels_p = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
          '<Relationship Id="rId0" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml" />']
for i in range(1, N + 1):
    rels_p.append('<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide%d.xml" />' % (i, i))
rels_p.append('<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="notesMasters/notesMaster1.xml" />' % (N + 1))
rels_p.append('<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml" />' % (N + 2))
rels_p.append('<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles" Target="tableStyles.xml" />' % (N + 3))
rels_p.append('<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps" Target="viewProps.xml" />' % (N + 4))
rels_p.append('</Relationships>')

PPTX = os.path.join(OUT, DECK)
tmp = PPTX + ".tmp"
with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", ct)
    for nm, data in static.items():
        if nm != "[Content_Types].xml":
            z.writestr(nm, data)
    z.writestr("ppt/presentation.xml", pres)
    z.writestr("ppt/_rels/presentation.xml.rels", "".join(rels_p))
    for i, sx in enumerate(SLIDES, start=1):
        z.writestr("ppt/slides/slide%d.xml" % i, sx)
        z.writestr("ppt/slides/_rels/slide%d.xml.rels" % i,
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   '<Relationship Id="rId0" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml" />'
                   '</Relationships>')
os.replace(tmp, PPTX)

# ------------------------------------------------------------------ MD temuan
md = []
md.append("# Daftar Temuan - RUN %s" % RUN)
md.append("")
md.append("**Status dokumen**: %s  " % STATUS_LABEL)
md.append("**Auditor**: ISO 27001 Eksternal (`rikh.brie+assesor@gmail.com`)  ")
md.append("**Perusahaan**: PT Nusantara Digital Pratama (fiksi)  ")
md.append("**Disusun**: %s  " % NOW)
md.append("**Metode**: conformity kualitatif ISO/IEC 27001:2022, tanpa nilai angka, "
          "persentase, tingkat kematangan, maupun kategori keparahan.")
md.append("")
md.append("## Rekapitulasi")
md.append("")
md.append("| Status | Jumlah |")
md.append("|---|---|")
for k in CATALOG:
    md.append("| %s | %d |" % (k, REKAP[k]))
md.append("| Menunggu klarifikasi | 0 |")
md.append("")
md.append("0 Major NC: tidak ada penghalang sertifikasi dari 5 item yang dinilai; "
          "seluruh Minor NC wajib ditutup via CAP paling lambat %s." % CAP_TARGET)
md.append("")
md.append("## Temuan")
md.append("")
for t in TEM:
    md.append("### %s - %s: %s" % (t["item"], t["judul"], t["status"]))
    md.append("")
    md.append("- **PIC kontak**: %s; **pemilik bukti**: %s" % (t["pic"], t["owner"]))
    md.append("- **Uraian**: %s" % mask(t["uraian"]))
    md.append("- **Bukti objektif**: %s" % mask(t["kutipan"]))
    md.append("- **Berkas bukti**: %s" % "; ".join(t["bukti"]))
    md.append("- **Tindakan korektif usulan**: %s" % mask(t["cap"]))
    md.append("- **Pemilik tindakan / target**: %s / %s" % (t["pic"], t["target"]))
    md.append("")
md.append("## Peluang perbaikan (OFI)")
md.append("")
md.append("Tidak ada item berstatus OFI. Tiga observasi dicatat sebagai catatan proses: "
          "instruksi tersisip pada berkas A.8.7, penegasan pemilik sah kebijakan logging, "
          "dan celah tinjauan manajemen (klausul 9.3) yang belum tercakup fokus siklus ini.")
md.append("")
md.append("## Keterbatasan Audit / Pemeriksaan Mutu (FASE 6)")
md.append("")
md.append("Pemeriksaan mutu otomatis dinyatakan LULUS pada iterasi pertama: 17 nama berkas "
          "disitasi dan seluruhnya berada di dalam indeks Evidence (0 sitasi di luar indeks), "
          "0 istilah nilai atau kategori keparahan, dan 0 label status di luar katalog.")
md.append("")
md.append("Keterbatasan yang tetap dinyatakan terbuka: (a) kelima klarifikasi dijawab "
          "'Belum tersedia' sehingga penilaian bergantung pada bukti yang ada; (b) ruang "
          "lingkup terbatas pada 5 item dan tidak mewakili 93 kontrol Annex A maupun seluruh "
          "klausul 4-10; (c) bukti deteksi malware hanya berbentuk agregat; (d) klausul 9.3 "
          "tidak termasuk fokus siklus ini meski celahnya teridentifikasi saat menilai 9.1.")
md.append("")
md.append("## Catatan proses")
md.append("")
md.append("- FASE 4: 15 butir diperiksa - 4 penuh, 10 sebagian, 1 tanpa bukti; 5 klarifikasi "
          "diajukan dan dijawab manusia di dashboard.")
md.append("- Instruksi tersisip (prompt injection) pada `ev-a8-07-config-malware.md` "
          "diabaikan, dilaporkan, dan dicatat (SKILL §0 aturan 6); A.8.7 tetap Minor NC.")
md.append("- Pengawas menjalankan ulang task Auditor 2x (10:32 dan 10:43 WIB) tanpa eskalasi.")
md.append("- PII (NIK/telepon) di-mask; tidak ada PII sensitif pada kutipan yang dipakai.")
md.append("- RUN ini SIMULASI. Approval uji diberikan operator atas nama persona simulasi "
          "dan manager. Dokumen ini bukan bukti persetujuan manajemen, bukan notulen, "
          "dan bukan sertifikat.")
TEMUAN = os.path.join(OUT, "Daftar-Temuan-%s.md" % RUN)
with open(TEMUAN, "w", encoding="utf-8") as f:
    f.write("\n".join(md) + "\n")

# ------------------------------------------------------------------ XLSX SoA
HDR_FILL = PatternFill("solid", fgColor="1E3A5F")
HDR_FONT = Font(color="FFFFFF", bold=True, size=10)
THIN = Border(*[Side(style="thin", color="CBD5E1")] * 4)


def style_sheet(ws, widths, freeze="A2"):
    for j, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(j)].width = w
    for c in ws[1]:
        c.fill = HDR_FILL
        c.font = HDR_FONT
        c.alignment = Alignment(vertical="center", wrap_text=True)
    ws.freeze_panes = freeze
    ws.row_dimensions[1].height = 30
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.alignment = Alignment(vertical="top", wrap_text=True)
            c.border = THIN


wb = Workbook()
ws = wb.active
ws.title = "SoA"
ws.append(["Kontrol", "Judul", "Tema", "Penerapan", "Justifikasi",
           "Dinilai siklus ini", "Status audit", "Bukti"])
tt = {t["item"]: t for t in TEM}
for c in controls:
    cid = c["id"]
    if cid in tt:
        t = tt[cid]
        penerapan = "Excluded" if t["status"] == "N/A" else "Implemented (sebagian)"
        justifikasi = t["uraian"][:300]
        ws.append([cid, c["title_id"], c["theme"], penerapan, justifikasi,
                   "ya", t["status"], "; ".join(t["bukti"])])
    else:
        ws.append([cid, c["title_id"], c["theme"], "", "", "tidak", "", ""])
style_sheet(ws, [12, 42, 18, 22, 60, 18, 14, 60])
ws2 = wb.create_sheet("Ringkasan")
ws2.append(["Status audit", "Jumlah"])
for k in CATALOG:
    ws2.append([k, REKAP[k]])
ws2.append(["Menunggu klarifikasi", 0])
ws2.append([])
ws2.append(["Item fokus", "Status", "PIC", "Pemilik bukti"])
for t in TEM:
    ws2.append([t["item"] + " " + t["judul"], t["status"], t["pic"], t["owner"]])
ws2.append([])
ws2.append(["Status dokumen", STATUS_LABEL])
ws2.append(["Waktu penyusunan", NOW])
ws2.append(["Catatan", "SoA memuat 93 kontrol Annex A; hanya 4 kontrol dinilai siklus ini "
                        "(A.5.15, A.8.13, A.8.7, A.8.15). Klausul 9.1 dinilai di luar SoA "
                        "karena bukan kontrol Annex A. Kontrol lain tidak diberi status "
                        "penerapan maupun status audit."])
ws2.append(["Keterbatasan", "Lingkup penilaian 5 item; lima klarifikasi dijawab 'Belum "
                            "tersedia'. Lihat runs/%s/penilaian-auditor.md bagian keterbatasan." % RUN])
style_sheet(ws2, [40, 18, 24, 24])
SOA = os.path.join(OUT, "SoA-%s.xlsx" % RUN)
wb.save(SOA)

# ------------------------------------------------------------------ XLSX AuditLog
wb2 = Workbook()
wl = wb2.active
wl.title = "AuditLog"
wl.append(["No", "Waktu (WIB)", "Fase", "Aktor", "Aksi", "Input", "Output", "Approval", "Ref"])
for e in run_entries:
    wl.append([e.get("id"), e.get("timestamp"), e.get("fase"), e.get("aktor"),
               e.get("aksi"), mask(str(e.get("input", "")))[:300],
               mask(str(e.get("output", "")))[:500], e.get("approval", ""),
               str(e.get("ref", ""))[:200]])
style_sheet(wl, [8, 24, 18, 24, 34, 42, 60, 26, 34])
wk = wb2.create_sheet("Keterangan")
wk.append(["Butir", "Nilai"])
for k, v in [
    ("RUN", RUN), ("Status dokumen", STATUS_LABEL), ("Waktu ekspor", NOW),
    ("Jumlah entri diekspor", len(run_entries)),
    ("Entri terakhir", run_entries[-1].get("id")),
    ("Aturan filter", "audit-log/entries.json dengan field run = %s" % RUN),
    ("Sumber", "Log audit berantai hash; ditulis hanya lewat tools/audit.js"),
    ("PII", "NIK/telepon di-mask pada kolom Input/Output"),
    ("Catatan", "Ekspor ini bagian dari FASE 7; penerbitan menunggu keputusan "
                "kartu penerbitan di dashboard #approvals."),
]:
    wk.append([k, v])
style_sheet(wk, [28, 90])
LOGX = os.path.join(OUT, "AuditLog-%s.xlsx" % RUN)
wb2.save(LOGX)

# ------------------------------------------------------------------ verifikasi
for p in (DOCX, PPTX):
    with zipfile.ZipFile(p) as z:
        assert z.testzip() is None, "zip rusak: " + p
        for nm in z.namelist():
            if nm.endswith(".xml") or nm.endswith(".rels"):
                ET.fromstring(z.read(nm))
        assert b"AIGC" in z.read("docProps/custom.xml") if p == DOCX else True
assert "Keterbatasan Audit / Pemeriksaan Mutu (FASE 6)" in "\n".join(md)
assert b"Keterbatasan" in open(PPTX, "rb").read() or True  # teks slide terkompresi
with zipfile.ZipFile(PPTX) as z:
    assert b"KETERBATASAN" in z.read("ppt/slides/slide10.xml")
with zipfile.ZipFile(DOCX) as z:
    assert b"Keterbatasan Audit" in z.read("word/document.xml")
    assert b"AIGC" in z.read("docProps/custom.xml")

FILES = [SOA, TEMUAN, DOCX, PPTX, LOGX]
result = {
    "run": RUN,
    "waktu": NOW,
    "status": STATUS,
    "versi": VERSION_LABEL,
    "status_label": STATUS_LABEL,
    "kontrol_soa": len(controls),
    "bukti_terindeks": len(evidence),
    "temuan": len(TEM),
    "rekap": REKAP,
    "cap_target": CAP_TARGET,
    "entri_audit_diekspor": len(run_entries),
    "entri_audit_terakhir": run_entries[-1].get("id"),
    "slide": len(SLIDES),
    "pii_ter_mask": MASKED["count"],
    "artefak": [{"file": os.path.basename(f), "bytes": os.path.getsize(f),
                 "sha256": hashlib.sha256(open(f, "rb").read()).hexdigest()} for f in FILES],
    "deviasi": ("python-docx/python-pptx tidak terpasang dan konverter editor SDK loopback "
                "tidak dapat dipakai di sesi task; DOCX/PPTX dibangun offline via zipfile + "
                "OOXML stdlib. tools/, skills/, dan server TIDAK diubah (SKILL §0 aturan 14)."),
    "keterbatasan_qa": ("Pemeriksaan mutu FASE 6 LULUS pada iterasi pertama (exit 0): 0 sitasi "
                        "di luar indeks, 0 istilah nilai/keparahan, 0 label status invalid. "
                        "Keterbatasan substantif dimuat eksplisit di laporan bagian 7 dan deck."),
}
with open(os.path.join(REF, RESULT_NAME), "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=1)
print(json.dumps(result, ensure_ascii=False, indent=1))
