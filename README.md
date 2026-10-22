# Catatan Computer Vision

Blog Jekyll berisi review paper Computer Vision untuk mata kuliah Advanced Computer Vision (S2).
Situs: https://harisy.github.io/

## Isi repo

- `_posts/` — tulisan, satu berkas per postingan (`YYYY-MM-DD-judul.md`)
- `_layouts/` dan `_includes/` — tata letak sendiri (halaman depan, postingan, header, footer, grid patch di hero, MathJax)
- `assets/site.css` — seluruh gaya situs (mode terang/gelap otomatis dan gaya cetak)
- `assets/fonts/` — font self-hosted (IBM Plex Sans dan Source Serif 4, subset Latin)
- `assets/images/` — diagram SVG, gambar hasil (WebP), favicon, dan kartu pratinjau sosial
- `assets/site.js` — anchor judul dan tombol salin kode di halaman tulisan (daftar isi dibuat saat build)
- `assets/theme.js` (tombol tema di header), `assets/search.js` + `search.json` (pencarian di halaman Arsip)
- `arsip.md`, `404.html`, `robots.txt`, `LICENSE.md` — arsip per topik, halaman 404, robots, dan lisensi
- `notebook/` — notebook tutorial SAM 2.1 (bisa dibuka di Colab)
- `about.md` — halaman profil penulis (`/tentang/`)
- `_config.yml`, `index.md` — konfigurasi dan teks hero halaman depan

## Tulisan

- Review VGGT: Visual Geometry Grounded Transformer (CVPR 2025)
- Dari “Klik Objeknya” ke “Sebut Namanya”: Perjalanan SAM 2 menuju SAM 3 (review, tutorial, ide riset)
- Fine-tuning Vision Transformer (ViT) untuk klasifikasi ras kucing dan anjing (tutorial; kode dan notebook ada di repo [vit-pets-finetune](https://github.com/harisY/vit-pets-finetune))

PDF paper tidak disertakan di repo; lihat tautan resmi di tiap tulisan.
