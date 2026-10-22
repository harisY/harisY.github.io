/* Tombol tema di footer: Otomatis (ikut perangkat) -> Terang -> Gelap.
   Pilihan disimpan di localStorage. Penerapan awal dilakukan oleh skrip kecil di <head>
   supaya tidak ada kilatan warna. */
(function () {
  "use strict";

  var KEY = "theme";
  var ORDER = ["auto", "light", "dark"];
  var LABEL = { auto: "Otomatis", light: "Terang", dark: "Gelap" };
  var root = document.documentElement;

  function read() {
    try {
      var value = localStorage.getItem(KEY);
      return ORDER.indexOf(value) === -1 ? "auto" : value;
    } catch (e) {
      return "auto";
    }
  }

  function apply(mode) {
    if (mode === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);
  }

  function save(mode) {
    try {
      if (mode === "auto") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, mode);
    } catch (e) { /* penyimpanan diblokir: pilihan berlaku sampai halaman ditutup */ }
  }

  var button = document.getElementById("theme-toggle");
  if (!button) return;

  var mode = read();

  function render() {
    button.textContent = "Tema: " + LABEL[mode];
    button.setAttribute("aria-label", "Tema: " + LABEL[mode] + ". Klik untuk mengganti.");
  }

  button.hidden = false;
  render();

  button.addEventListener("click", function () {
    mode = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
    apply(mode);
    save(mode);
    render();
  });
})();
