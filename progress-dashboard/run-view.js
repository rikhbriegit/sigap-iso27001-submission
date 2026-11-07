// SIGAP v5.1 — manager overview: phase stepper + audited focus items + compact activity.
(function () {
  var PHASES = ["Engagement", "Usulan auditor", "GATE 1", "Pengumpulan bukti", "Kelengkapan", "Penilaian", "QA", "Laporan", "Penutupan"];
  var CLS = { "Conform": "t-ok", "Minor NC": "t-warn", "Major NC": "t-bad", "OFI": "t-mut", "N/A": "t-mut" };
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function short(t, n) { t = String(t || ""); return t.length > n ? t.slice(0, n - 1) + "…" : t; }
  function stepper(no) {
    var s = '<div class="steps">';
    PHASES.forEach(function (p, i) {
      var st = no == null ? "" : (i < no ? "done" : (i === no ? "now" : ""));
      s += '<div class="step ' + st + '"><span class="num">' + (i < no ? "✓" : i) + "</span><span>" + p + "</span></div>";
    });
    return s + "</div>";
  }
  window.renderRunOverview = function (el) {
    fetch("/api/run" + (new URLSearchParams(location.search).get("run") ? "?run=" + encodeURIComponent(new URLSearchParams(location.search).get("run")) : ""), { cache: "no-store" }).then(function (r) { return r.text(); }).then(function (txt) {
      if (txt === window.lastRun && el.innerHTML) return; window.lastRun = txt; var d = JSON.parse(txt);
      var fc0 = document.getElementById("fase");
      if (!d.run) {
        // no ACTIVE run: never show a stopped/finished run as if it were running (user, 6 Nov)
        if (fc0) fc0.textContent = "Belum ada audit berjalan";
        var L0 = d.last ? '<p class="ln">Run terakhir: <b>' + esc(d.last.run) + "</b> — " + esc(d.last.status || "") + (d.last.mulai ? " (mulai " + esc(String(d.last.mulai).slice(0, 16).replace("T", " ")) + ")" : "") + ".</p>" : "";
        el.innerHTML = '<div class="card"><div class="row"><span class="name">Belum ada audit berjalan</span></div>' + L0 +
          '<p class="ln">Audit baru dimulai dari chat Manager dengan perintah <b>mulai audit ISO 27001</b>. Begitu Manager mengalokasikan run baru, halaman ini langsung menampilkannya.</p></div>';
        return;
      }
      var fc = document.getElementById("fase"); if (fc && d.fase_no != null) fc.textContent = "FASE " + d.fase_no + " · " + PHASES[d.fase_no];
      // chip says what really happened to the run (a cancelled run is never "Selesai")
      if (d.ended && fc) { var es = String(d.endedStatus || ""); fc.textContent = (/dibatalkan/i.test(es) ? "Dibatalkan" : /dihentikan/i.test(es) ? "Dihentikan" : /selesai/i.test(es) && !/ditutup/i.test(es) ? "Selesai" : "Ditutup") + " · " + d.run; }
      var banner = d.ended ? '<div class="card" style="border-left:4px solid var(--ok, #2e9d6b)"><div class="row"><span class="name">' + esc(d.run) + ' — ' + esc(String(d.endedStatus || "ditutup")) + '</span><span class="ln">hanya baca</span></div><p class="ln">Run ini sudah ditutup. Semua hasil di bawah tetap tersedia. Audit baru dimulai dari chat Manager dengan <b>mulai audit ISO 27001</b>; begitu run baru dialokasikan, halaman ini pindah ke run itu.</p></div>' : "";
      // per-run dashboards (user): every run has its own URL ?run=ISO270001-NN; pick any run here
      var sel = (d.runs || []).length ? '<div class="card" style="padding:8px 14px"><span class="ln">Dashboard run: </span><select id="runsel" style="font:inherit;padding:2px 6px">' +
        d.runs.map(function (x) { return '<option value="' + esc(x.run) + '"' + (x.run === d.run ? " selected" : "") + ">" + esc(x.run) + (x.active ? " (aktif)" : (x.status ? " — " + esc(short(x.status, 40)) : "")) + "</option>"; }).join("") +
        '</select> <span class="ln">alamat: ?run=' + esc(d.run) + '#manager</span></div>' : "";
      var s = sel + banner + '<div class="card"><div class="row"><span class="name">' + esc(d.run) + "</span><span class=\"ln\">diperbarui " + esc(String(d.updated_at).slice(11, 16)) + " WIB</span></div>" + stepper(d.fase_no) + "</div>";
      // who is working right now (user request): every agent of the run with a status icon, derived from system traces
      if ((d.agents || []).length) {
        s += '<div class="card"><div class="row"><span class="name">Agen di run ini</span><span class="ln">🟢 bekerja · 🟡 menunggu Anda · 🔴 macet · ⚪ siaga · ✅ selesai</span></div><table class="items"><tr><th></th><th>Agen</th><th>Status saat ini</th><th>Terakhir aktif</th></tr>';
        d.agents.forEach(function (a) {
          s += '<tr><td style="font-size:18px;text-align:center">' + a.icon + '</td><td><b>' + esc(a.name.replace(d.run + " ", "")) + '</b><br><span class="ln">' + esc(a.role) + '</span></td><td><span class="tag ' + a.cls + '">' + esc(short(a.status, 90)) + '</span>' + (a.hint ? '<br><span class="ln">' + esc(a.hint) + '</span>' : '') +
            (a.action ? '<br><button class="btn" data-followup="' + esc(a.action.target) + '" data-agent="' + esc(a.action.agent || "") + '">' + esc(a.action.label) + '</button><span class="ln" data-fres></span>' : '') + '</td><td class="ln">' + (a.last ? esc(a.last) + " WIB" : "—") + "</td></tr>";
        });
        s += "</table></div>";
      }
      // emails & invitations: what was really SENT (Gmail message id) vs only approved / waiting for review (user, 6 Nov)
      if ((d.emails || []).length) {
        var ES = { PENDING_APPROVAL: ["t-warn", "menunggu review Anda"], APPROVED: ["t-coral", "disetujui — BELUM terkirim"], EXECUTED: ["t-ok", "terkirim"], REJECTED: ["t-mut", "ditolak"], REVISION: ["t-mut", "diminta revisi"] };
        s += '<div class="card"><div class="row"><span class="name">Email &amp; undangan</span><span class="ln">' + d.emails.filter(function (e) { return e.status === "EXECUTED" && /^(gmail:)?[0-9a-f]{12,24}$/i.test(e.result || ""); }).length + " terkirim (dengan bukti Gmail) dari " + d.emails.length + "</span></div><table class=\"items\"><tr><th>Item</th><th>Isi</th><th>Kepada</th><th>Status</th></tr>";
        d.emails.forEach(function (e) { var st = ES[e.status] || ["t-mut", e.status];
          if (e.status === "EXECUTED" && !/^(gmail:)?[0-9a-f]{12,24}$/i.test(e.result || "")) st = ["t-bad", "ditandai terkirim TANPA bukti pengiriman Gmail"];
          s += "<tr><td><b>" + esc(e.id) + "</b><br><span class=\"ln\">" + (e.kind === "calendar" ? "undangan" : "email") + "</span></td><td>" + esc(short(e.title, 60)) + "</td><td class=\"ln\">" + esc(e.to.join(", ")) + "</td><td><span class=\"tag " + st[0] + "\">" + st[1] + "</span>" +
            (e.status === "EXECUTED" && e.result ? '<br><span class="ln">ID Gmail: ' + esc(short(e.result, 40)) + "</span>" : "") + (e.status === "PENDING_APPROVAL" ? ' <a class="btn" href="#approvals">Review</a>' : "") + "</td></tr>"; });
        s += "</table></div>";
      }
      s += '<div class="card"><div class="row"><span class="name">Item yang diaudit</span><span class="ln">' + d.items.length + " item fokus · " + d.evidence_files + " bukti di Evidence</span></div>";
      s += '<table class="items"><tr><th>Item</th><th>Judul</th><th>PIC</th><th>Pengumpul</th><th>Bukti dirilis</th><th>Klarifikasi</th><th>Status</th></tr>';
      d.items.forEach(function (it) {
        var bukti = it.dikumpulkan ? (it.dirilis + "/" + it.dikumpulkan) : (it.permintaan === "tidak ditemukan di Data-Operation" ? "tidak ditemukan" : "—");
        var kl = it.klarifikasi_total ? (it.klarifikasi_dijawab + "/" + it.klarifikasi_total + " dijawab") : "—";
        var st = it.status ? '<span class="tag ' + (CLS[it.status] || "t-mut") + '">' + esc(it.status) + "</span>" : '<span class="tag t-mut">belum dinilai</span>';
        s += "<tr><td><b>" + esc(it.item) + "</b></td><td>" + esc(short(it.judul, 46)) + "</td><td>" + esc(short(it.pic, 28)) + "</td><td>" + esc(it.task) + "</td><td>" + bukti + "</td><td>" + kl + "</td><td>" + st + "</td></tr>";
      });
      s += "</table></div>";
      var L = d.laporan || [], S = d.serah || {};
      s += '<div class="card"><div class="row"><span class="name">Laporan final dari Auditor</span><span class="ln">' + (L.length ? L.length + " berkas" : "belum diterbitkan") + "</span></div>";
      if (L.length) {
        var stt = S.serah_terima;
        var line = !stt ? '<span class="tag t-mut">belum diserahkan ke Manager</span>' :
          stt.status === "PENDING_APPROVAL" ? '<span class="tag t-warn">diserahkan — menunggu keputusan Manager</span> <a class="btn" href="#approvals">Buka keputusan</a>' :
          stt.answer === "Terima laporan dan susun CAP" ? '<span class="tag t-ok">diterima Manager ' + esc(String(stt.waktu || "").slice(11, 16)) + "</span>" :
          '<span class="tag t-coral">' + esc(stt.answer || stt.status) + "</span>";
        s += '<p class="ln">Serah terima ke Manager: ' + line + (S.distribusi ? " · distribusi ke Direksi/CISO: <b>" + esc(S.distribusi.status) + "</b>" : "") + "</p>";
        s += '<table class="items"><tr><th>Berkas</th><th>Ukuran</th><th>Kode verifikasi</th><th>Terbit</th><th></th></tr>';
        L.forEach(function (f) {
          var href = "/reports/" + encodeURIComponent(d.run) + "/" + encodeURIComponent(f.file);
          s += "<tr><td><b>" + esc(f.file) + "</b></td><td>" + Math.max(1, Math.round(f.size / 1024)) + " KB</td><td><code title='" + esc(f.sha256) + "'>" + esc(f.sha256.slice(0, 12)) + "…</code></td><td>" + esc(f.waktu) + " WIB</td>" +
            "<td><a class='btn' target='_blank' href='" + href + "'>" + (/\.(md|txt)$/i.test(f.file) ? "Buka" : "Unduh") + "</a></td></tr>";
        });
        s += "</table>";
      }
      s += "</div>";
      var act = (d.sedang && d.sedang.aktivitas) || "";
      var OWNER = { 0: "Manager", 1: "Auditor", 2: "Manager", 3: "Staf", 4: "Auditor", 5: "Auditor", 6: "Auditor", 7: "Auditor", 8: "Manager" };
      var todo = [];
      (d.pending || []).forEach(function (p) {
        todo.push({ cls: "t-warn", what: "Keputusan menunggu: <b>" + esc(p.id) + "</b> — " + esc(short(p.title, 70)), btn: '<a class="btn" href="#approvals">Buka keputusan</a>' });
      });
      (d.menunggu_kartu || []).forEach(function (w) {
        var conv = String(w.conversation || "");
        if (/dashboard/i.test(conv)) return;
        todo.push({ cls: "t-coral", what: "Kartu menunggu di chat <b>" + esc(conv) + "</b>: " + esc(short(w.kartu, 90)) + '<br><span class="ln">Buka chat ini di sidebar WorkBuddy, lalu pilih opsi kartunya.</span>', btn: '<button class="btn" data-copy="' + esc(conv) + '">Salin nama chat</button>' });
      });
      var owner = OWNER[d.fase_no];
      if (!(d.pending || []).length && (owner === "Auditor" || owner === "Staf")) {
        var task = owner === "Auditor" ? d.run + " Auditor" : d.run + " Staf …";
        todo.push({ cls: "t-mut", what: "Fase sekarang milik <b>" + owner + "</b>. Bila task belum bekerja: buka task <b>" + esc(task) + "</b> dan kirim pesan apa pun (isinya diabaikan, hanya membangunkan).", btn: owner === "Auditor" ? '<button class="btn" data-copy="' + esc(task) + '">Salin nama task</button>' : "" });
      }
      s += '<div class="card"><div class="row"><span class="name">Perlu tindak lanjut</span><span class="ln">' + (todo.length ? todo.length + " aksi" : "tidak ada") + "</span></div>";
      if (!todo.length) s += '<p class="ln">Tidak ada yang perlu ditindaklanjuti saat ini; agen sedang bekerja atau run selesai.</p>';
      todo.forEach(function (t) { s += '<div class="todo"><span class="tag ' + t.cls + '">●</span><div class="what">' + t.what + "</div><div>" + t.btn + "</div></div>"; });
      s += "</div>";
      s += '<div class="card"><div class="row"><span class="name">Riwayat aktivitas</span><span class="ln">' + (d.audit || []).length + ' entri sejak run dimulai · terbaru di atas · dari audit log</span></div><div id="actlog" class="actlog">';
      (d.audit || []).forEach(function (e) {
        var who = /dashboard/i.test(e.aktor) ? ["Manusia (dashboard)", "t-ok"] : /auditor/i.test(e.aktor) ? ["Auditor", "t-warn"] : /manager/i.test(e.aktor) ? ["Manager", "t-mut"] : ["Staf", "t-coral"];
        var aksi = H.text(String(e.aksi).replace(/_/g, " ")); aksi = aksi.charAt(0).toUpperCase() + aksi.slice(1);
        var outH = H.text(e.output); var first = outH.split(/(?<=[.;])\s/)[0];
        s += '<details class="act"><summary><span class="jam">' + esc(e.jam) + '</span><span class="tag ' + who[1] + '">' + who[0] + '</span><span class="aksi">' + esc(short(aksi, 70)) + '</span></summary>' +
          '<p class="ln">' + esc(short(first, 220)) + "</p>" + (function () { var rest = outH.slice(first.length).trim(); if (!rest) return ""; var parts = rest.split(/\s*\(\d+\)\s*/).filter(function (x) { return x.trim(); });
            return parts.length > 1 ? '<ul class="ln full">' + parts.map(function (x) { return "<li>" + esc(x.trim()) + "</li>"; }).join("") + "</ul>" : '<p class="ln full">' + esc(rest) + "</p>"; })() +
          (e.status_sistem ? '<p class="ln"><b>Status sebenarnya di sistem saat dicatat:</b> ' + esc(H.text(e.status_sistem)) + "</p>" : "") +
          (e.approval && e.approval !== "n/a" ? '<p class="ln"><b>Approval:</b> ' + esc(short(H.text(e.approval), 160)) + "</p>" : "") + "</details>";
      });
      if (!(d.audit || []).length) s += '<p class="ln">Belum ada entri audit untuk run ini.</p>';
      s += "</div>";
      s += "</div>";
      el.innerHTML = s;
      
      // "Tindak lanjut": one click restarts the stalled process (server presses Run now on the Pengawas / wakes the Manager)
      var rs = el.querySelector("#runsel"); if (rs) rs.onchange = function () { var u = new URL(location.href); u.searchParams.set("run", rs.value); location.href = u.toString(); };
      [].forEach.call(el.querySelectorAll("[data-followup]"), function (b) {
        b.onclick = function () {
          var res = b.nextElementSibling; b.disabled = true; b.textContent = "Menjalankan…";
          fetch("/api/followup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ run: d.run, target: b.getAttribute("data-followup"), agent: b.getAttribute("data-agent") }) })
            .then(function (r) { return r.json(); }).then(function (r) { b.textContent = r.ok ? "Dijalankan ✓" : "Gagal"; if (res) res.textContent = " " + r.out; window.lastRun = null; })
            .catch(function (e) { b.textContent = "Gagal"; if (res) res.textContent = " " + e.message; });
        };
      });
      [].forEach.call(el.querySelectorAll("[data-copy]"), function (b) {
        b.onclick = function () {
          var v = b.getAttribute("data-copy");
          (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { b.textContent = "Tersalin ✓"; }, function () { window.prompt("Salin nama ini:", v); });
        };
      });
    }).catch(function () { el.innerHTML = ""; });
  };
})();
