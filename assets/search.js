/* Pencarian di sisi klien untuk halaman Arsip. Tanpa pustaka dan tanpa layanan luar:
   mengunduh /search.json sekali, lalu mencocokkan semua kata kunci pada judul, topik,
   deskripsi, dan isi tulisan. Teks hasil dibuat lewat DOM (bukan innerHTML) agar aman dari XSS. */
(function () {
  "use strict";

  var input = document.getElementById("cari-input");
  var results = document.getElementById("cari-hasil");
  var browse = document.getElementById("telusuri");
  var status = document.getElementById("cari-status");
  if (!input || !results || !browse) return;

  var indexUrl = input.getAttribute("data-index");
  var index = null;
  var loading = null;

  function normalize(text) {
    return String(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (!loading) {
      loading = fetch(indexUrl).then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      }).then(function (items) {
        index = items.map(function (item) {
          return {
            item: item,
            title: normalize(item.title),
            tags: normalize(item.tags.join(" ")),
            description: normalize(item.description),
            text: normalize(item.text)
          };
        });
        return index;
      });
    }
    return loading;
  }

  function score(entry, terms) {
    var total = 0;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      var inTitle = entry.title.indexOf(t) !== -1;
      var inTags = entry.tags.indexOf(t) !== -1;
      var inDesc = entry.description.indexOf(t) !== -1;
      var occurrences = entry.text.split(t).length - 1;
      if (!inTitle && !inTags && !inDesc && occurrences === 0) return 0;
      total += (inTitle ? 8 : 0) + (inTags ? 5 : 0) + (inDesc ? 3 : 0) + Math.min(occurrences, 10);
    }
    return total;
  }

  function snippet(entry, terms) {
    var raw = entry.item.text;
    var haystack = entry.text;
    var at = -1;
    for (var i = 0; i < terms.length && at === -1; i++) at = haystack.indexOf(terms[i]);
    if (at === -1) return entry.item.description;
    var start = Math.max(0, at - 70);
    var end = Math.min(raw.length, at + 130);
    return (start > 0 ? "…" : "") + raw.slice(start, end) + (end < raw.length ? "…" : "");
  }

  function addHighlighted(parent, text, terms) {
    var lower = normalize(text);
    var pos = 0;
    while (pos < text.length) {
      var best = -1;
      var bestLen = 0;
      for (var i = 0; i < terms.length; i++) {
        var found = lower.indexOf(terms[i], pos);
        if (found !== -1 && (best === -1 || found < best)) { best = found; bestLen = terms[i].length; }
      }
      if (best === -1) { parent.appendChild(document.createTextNode(text.slice(pos))); return; }
      if (best > pos) parent.appendChild(document.createTextNode(text.slice(pos, best)));
      var mark = document.createElement("mark");
      mark.textContent = text.slice(best, best + bestLen);
      parent.appendChild(mark);
      pos = best + bestLen;
    }
  }

  function render(matches, terms, query) {
    results.textContent = "";
    if (matches.length === 0) {
      status.textContent = "Tidak ada tulisan yang cocok dengan “" + query + "”.";
      return;
    }
    status.textContent = matches.length + " tulisan cocok dengan “" + query + "”.";
    var list = document.createElement("ul");
    list.className = "cari-list";
    matches.forEach(function (entry) {
      var li = document.createElement("li");
      var title = document.createElement("a");
      title.href = entry.item.url;
      addHighlighted(title, entry.item.title, terms);
      var date = document.createElement("span");
      date.className = "post-meta";
      date.textContent = entry.item.date;
      var text = document.createElement("p");
      addHighlighted(text, snippet(entry, terms), terms);
      li.appendChild(title);
      li.appendChild(date);
      li.appendChild(text);
      list.appendChild(li);
    });
    results.appendChild(list);
  }

  function run() {
    var query = input.value.trim();
    var terms = normalize(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      results.textContent = "";
      status.textContent = "";
      browse.hidden = false;
      return;
    }
    browse.hidden = true;
    status.textContent = "Mencari…";
    loadIndex().then(function (entries) {
      if (input.value.trim() !== query) return;
      var matches = entries
        .map(function (entry) { return { entry: entry, score: score(entry, terms) }; })
        .filter(function (m) { return m.score > 0; })
        .sort(function (a, b) { return b.score - a.score; })
        .map(function (m) { return m.entry; });
      render(matches, terms, query);
    }).catch(function () {
      status.textContent = "Pencarian tidak bisa dimuat. Gunakan daftar topik di bawah.";
      browse.hidden = false;
    });
  }

  input.addEventListener("input", run);
  input.closest("form").addEventListener("submit", function (event) { event.preventDefault(); run(); });

  var initial = new URLSearchParams(window.location.search).get("q");
  if (initial) { input.value = initial; run(); }
})();
