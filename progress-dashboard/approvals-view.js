// SIGAP — human-readable rendering of an outbox payload for the #approvals page (raw JSON stays available).
(function () {
  var STATUS = { "Conform": "t-ok", "Minor NC": "t-warn", "Major NC": "t-bad", "OFI": "t-mut", "N/A": "t-mut" };
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function label(k) { return H.label(k); }
  function isHash(k, v) { return typeof v === "string" && /^[0-9a-f]{40,64}$/.test(v); }
  function scalar(k, v) {
    if (v === null || v === undefined || v === "") return '<span class="ln">—</span>';
    if (typeof v === "boolean") return v ? "ya" : "tidak";
    if (isHash(k, v)) return '<code title="' + esc(v) + '">' + esc(v.slice(0, 12)) + "…</code>";
    if (k === "bytes" && typeof v === "number") return v < 1024 ? v + " B" : Math.round(v / 1024).toLocaleString("id-ID") + " KB";
    if (typeof v === "number") return '<b>' + v.toLocaleString("id-ID") + "</b>";
    var s = String(v);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return esc(s.slice(0, 10) + " " + s.slice(11, 16) + " WIB");
    if (STATUS[s]) return '<span class="tag ' + STATUS[s] + '">' + esc(s) + "</span>";
    if (k === "file" || k === "to" || k === "cc" || k === "from" || k === "body") return esc(s);
    return esc(H.value(s));
  }
  function table(arr) {
    var cols = [];
    arr.forEach(function (o) { Object.keys(o).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
    var s = '<table class="pl"><tr>' + cols.map(function (c) { return "<th>" + esc(label(c)) + "</th>"; }).join("") + "</tr>";
    arr.forEach(function (o) { s += "<tr>" + cols.map(function (c) { return "<td>" + val(c, o[c], 1) + "</td>"; }).join("") + "</tr>"; });
    return s + "</table>";
  }
  function counts(o) {
    return '<div class="tags">' + Object.keys(o).map(function (k) { return '<span class="tag ' + (STATUS[k] || "t-mut") + '">' + esc(k) + ": " + esc(o[k]) + "</span>"; }).join("") + "</div>";
  }
  function val(k, v, depth) {
    if (Array.isArray(v)) {
      if (!v.length) return '<span class="ln">tidak ada (0)</span>';
      if (v.every(function (x) { return x && typeof x === "object" && !Array.isArray(x); })) return table(v);
      if (v.length > 12) return '<details><summary class="ln">' + v.length + " item</summary><ul>" + v.map(function (x) { return "<li>" + scalar(k, x) + "</li>"; }).join("") + "</ul></details>";
      return "<ul>" + v.map(function (x) { return "<li>" + (typeof x === "object" ? val(k, x, depth + 1) : scalar(k, x)) + "</li>"; }).join("") + "</ul>";
    }
    if (v && typeof v === "object") {
      var keys = Object.keys(v);
      if (keys.length && keys.every(function (x) { return STATUS[x] !== undefined; })) return counts(v);
      if (keys.length && keys.every(function (x) { return isHash(x, v[x]); })) return '<details><summary class="ln">' + keys.length + " berkas (sha256)</summary>" + table(keys.map(function (x) { return { file: x, sha256: v[x] }; })) + "</details>";
      return kv(v, depth + 1);
    }
    return scalar(k, v);
  }
  function kv(o, depth) {
    var s = '<table class="kv' + (depth ? " nested" : "") + '">';
    Object.keys(o).forEach(function (k) { if (k === "options" && !depth) return; s += "<tr><th>" + esc(label(k)) + "</th><td>" + val(k, o[k], depth || 0) + "</td></tr>"; });
    return s + "</table>";
  }
  window.renderPayload = function (payload, run) {
    var links = "";
    if (run && Array.isArray(payload.artefak) && /serah_terima/.test(payload.jenis || "")) {
      links = '<p class="ln"><b>Periksa berkas sebelum memutuskan:</b> ' + payload.artefak.map(function (a) {
        return '<a class="btn" target="_blank" href="/reports/' + encodeURIComponent(run) + "/" + encodeURIComponent(a.file) + '">' + esc(a.file) + "</a>";
      }).join(" ") + "</p>";
    }
    return links + kv(payload, 0) + '<details class="raw"><summary class="ln">Detail teknis untuk pemeriksa IT (isi persis yang dikunci kode verifikasi)</summary><pre class="log">' + esc(JSON.stringify(payload, null, 1)) + "</pre></details>";
  };
})();
