---
layout: post
title: "Rekonstruksi 3D dalam Satu Forward Pass: Membedah VGGT, Best Paper CVPR 2025"
author: "Abdul Haris"
date: 2026-10-22 07:00:00 +0700
categories: [computer-vision]
tags: [3d-vision, vggt, transformer, structure-from-motion, feed-forward, cvpr-2025, paper-review]
description: "Review VGGT, Best Paper CVPR 2025: satu transformer feed-forward yang memprediksi kamera, depth, point map, dan track 3D dari banyak gambar."
---

Kalau kamu pernah merekonstruksi 3D dari kumpulan foto dengan COLMAP, alurnya kira-kira begini: cocokkan fitur antar gambar, triangulasi titik, lalu jalankan *bundle adjustment* (BA), yaitu optimasi iteratif yang menyetel pose kamera dan titik 3D supaya error reproyeksinya sekecil mungkin. Hasilnya akurat, tetapi alurnya panjang dan lambat.

**VGGT** bertanya: bisakah semua itu dikerjakan oleh satu jaringan saraf dalam sekali jalan (*feed-forward*)? Menurut penulisnya, bisa. Dari satu, beberapa, bahkan ratusan gambar, VGGT langsung memprediksi parameter kamera, depth map, point map, dan track titik 3D. Hasilnya sering mengungguli metode yang masih memakai optimasi pasca-proses. Halaman resmi CVPR 2025 mencantumkan paper ini sebagai Best Paper.

Buat mahasiswa Computer Vision, paper ini layak dibaca karena dua hal. Arsitekturnya sederhana (transformer standar dengan satu modifikasi). Dan menurut saya, ia menunjukkan arah 3D vision yang sama dengan NLP dan vision 2D: satu model besar yang dilatih pada banyak data, lalu dipakai ulang untuk banyak tugas.

## Identitas paper

- **Judul:** VGGT: Visual Geometry Grounded Transformer
- **Penulis:** Jianyuan Wang, Minghao Chen, Nikita Karaev, Andrea Vedaldi, Christian Rupprecht, David Novotny (Visual Geometry Group, University of Oxford, dan Meta AI)
- **Venue:** Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR) 2025, hlm. 5294–5306
- **Tautan:** [halaman CVF (open access)](https://openaccess.thecvf.com/content/CVPR2025/html/Wang_VGGT_Visual_Geometry_Grounded_Transformer_CVPR_2025_paper.html), [arXiv:2503.11651](https://arxiv.org/abs/2503.11651), [DOI 10.1109/CVPR52734.2025.00499](https://doi.org/10.1109/CVPR52734.2025.00499)

## Latar belakang dan research gap

Menurut paper, pipeline *Structure-from-Motion* (SfM) klasik masih bergantung pada optimasi geometri seperti BA, yang menambah kerumitan dan biaya komputasi. Metode berbasis jaringan saraf seperti DUSt3R dan MASt3R sudah memprediksi geometri secara langsung, tetapi hanya memproses dua gambar sekaligus dan butuh pasca-proses (misalnya *global alignment*) untuk menggabungkan hasil pasangan gambar. Model 3D besar lain seperti DepthAnything, MoGe, dan LRM hanya mengerjakan satu tugas.

*Gap* yang diangkat: belum ada jaringan feed-forward yang menangani banyak gambar sekaligus, memprediksi semua atribut 3D utama, dan tidak butuh optimasi sesudahnya.

## Kontribusi utama

Menurut paper:

1. VGGT, transformer feed-forward besar yang dari satu, beberapa, atau ratusan gambar memprediksi intrinsik dan ekstrinsik kamera, point map, depth map, dan track titik 3D.
2. Prediksinya langsung bisa dipakai, kompetitif dan umumnya lebih baik daripada metode yang memakai optimasi pasca-proses yang lambat.
3. Kombinasi dengan BA meningkatkan hasil lebih lanjut.
4. Fitur VGGT yang sudah dilatih (*pretrained*) meningkatkan tugas hilir seperti point tracking non-rigid dan feed-forward novel view synthesis.

## Cara kerja VGGT

**Versi sederhana.** Bayangkan kamu menaruh semua foto di satu meja dan menyuruh satu model melihat semuanya sekaligus. Setiap foto dipecah menjadi potongan kecil (*token*). Model lalu bergantian melakukan dua hal: memperhatikan isi satu foto saja, lalu memperhatikan hubungan antar semua foto. Di ujungnya, "kepala" khusus membaca hasilnya sebagai posisi kamera, kedalaman, dan titik 3D.

![Alur kerja VGGT]({{ "/assets/images/vggt-pipeline.svg" | relative_url }}){: width="980" height="395" loading="lazy"}
<p class="caption">Diagram penulis, disusun dari Gambar 2 paper.</p>

**Versi teknis.** Inputnya barisan gambar $$I_1,\dots,I_N$$. Untuk tiap gambar, jaringan memprediksi parameter kamera $$g_i\in\mathbb{R}^9$$ (kuaternion rotasi, translasi, dan *field of view*), depth map $$D_i$$, point map $$P_i$$, serta peta fitur $$T_i$$ untuk tracking (Persamaan 1 paper):

$$f\big((I_i)_{i=1}^{N}\big) = (g_i, D_i, P_i, T_i)_{i=1}^{N}$$

- **Tokenisasi dan token khusus.** Gambar dipecah menjadi token oleh DINO (Suplemen menyebut DINOv2; teks utama hanya menulis "DINO"). Tiap frame diberi satu *camera token* dan empat *register token*. Token frame pertama berbeda dari frame lain, dan itu yang membuat model tahu bahwa kamera pertama adalah kerangka acuan dunia.
- **Alternating-Attention (AA).** Satu-satunya modifikasi terhadap transformer standar: lapisan *frame-wise* self-attention (token dalam satu gambar) bergantian dengan *global* self-attention (semua token dari semua gambar). Defaultnya 24 pasang lapisan. Tidak ada *cross-attention*.
- **Head.** Camera head terdiri dari empat self-attention layer dan satu layer linear. Keluaran padat (depth, point map, fitur tracking) dihasilkan oleh DPT head. Tracking dikerjakan modul terpisah dengan arsitektur CoTracker2, dilatih bersama jaringan utama.
- **Prediksi berlebih (*over-complete*).** Kamera, depth, dan point map saling terkait secara geometri, tetapi paper tetap melatih semuanya. Saat inferensi, titik 3D dari depth map yang diproyeksikan dengan kamera prediksi lebih akurat daripada keluaran point map head langsung (Tabel 3).
- **Pelatihan (Suplemen, Lampiran B).** Sekitar 1,2 miliar parameter. Loss-nya penjumlahan loss kamera, depth, point map, dan track (loss track diberi bobot 0,05). AdamW, 160 ribu iterasi, 64 GPU A100 selama sembilan hari, resolusi maksimum 518 piksel.

## Dataset dan setup eksperimen

- **Data latih (Suplemen):** gabungan lebih dari 15 dataset publik beranotasi 3D, antara lain Co3Dv2, BlendMVS, DL3DV, MegaDepth, Kubric, ScanNet, HyperSim, Habitat, dan Virtual KITTI, plus dataset sintetis sejenis Objaverse. Suplemen menyebut ukuran dan keragamannya sebanding dengan data MASt3R.
- **Evaluasi:** estimasi pose kamera di RealEstate10K dan CO3Dv2 (10 frame acak per scene, metrik AUC@30), depth multi-view di DTU, point map di ETH3D, image matching di ScanNet-1500, point tracking di TAP-Vid, dan novel view synthesis di GSO. RealEstate10K tidak dipakai untuk melatih metode mana pun di Tabel 1.
- **Perangkat:** waktu inferensi diukur dengan satu GPU H100.

## Hasil utama

**Estimasi pose kamera (Tabel 1, AUC@30, makin tinggi makin baik):**

| Metode | RealEstate10K | CO3Dv2 | Waktu |
|---|---|---|---|
| DUSt3R | 67.7 | 76.7 | ~7s |
| MASt3R | 76.4 | 81.8 | ~9s |
| VGGSfM v2 | 78.9 | 83.4 | ~10s |
| Fast3R (karya paralel) | 72.7 | 82.5 | ~0.2s |
| **VGGT (feed-forward)** | **85.3** | **88.2** | ~0.2s |
| **VGGT + BA** | **93.5** | **91.8** | ~1.8s |

Hasil lainnya:

- **Depth multi-view, DTU (Tabel 2, metrik Overall, makin kecil makin baik):** VGGT 0.382 versus DUSt3R 1.741. Keduanya tidak memakai kamera ground truth.
- **Point map, ETH3D (Tabel 3, Overall):** VGGT lewat depth + kamera 0.677, lewat point head 0.709, MASt3R 0.826, DUSt3R 1.005. Waktu VGGT ~0.2s.
- **Image matching, ScanNet-1500 (Tabel 4, AUC@5):** VGGT 33.9 versus Roma 31.8.
- **Ablasi (Tabel 5 dan 6, ETH3D, Overall):** Alternating-Attention 0.709, hanya global self-attention 0.827, cross-attention 1.061. Tanpa loss kamera 0.834, tanpa loss depth 0.727, tanpa loss track 0.790.
- **Tugas hilir:** memasang fitur VGGT ke CoTracker menaikkan δ<sup>vis</sup><sub>avg</sub> di TAP-Vid RGB-S dari 78.9 ke 84.0 (Tabel 8). Untuk novel view synthesis di GSO, VGGT yang di-*finetune* tanpa kamera input mencapai PSNR 30.41 (Tabel 7).

## Kelebihan dan keterbatasan

**Yang diakui penulis:**

- Sederhana, cepat, dan generalisasinya baik; paper menyebut keunggulan di RealEstate10K, yang tidak dipakai untuk melatih, sebagai bukti generalisasi.
- Pasca-proses BA masih memberi peningkatan (Bagian 4.1).
- Keterbatasan (Suplemen, Lampiran F): tidak mendukung gambar fisheye atau panorama, performa turun pada rotasi input yang ekstrem, dan gagal pada deformasi non-rigid yang besar. Penulis menyarankan *finetuning* pada data target. Mereka juga mengakui global self-attention yang naif boros memori.

**Pengamatan saya:**

- Klaim "di bawah satu detik untuk ratusan gambar" (abstrak dan Gambar 1) perlu dibaca dengan hati-hati. Tabel B di Suplemen mencatat waktu backbone 1.04 detik untuk 50 frame, 3.12 detik untuk 100 frame, dan 8.75 detik untuk 200 frame, dengan memori puncak 40.63 GB pada 200 frame (H100, resolusi 336×518). Mungkin kondisi pengukurannya berbeda; paper tidak menjelaskannya.
- Menurut saya, "mengungguli semua" tidak berlaku mutlak. Di Tabel 2, GeoMVSNet (dengan kamera ground truth) mencapai Overall 0.295 dan MASt3R 0.374, keduanya lebih baik daripada 0.382. Di Tabel A Suplemen, VGGT tanpa BA mendapat AUC@10 71.26, di bawah VGGSfMv2 (76.82); hanya VGGT + BA (84.91) yang unggul. Di Tabel 7, LVSM (PSNR 31.71) mengungguli VGGT (30.41), walau VGGT memakai data latih lebih sedikit dan tidak memakai kamera input.
- Saya tidak menemukan eksperimen yang mengontrol data latih antar metode, jadi sebagian selisih bisa berasal dari skala data, bukan arsitektur.
- Ablasi (Tabel 5 dan 6) hanya diuji pada satu benchmark (ETH3D) dengan satu metrik.
- Biaya latih (64 A100, sembilan hari) sulit direproduksi di laboratorium kampus.
- Paper tidak menjelaskan mengapa loss depth hanya menyumbang sedikit (Tabel 6), dan saya sendiri belum yakin penyebabnya.

## Ide riset lanjutan (bukan temuan paper)

1. **Uji ketahanan di domain sendiri.** Bangun benchmark kecil (foto drone, ruang laboratorium, citra endoskopi) dan ukur kapan VGGT gagal, terutama pada rotasi ekstrem dan lensa lebar yang diakui paper sebagai kelemahan.
2. **VGGT yang lebih hemat.** Coba *token merging*/pruning atau attention jarang pada global attention, lalu bandingkan waktu dan memori dengan Tabel B. Paper sendiri menyebut teknik akselerasi ala LLM sebagai arah yang mungkin.
3. **Adaptasi ke scene dinamis.** *Finetune* dengan data kecil bergerak dan evaluasi pada TAP-Vid atau dataset sejenis, mengikuti saran penulis soal *finetuning* pada data target.
4. **Manfaatkan peta ketidakpastian.** VGGT memprediksi uncertainty untuk depth dan point map. Periksa apakah ia terkalibrasi dengan baik dan bisa dipakai menyaring frame atau titik yang buruk.
5. **Hubungkan dengan segmentasi.** Gunakan point map multi-view sebagai petunjuk geometri agar mask dari model seperti SAM 2 lebih konsisten antar-view.

## Ketersediaan kode dan model

Kode dan model tersedia di [github.com/facebookresearch/vggt](https://github.com/facebookresearch/vggt). Dua poin berikut berasal dari README repo, bukan dari paper:

- Bobot `facebook/VGGT-1B` diunduh otomatis dari Hugging Face; ada demo Gradio dan ekspor ke format COLMAP.
- Lisensi diatur khusus lewat `LICENSE.txt` di repo. README menyebut hanya checkpoint `VGGT-1B-Commercial` yang boleh dipakai komersial dan perlu mengisi formulir; checkpoint asli untuk non-komersial. Baca lisensi aslinya sebelum memakai di luar riset.

## Kesimpulan

Menurut hasil yang dilaporkan paper, transformer sederhana dengan satu trik Alternating-Attention dan data 3D yang besar dapat memprediksi atribut 3D utama dalam satu forward pass, dan hasilnya sering lebih baik daripada metode berbasis optimasi. Interpretasi saya: ini langkah besar, bukan akhir dari geometri klasik. Catatannya: BA masih membantu, ada kasus gagal yang diakui penulis, dan klaim kecepatannya bergantung pada jumlah frame. Untuk tesis S2, celahnya ada pada efisiensi, ketahanan di domain khusus, dan scene dinamis.

## Referensi

[1] J. Wang, M. Chen, N. Karaev, A. Vedaldi, C. Rupprecht, and D. Novotny, "VGGT: Visual Geometry Grounded Transformer," in *Proc. IEEE/CVF Conf. Computer Vision and Pattern Recognition (CVPR)*, 2025, pp. 5294–5306, doi: 10.1109/CVPR52734.2025.00499.

[2] J. Wang *et al.*, "VGGT: Visual Geometry Grounded Transformer," arXiv:2503.11651, Mar. 2025. [Online]. Available: <https://arxiv.org/abs/2503.11651>

[3] J. Wang *et al.*, "VGGT: Visual Geometry Grounded Transformer — Supplementary Material," CVF Open Access, 2025. [Online]. Available: <https://openaccess.thecvf.com/content/CVPR2025/supplemental/Wang_VGGT_Visual_Geometry_CVPR_2025_supplemental.pdf>

[4] CVPR 2025, "Best Papers and Demos." [Online]. Available: <https://cvpr.thecvf.com/Conferences/2025/BestPapersDemos>

[5] Facebook Research, "VGGT" (kode, README, dan lisensi). [Online]. Available: <https://github.com/facebookresearch/vggt>
