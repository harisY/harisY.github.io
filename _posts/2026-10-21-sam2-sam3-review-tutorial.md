---
layout: post
title: "Dari “Klik Objeknya” ke “Sebut Namanya”: Perjalanan SAM 2 menuju SAM 3"
author: "Abdul Haris"
date: 2026-10-21 08:00:00 +0700
categories: [computer-vision]
tags: [segmentation, sam-2, sam-3, video-segmentation, foundation-model, tutorial, paper-review]
description: "Review paper SAM 2 (ICLR 2025) dan SAM 3, tutorial SAM 2.1 yang bisa dijalankan sendiri, dan ide riset untuk tesis."
---

Segmentasi menjawab pertanyaan sederhana: piksel mana yang membentuk sebuah objek? Jawabannya dipakai di citra medis, pemetaan lahan dari citra satelit, kendaraan otonom, dan penyuntingan video. Tulisan ini membahas dua paper terbaru dari keluarga *Segment Anything Model* (SAM), yaitu SAM 2 dan SAM 3. Setelah itu ada tutorial untuk mencoba SAM 2.1 sendiri dan beberapa ide riset yang bisa dijadikan topik tesis.

## Dari model per domain ke model yang dipandu prompt

Model segmentasi klasik dilatih untuk kelas tertentu. Kalau domainnya berganti, misalnya dari foto jalan ke citra CT, datanya harus dilabeli ulang piksel demi piksel, dan itu mahal.

SAM dari Meta mengubah pendekatannya. Model dilatih sekali pada data yang sangat besar, lalu dipandu lewat prompt berupa klik, kotak, atau mask untuk menyegmentasi objek apa pun. Mirip cara kita mengarahkan LLM dengan teks.

SAM 2 (2024) menambahkan dimensi waktu, sehingga prompt yang sama bisa melacak objek di video. SAM 3 (2025) menambahkan bahasa: objek cukup disebutkan namanya. SAM 2 dipublikasikan di ICLR 2025 (sesi oral). Untuk SAM 3 saya merujuk versi arXiv.

## SAM 2: segmentasi dengan memori

SAM pertama bekerja pada satu gambar. Untuk melacak objek di video, prosesnya harus diulang di setiap frame, dan hasilnya mudah tidak konsisten dari frame ke frame. Tim Meta (Ravi dkk., 2025) menjawabnya dengan tiga kontribusi.

1. **Tugas baru, *Promptable Visual Segmentation* (PVS).** Prompt (klik positif atau negatif, kotak, atau mask) bisa diberikan di frame mana pun, lalu disebarkan menjadi *masklet*, yaitu mask objek yang konsisten sepanjang video. Kalau hasilnya meleset, prompt koreksi di frame lain memperbaiki sisanya.
2. **Model dengan memori.** Video diproses frame demi frame sambil membawa ingatan tentang objek, sehingga cocok untuk pemrosesan real-time.
3. **Data engine dan dataset SA-V**, yang dibahas di bagian berikutnya.

### Arsitektur

![Diagram sederhana arsitektur SAM 2]({{ '/assets/images/sam2-arsitektur.svg' | relative_url }})

Untuk setiap frame, alurnya sebagai berikut.

1. *Image encoder* (Hiera, dilatih awal dengan MAE) mengubah frame menjadi fitur.
2. *Memory attention* membuat fitur itu melihat memori dari frame-frame sebelumnya. Inilah bagian yang membedakan SAM 2 dari SAM pertama.
3. *Mask decoder* menggabungkan fitur dan prompt untuk menghasilkan mask. Ada tambahan *head* yang memprediksi apakah objek sedang tidak terlihat (tertutup).
4. *Memory encoder* mengemas mask yang baru dihasilkan menjadi memori, lalu menyimpannya di *memory bank*: antrean beberapa frame terakhir, frame yang pernah diberi prompt, dan *object pointer* yang membawa informasi semantik objek.

Karena ada memori, objek yang sempat tertutup lalu muncul lagi bisa tetap dikenali.

### Data engine dan SA-V

Dataset video segmentasi dibangun bertahap, dengan model yang ikut membantu anotator manusia. Waktu anotasi per frame turun dari fase ke fase:

- Fase 1 (SAM per frame): 37,8 detik per frame
- Fase 2 (SAM + SAM 2 Mask): 7,4 detik per frame, sekitar 5,1 kali lebih cepat
- Fase 3 (SAM 2 penuh): 4,5 detik per frame, sekitar 8,4 kali lebih cepat

Hasilnya adalah **SA-V**: 50,9 ribu video, 642,6 ribu masklet, dan 35,5 juta mask, direkam di 47 negara. Penulis menyebut jumlah mask-nya 53 kali lipat dataset VOS yang ada sebelumnya.

Pola *model-in-the-loop* ini bisa ditiru di domain lain: latih model awal, biarkan ia menyarankan label, lalu manusia cukup mengoreksi.

### Hasil yang dilaporkan

Semua angka di bagian ini berasal dari paper.

- **Gambar.** SAM 2 sekitar 6 kali lebih cepat daripada SAM (130,1 vs 21,7 FPS di A100, batch 10 gambar), dengan akurasi sedikit lebih baik. Pada 23 dataset dan data latih yang sama (SA-1B), mIoU satu klik adalah 58,9 vs 58,1.
- **Video.** Dengan prompt 3 klik di frame pertama pada 17 dataset zero-shot, SAM 2 (varian B+) mencapai 75,3 J&F, mengungguli SAM + Cutie (70,1) dan SAM + XMem++ (68,4). Secara umum penulis mengklaim akurasi lebih baik dengan interaksi sekitar 3 kali lebih sedikit.
- **Kecepatan video.** 43,8 FPS (varian B+) dan 30,2 FPS (varian L) di satu GPU A100.

### Kelemahan yang diakui penulis

Lampiran C menyebut model bisa gagal ketika:

- terjadi pergantian shot (potongan kamera),
- adegan ramai, ada oklusi panjang, atau video sangat panjang,
- objeknya tipis dan bergerak cepat,
- ada objek serupa yang berdekatan, misalnya bola juggling yang identik,
- ada banyak objek, karena tiap objek diproses sendiri-sendiri tanpa saling berkomunikasi.

### SAM 2.1: pilihan ukuran model

Setelah paper terbit, Meta merilis SAM 2.1 (30 September 2024) dengan checkpoint yang diperbarui. Berikut ukurannya menurut README resmi (kecepatan diukur di A100, PyTorch 2.5.1):

- `hiera_tiny`: 38,9 juta parameter, 91,2 FPS, 76,5 J&F di SA-V test
- `hiera_small`: 46 juta, 84,8 FPS, 76,6 J&F
- `hiera_base_plus`: 80,8 juta, 64,1 FPS, 78,2 J&F
- `hiera_large`: 224,4 juta, 39,5 FPS, 79,5 J&F

Pengaturan pengukuran FPS ini berbeda dari yang dipakai di paper, jadi kedua angka tidak bisa dibandingkan langsung. Untuk belajar dan bereksperimen, `tiny` sudah cukup dan paling ringan.

## Cara SAM 2 dilatih dan apa kata ablation

### Pelatihan

- **Dua tahap.** Pra-latih pada gambar SA-1B, lalu latih bersama pada gambar dan video.
- **Interaksi disimulasikan.** Model dilatih pada urutan 8 frame, dan sampai 2 frame di antaranya diberi klik koreksi yang diambil dari mask sebenarnya dan dari kesalahan prediksi model sendiri. Prompt awalnya berupa mask (50%), klik positif (25%), atau kotak (25%). Itu sebabnya satu model bisa menerima ketiga jenis prompt.
- **Tiga loss.** *Focal* dan *dice* untuk mask (bobot 20:1), L1 untuk skor IoU, dan *cross-entropy* untuk prediksi oklusi.
- **Biaya.** Model card di paper menyebut model rilis dilatih dengan 256 GPU A100 selama 108 jam, sekitar 12 ribu kWh. Mereplikasi pelatihan dari nol tidak realistis untuk tesis. Yang realistis adalah inferensi, *fine-tuning* ringan, atau evaluasi.

### Ablation

Ablation di lampiran dijalankan dengan resolusi lebih rendah (512) dan data lebih kecil, jadi angkanya tidak sama dengan model akhir.

- **Data engine paling berpengaruh.** Model yang hanya dilatih pada dataset VOS yang ada lemah di benchmark zero-shot. Menambahkan data hasil data engine menaikkan rata-rata sekitar 12 poin. Penulis menyimpulkan bahwa keragaman dan skala data adalah faktor terpenting.
- **Contoh sulit lebih berharga.** Dengan jumlah data yang sama (50 ribu masklet), memilih yang paling banyak dikoreksi anotator memberi 66,2 J&F di SA-V val, dibanding 63,7 untuk pilihan acak. Seluruh 190 ribu masklet manual memberi 69,9.
- **Arsitektur relatif tidak sensitif.** Jumlah frame dalam memory bank (4, 6, atau 8) hampir tidak mengubah hasil: 68,6; 68,3; 69,0.
- **Object pointer membantu.** Tanpa object pointer, SA-V val turun dari 68,3 ke 64,5 dan LVOSv2 dari 71,6 ke 67,0.
- **Ukuran encoder tidak sepenuhnya monoton.** Pada rata-rata zero-shot, urutannya S 69,4, B+ 70,7, L 71,9. Pada SA-V val, B+ justru unggul dari L (68,3 vs 66,3). Karena lebih cepat, B+ dipakai sebagai varian bawaan.

Kesimpulannya, kalau data dan arsitektur sama-sama bisa diubah, data layak digarap lebih dulu.

## Catatan kritis atas hasil SAM 2

1. **Baseline “3× lebih sedikit interaksi” dibangun penulis sendiri.** Pembandingnya gabungan SAM dengan model VOS (SAM + Cutie, SAM + XMem++), bukan sistem interaktif yang dirancang khusus. Pada DAVIS interaktif selisihnya jauh lebih tipis. Menurut tabel lampiran, SAM 2 dengan klik mencapai AUC J&F 0,86, sedangkan MiVOS dengan coretan 0,87 dan CiVOS 0,83. Penulis mencatat bahwa klik pertama SAM 2 sering hanya mengambil bagian objek, yang menekan skornya.
2. **SA-V dibuat dengan SAM 2 di dalam loop anotasi.** Menurut saya ini membuka kemungkinan bias, karena mask referensi bisa cenderung mengikuti gaya SAM 2. Pengujian pada dataset yang anotasinya tidak melibatkan SAM 2 akan menjawabnya.
3. **Label "zero-shot" perlu dicek per tabel.** Paper melaporkan beberapa campuran data latih. Varian yang menyertakan dataset VOS terbuka (DAVIS, MOSE, YouTubeVOS) tentu tidak zero-shot pada dataset itu, sedangkan model rilis disebut memakai campuran tanpa mereka.
4. **Satu klik mengukur ambiguitas.** Pada Ego-Exo4D (mask orang), dengan satu klik skor laki-laki 81,9 dan perempuan 75,1, tetapi selisihnya menyempit menjadi 94,3 vs 92,7 kalau hanya dihitung klip yang tersegmentasi benar. Penjelasan penulis: model sering memprediksi bagian tubuh, bukan orangnya. Hal yang sama muncul di percobaan saya di bawah. Analisis ini juga baru mencakup satu dataset.
5. **Replikasi sulit.** Pelatihan butuh ratusan GPU, sehingga hanya sedikit pihak yang bisa memeriksa klaimnya secara independen.

## SAM 3: segmentasi berbasis konsep

Di SAM 1 dan 2, satu prompt menunjuk satu objek. Kebutuhan sering kali berbeda: “tandai semua bus sekolah di video ini.”

SAM 3 (*Segment Anything with Concepts*, Carion dkk., 2025) menjawabnya dengan tugas baru, *Promptable Concept Segmentation*. Masukannya frasa kata benda pendek atau contoh gambar, dan model mendeteksi, menyegmentasi, serta melacak semua instans konsep itu, masing-masing dengan identitas unik.

Menurut paper dan README resminya:

- Ada **detektor** berbasis DETR untuk gambar dan **tracker** berbasis memori yang mewarisi arsitektur SAM 2. Keduanya berbagi satu *vision encoder*.
- Ada **presence head** yang memisahkan pertanyaan “apakah konsep ini ada di gambar?” dari “di mana tepatnya?”. Menurut penulis, memaksa tiap query memahami konteks global justru merugikan.
- Ukuran modelnya sekitar 848 juta parameter.
- Datanya berasal dari data engine dengan sekitar 4 juta label konsep unik (termasuk *hard negative*), disertai benchmark baru **SA-Co**.

Pada 27 Maret 2026 Meta merilis **SAM 3.1 (Object Multiplex)**, yang memakai memori bersama untuk melacak banyak objek sekaligus. Menurut README, ini lebih cepat tanpa mengorbankan akurasi, dan tampaknya menjawab kelemahan SAM 2 yang memproses tiap objek sendiri-sendiri.

### Hasil dan ablation

Pada SA-Co/Gold (gambar, prompt teks), SAM 3 mendapat cgF1 54,1. Pembanding terkuat, OWLv2⋆, mendapat 24,6, lalu DINO-X 21,3 dan Gemini 2.5 13,0, sedangkan manusia 72,8. Itu sekitar 74% performa manusia dan lebih dari dua kali baseline terkuat, sesuai klaim penulis. README menyebut 75 sampai 80 persen untuk SA-Co secara keseluruhan. Pada video SA-V, SAM 3 mendapat 30,3 cgF1 dan 58,0 pHOTA, dibanding manusia 53,1 dan 70,5. Satu gambar dengan 100+ objek diproses dalam sekitar 30 ms di GPU H200.

Hasil ablation:

- **Presence head** menaikkan cgF1 dari 50,7 ke 52,2.
- **Hard negative:** dari 0 ke 30 contoh negatif per gambar, cgF1 naik dari 28,3 ke 43,0.
- **Sumber data:** data eksternal saja 23,7, ditambah data sintetis 32,8, ditambah data berkualitas tinggi yang diverifikasi 47,4. Verifikator AI menutup sekitar setengah selisih dengan verifikator manusia.

Seperti pada SAM 2, kualitas dan strategi data lebih menentukan daripada arsitektur.

Dua catatan. Pertama, SA-Co dirancang bersama data engine SAM 3, jadi angkanya mencerminkan kondisi yang dirancang tim yang sama, dan evaluasi pihak ketiga akan sangat berguna. Kedua, penulis mengakui model sulit digeneralisasi ke konsep di luar domain latihan, dan teks dibatasi pada frasa kata benda sederhana. Untuk kalimat acuan yang panjang atau butuh penalaran, mereka menggabungkannya dengan model bahasa multimodal.

### SAM 2 atau SAM 3?

SAM 2.1 berlisensi Apache 2.0, butuh Python 3.10+ dan PyTorch 2.5.1+, dan varian terkecilnya hanya puluhan juta parameter. SAM 3 berlisensi SAM License, butuh Python 3.12+, PyTorch 2.7+, dan CUDA 12.6+, dan checkpoint-nya harus diminta aksesnya di Hugging Face.

Karena itu tutorial di bawah memakai SAM 2.1: tanpa permintaan akses, dan cukup ringan untuk GPU Colab gratis. Tracker SAM 3 mewarisi arsitektur SAM 2, jadi yang dipelajari di sini tetap relevan.

## Tutorial: SAM 2.1 dalam lima langkah

Notebook lengkapnya ada di [repositori blog ini](https://github.com/harisY/harisY.github.io/blob/main/notebook/sam2_tutorial.ipynb) dan bisa dibuka di Colab (pilih *Runtime → Change runtime type → T4 GPU*):

[![Buka di Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/harisY/harisY.github.io/blob/main/notebook/sam2_tutorial.ipynb)

**Langkah 1: instal, lalu unduh checkpoint dan contoh data** (gambar truk dan klip video `bedroom` dari repositori resmi).

```python
!pip install -q "git+https://github.com/facebookresearch/sam2.git"
!mkdir -p checkpoints
!wget -q -P checkpoints https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt
!wget -q -O truck.jpg https://raw.githubusercontent.com/facebookresearch/sam2/main/notebooks/images/truck.jpg
!wget -q -O bedroom.zip https://dl.fbaipublicfiles.com/segment_anything_2/assets/bedroom.zip
!unzip -q -o bedroom.zip
```

**Langkah 2: muat model.**

```python
import torch
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
checkpoint = "checkpoints/sam2.1_hiera_tiny.pt"
model_cfg = "configs/sam2.1/sam2.1_hiera_t.yaml"

predictor = SAM2ImagePredictor(build_sam2(model_cfg, checkpoint, device=device))
```

**Langkah 3: segmentasi gambar dengan satu klik.**

```python
import numpy as np
from PIL import Image

image = np.array(Image.open("truck.jpg").convert("RGB"))
predictor.set_image(image)

masks, scores, _ = predictor.predict(
    point_coords=np.array([[500, 375]]),   # (x, y) piksel yang diklik (kaca jendela truk)
    point_labels=np.array([1]),            # 1 = objek, 0 = latar
    multimask_output=True,                 # tiga kandidat mask
)
```

**Langkah 4: lacak objek di video.** Kode ini memakai folder frame JPEG `bedroom` dari langkah 1. Untuk video sendiri, ubah dulu menjadi frame dengan `ffmpeg -i video.mp4 -q:v 2 -start_number 0 frames/%05d.jpg`, lalu ganti `video_path` dan koordinat kotaknya.

```python
from sam2.build_sam import build_sam2_video_predictor

video_predictor = build_sam2_video_predictor(model_cfg, checkpoint, device=device)
state = video_predictor.init_state(video_path="bedroom")

video_predictor.add_new_points_or_box(
    inference_state=state, frame_idx=0, obj_id=1,
    box=np.array([340, 10, 540, 470], dtype=np.float32),   # (x1, y1, x2, y2) di sekeliling anak perempuan
)

hasil = {}
for frame_idx, obj_ids, mask_logits in video_predictor.propagate_in_video(state):
    hasil[frame_idx] = (mask_logits[0] > 0.0).cpu().numpy()
```

**Langkah 5: bereksperimen.** Notebook di repositori menyatukan semua langkah di atas, lengkap dengan visualisasi hasilnya.

### Hasil percobaan saya

Saya menjalankan kode di atas di komputer lokal tanpa GPU (CPU, PyTorch 2.14, model `tiny`), bukan di Colab, dengan gambar `truck.jpg` dan klip `bedroom`.

**Satu klik, tiga kandidat mask.**

![Tiga kandidat mask SAM 2.1 untuk satu klik pada jendela truk]({{ '/assets/images/hasil-gambar.png' | relative_url }})

Saya mengklik kaca jendela truk. Model mengembalikan tiga kandidat dengan skor 0,952, 0,493, dan 0,042: sebagian jendela, seluruh jendela, dan hampir seluruh badan truk. Ketiganya masuk akal, karena satu titik memang ambigu: yang dimaksud bagian, benda, atau benda induknya? Skor mencerminkan keyakinan model terhadap kualitas mask, bukan maksud pengguna, jadi skor tertinggi belum tentu yang diinginkan.

**Satu kotak, 200 frame.**

![Mask SAM 2.1 mengikuti anak perempuan sepanjang klip]({{ '/assets/images/hasil-video.png' | relative_url }})

Satu kotak di frame pertama cukup untuk melacak anak perempuan di seluruh 200 frame. Di frame 120 dan 160 ia berada dekat anak laki-laki, dan mask tetap menempel padanya. Di beberapa frame mask sedikit bocor ke area sekitar kaki, tanda keterbatasan model `tiny`.

Beberapa catatan:

- **Klik vs kotak.** Pada beberapa titik klik yang saya coba di frame pertama, hasilnya hanya sebagian pakaian atau tubuh, atau malah meluas ke area besar di latar. Satu kotak langsung menghasilkan mask utuh.
- **Kecepatan.** Di CPU, melacak 200 frame memakan sekitar 12 sampai 21 menit pada dua kali percobaan (3,5 sampai 6,5 detik per frame). Dengan GPU, waktunya umumnya jauh lebih singkat.
- **Cakupan.** Ini demonstrasi kualitatif pada satu gambar, satu klip, dan satu ukuran model, tanpa metrik.

Eksperimen lanjutan yang mudah dicoba: bandingkan `tiny` dengan `large`, satu klik dengan beberapa klik, dan uji objek tipis atau transparan yang disebut paper sebagai kelemahan.

## Ide riset untuk tesis

Ide-ide berikut diturunkan dari kelemahan di atas.

1. **Adaptasi ke citra medis.** SAM dilatih di citra umum, sedangkan CT, MRI, dan USG punya kontras dan tekstur berbeda. Seberapa besar performanya turun, dan apakah *fine-tuning* ringan (LoRA atau *adapter*) cukup? Untuk volume 3D, setiap slice bisa diperlakukan sebagai frame sehingga memori SAM 2 menjaga konsistensi antarslice. Kata kunci pencarian literatur: *SAM 2 medical image segmentation*.
2. **Citra satelit dan drone.** Objek kecil, padat, dan seragam menyulitkan model. Bandingkan prompt titik, kotak, dan teks (SAM 3) untuk memetakan bangunan atau lahan pertanian.
3. **Efisiensi di perangkat tepi.** Varian `tiny` sudah ringan. Kuantisasi atau distilasi untuk Jetson atau ponsel bisa diuji dengan metrik J&F terhadap FPS dan memori.
4. **Objek serupa dan oklusi panjang.** Uji di video lalu lintas atau olahraga, lalu usulkan modul pembeda identitas, misalnya fitur penampilan tambahan.
5. **Anotasi semi-otomatis.** Terapkan pola data engine di domain sendiri: model menyarankan, manusia mengoreksi, lalu ukur penghematan waktunya.
6. **Evaluasi lintas jenis prompt.** Bandingkan klik, kotak, mask, dan teks secara sistematis, termasuk pada dataset yang anotasinya tidak melibatkan SAM untuk menguji kemungkinan bias di atas.

Apa pun yang dipilih, mulailah dari baseline zero-shot tanpa pelatihan ulang untuk melihat seberapa besar celahnya.

## Penutup

SAM 2 menunjukkan bahwa satu model bisa menangani gambar dan video dengan memori yang sederhana, dan SAM 3 bergerak dari menunjuk objek ke menyebutkan konsep. Keduanya menekankan peran data. Masalah oklusi panjang, objek serupa, dan pergeseran domain masih terbuka, dan itulah ruang untuk riset lanjutan.

Koreksi atau saran bisa disampaikan lewat *issue* di repositori.

---

### Daftar pustaka

1. N. Ravi, V. Gabeur, Y.-T. Hu, R. Hu, C. Ryali, T. Ma, H. Khedr, R. Rädle, C. Rolland, L. Gustafson, E. Mintun, J. Pan, K. V. Alwala, N. Carion, C.-Y. Wu, R. Girshick, P. Dollár, dan C. Feichtenhofer, “SAM 2: Segment Anything in Images and Videos,” *International Conference on Learning Representations (ICLR)*, 2025. arXiv:2408.00714. <https://arxiv.org/abs/2408.00714>
2. N. Carion, L. Gustafson, dkk., “SAM 3: Segment Anything with Concepts,” arXiv:2511.16719, 2025. <https://arxiv.org/abs/2511.16719>
3. Meta AI (facebookresearch), repositori resmi SAM 2. <https://github.com/facebookresearch/sam2>
4. Meta AI (facebookresearch), repositori resmi SAM 3. <https://github.com/facebookresearch/sam3>
