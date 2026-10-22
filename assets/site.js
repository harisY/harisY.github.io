/* Peningkatan halaman tulisan: daftar isi, tautan antar-bagian, dan tombol salin kode.
   Halaman tetap terbaca penuh tanpa skrip ini. */
(function () {
  "use strict";

  var content = document.querySelector(".post-content");
  if (!content) return;

  var sections = content.querySelectorAll("h2[id]");
  var toc = document.getElementById("toc");

  if (toc && sections.length >= 3) {
    var list = toc.querySelector("ol");
    sections.forEach(function (h) {
      var item = document.createElement("li");
      var link = document.createElement("a");
      link.href = "#" + h.id;
      link.textContent = h.textContent;
      item.appendChild(link);
      list.appendChild(item);
    });
    toc.hidden = false;
  }

  content.querySelectorAll("h2[id], h3[id]").forEach(function (h) {
    var anchor = document.createElement("a");
    anchor.className = "anchor";
    anchor.href = "#" + h.id;
    anchor.setAttribute("aria-label", "Tautan ke bagian ini");
    anchor.textContent = "#";
    h.appendChild(anchor);
  });

  content.querySelectorAll("div.highlighter-rouge").forEach(function (block) {
    var pre = block.querySelector("pre");
    if (!pre || !navigator.clipboard) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "copy-btn";
    button.textContent = "Salin";
    button.addEventListener("click", function () {
      navigator.clipboard.writeText(pre.innerText).then(function () {
        button.textContent = "Tersalin";
        setTimeout(function () { button.textContent = "Salin"; }, 1800);
      }, function () {
        button.textContent = "Gagal menyalin";
        setTimeout(function () { button.textContent = "Salin"; }, 1800);
      });
    });
    block.appendChild(button);
  });
})();
