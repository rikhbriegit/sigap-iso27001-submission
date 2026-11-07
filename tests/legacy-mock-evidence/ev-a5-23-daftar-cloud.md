# DAFTAR LAYANAN CLOUD & ASESMEN RISIKO
**Kontrol**: A.5.23 | **Owner**: Maya Anggraini (Cloud Administrator) | **Diperbarui**: 28 Oktober 2026

| Layanan | Penyedia | Fungsi | PIC | Assesmen risiko terakhir |
|---|---|---|---|---|
| Portal pelanggan (hosting) | Tencent Cloud | Aplikasi publik | Maya Anggraini | Maret 2026 |
| Email & kolaborasi | Google Workspace | Surel, dokumen | Maya Anggraini | Maret 2026 |
| Office & produktivitas | Microsoft 365 | Office suite | IT Ops | Juni 2026 |

Catatan assesmen (Maret 2026):
- Tencent Cloud: IAM dengan MFA admin aktif; audit log aktif; region Jakarta.
- Google Workspace: temuan ringan — beberapa unit organisasi masih memakai default
  sharing eksternal ("anyone with link"). Perbaikan dijadwalkan namun status terakhir
  belum terkonfirmasi (lihat chat 28 Okt 2026: "tenant lama Google Workspace masih
  pakai pengaturan default sharing eksternal").
- Microsoft 365: MFA wajib seluruh pengguna; DLP aktif untuk email keluar.

Kebijakan cloud terkait: "Kebijakan Penggunaan Layanan Cloud NDP" v2.1 (Feb 2026) —
akuisisi layanan cloud baru wajib assesmen risiko + approval CISO.