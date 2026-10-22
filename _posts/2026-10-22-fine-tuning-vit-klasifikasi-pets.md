---
layout: post
title: "Fine-tuning Vision Transformer (ViT) untuk Klasifikasi Ras Kucing dan Anjing: Tutorial dari Nol di Colab"
author: "Abdul Haris"
date: 2026-10-22 06:00:00 +0700
categories: [computer-vision]
tags: [vision-transformer, vit, image-classification, fine-tuning, pytorch, transfer-learning, tutorial]
description: "Tutorial fine-tuning ViT-B/16 dengan PyTorch dan Hugging Face pada dataset Oxford-IIIT Pet, lengkap dengan notebook Colab dan evaluasi."
---

Di tutorial ini kita fine-tune **Vision Transformer (ViT-B/16)** yang sudah di-pretrain, lalu memakainya untuk mengenali ras kucing dan anjing dari foto. Datanya **Oxford-IIIT Pet**. Alurnya lengkap: memuat data, melatih model, mengevaluasi, sampai melihat prediksi yang benar dan yang salah.

Hasil akhirnya, pada konfigurasi ringan yang saya jalankan di CPU (10 ras, 400 gambar latih, 3 epoch), model mencapai **accuracy 89%** pada 300 gambar test. Sebelum dilatih, angkanya hanya 11,3%, setara tebakan acak. Notebook yang sama bisa dijalankan di Colab dengan konfigurasi penuh (37 ras).

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/harisY/vit-pets-finetune/blob/main/notebooks/vit_pets_finetune.ipynb)

> **Catatan jujur soal hasil.** Mesin saya tidak punya GPU, jadi semua angka dan gambar di artikel berasal dari **konfigurasi ringan di CPU**. Kalau Anda menjalankan konfigurasi penuh di Colab (GPU T4), angkanya akan berbeda. Saya tidak bisa menjalankan konfigurasi penuh itu, jadi belum ada angkanya di sini.

## Konsep singkat: apa itu ViT?

CNN seperti ResNet membaca gambar lewat filter konvolusi yang bergeser di atas piksel. **ViT** (Dosovitskiy dkk., 2020) memakai jalan lain: gambar dipotong menjadi *patch* berukuran tetap, lalu patch-patch itu diperlakukan seperti kata dalam kalimat dan diproses oleh **Transformer encoder** (Vaswani dkk., 2017).

Untuk ViT-B/16 pada gambar 224×224, alurnya seperti ini:

1. Gambar dipotong menjadi (224/16)² = **196 patch** berukuran 16×16 piksel.
2. Setiap patch diratakan lalu diproyeksikan secara linear menjadi vektor berdimensi 768 (*patch embedding*).
3. Ditambahkan satu token khusus `[CLS]` di depan urutan, ditambah *position embedding* supaya model tahu posisi tiap patch.
4. Urutan itu melewati 12 lapis Transformer. Tiap lapis berisi *multi-head self-attention* dan MLP.
5. Keluaran token `[CLS]` masuk ke **classification head** (satu lapis linear) yang menghasilkan skor per kelas.

Kenapa fine-tuning dan bukan melatih dari nol? ViT dikenal haus data. Dokumentasi Hugging Face mencatat bahwa performa dari pretraining pada dataset besar bisa dipindahkan ke tugas yang lebih kecil. Checkpoint yang kita pakai, `google/vit-base-patch16-224-in21k`, di-pretrain pada ImageNet-21k (sekitar 14 juta gambar). Kita hanya perlu mengganti head-nya dan menyesuaikan seluruh bobot dengan data kita. Ini disebut **transfer learning**.

## Prasyarat

- Python dasar dan konsep machine learning (loss, optimizer, train/test split).
- Akun Google untuk Colab. Tidak perlu membayar, GPU T4 gratis sudah cukup.
- Tidak wajib: pengalaman PyTorch. Kodenya saya tulis sebagai training loop biasa agar mudah diikuti.

## Persiapan environment

1. Buka notebook lewat badge Colab di atas.
2. Aktifkan GPU: *Runtime → Change runtime type → T4 GPU*.
3. Jalankan sel instalasi:

```python
%pip install -q "transformers==5.20.2" scikit-learn
```

Saya mengunci versi `transformers` ke yang saya pakai (5.20.2). `torch` dan `torchvision` sengaja **tidak** saya kunci, karena Colab sudah membawa versi CUDA-nya sendiri dan menginstal ulang justru berisiko merusaknya. Versi lengkap yang saya pakai: torch 2.14.1, torchvision 0.29.1, scikit-learn 1.9.1, numpy 2.5.2, dengan Python 3.12 di Windows 11 (CPU). Kalau versi di Colab saat Anda membuka berbeda, hasil dan sebagian API bisa ikut berbeda.

Satu saklar menentukan konfigurasi:

```python
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
LIGHT = device.type == "cpu"

if LIGHT:   # konfigurasi ringan (yang saya jalankan)
    N_CLASSES, TRAIN_PER_CLASS, TEST_PER_CLASS, EPOCHS, BATCH_SIZE = 10, 40, 30, 3, 16
else:       # konfigurasi penuh (Colab GPU)
    N_CLASSES, TRAIN_PER_CLASS, TEST_PER_CLASS, EPOCHS, BATCH_SIZE = 37, None, None, 3, 32
```

Ada GPU berarti `LIGHT = False` dan seluruh data dipakai. Tanpa GPU, notebook otomatis memakai subset kecil. `SEED = 42` dipasang untuk `random`, NumPy, dan PyTorch. Di CPU saya, dua kali eksekusi penuh menghasilkan loss dan accuracy yang persis sama. Di GPU, beberapa operasi tidak deterministik, jadi jangan heran kalau angkanya sedikit bergeser.

## Persiapan dataset

**Oxford-IIIT Pet** berisi 37 ras kucing dan anjing, sekitar 200 gambar per ras. Dataset dirilis oleh Parkhi dkk. (CVPR 2012) dan tersedia di [situs resmi VGG](https://www.robots.ox.ac.uk/~vgg/data/pets/). Halaman itu menyatakan lisensi **CC BY-SA 4.0**, dengan catatan hak cipta gambar tetap pada pemilik aslinya.

Soal pemilihan dataset: saya sempat mempertimbangkan Oxford Flowers-102, tetapi halaman resminya tidak menyebut lisensi apa pun, jadi saya tidak memakainya.

`torchvision.datasets.OxfordIIITPet` mengunduh arsip dari situs resmi tersebut dan memeriksa checksum-nya. Ukuran `images.tar.gz` sekitar 790 MB, jadi unduhan pertama butuh beberapa menit.

```python
train_base = OxfordIIITPet(root=DATA_DIR, split="trainval", target_types="category", download=True)
test_base  = OxfordIIITPet(root=DATA_DIR, split="test",     target_types="category", download=True)
```

- `split="trainval"` dan `"test"` adalah pembagian resmi: 3.680 gambar latih dan 3.669 gambar test.
- `target_types="category"` membuat tiap sampel berupa pasangan (gambar PIL, indeks ras 0–36).

Pada konfigurasi ringan, saya ambil 10 ras pertama menurut urutan alfabet: Abyssinian, American Bulldog, American Pit Bull Terrier, Basset Hound, Beagle, Bengal, Birman, Bombay, Boxer, dan British Shorthair. Jadi ada 5 ras kucing dan 5 ras anjing. Dari tiap ras diambil 40 gambar latih dan 30 gambar test secara acak dengan seed tetap, sehingga totalnya 400 gambar latih dan 300 gambar test.

![Contoh gambar dari tiap kelas]({{ "/assets/images/01_contoh_data.webp" | relative_url }}){: width="1419" height="652" loading="lazy"}

## Langkah implementasi

### 1. Transformasi data

```python
processor = AutoImageProcessor.from_pretrained(MODEL_ID)
MEAN, STD = processor.image_mean, processor.image_std   # (0.5, 0.5, 0.5) untuk checkpoint ini

train_tf = transforms.Compose([
    transforms.RandomResizedCrop(224, scale=(0.7, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.ToTensor(), transforms.Normalize(MEAN, STD),
])
test_tf = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(), transforms.Normalize(MEAN, STD),
])
```

Mean dan std saya ambil dari konfigurasi checkpoint, bukan dari ingatan. Hasilnya 0,5 untuk ketiga kanal, berbeda dari nilai ImageNet yang biasa. Mengganti normalisasi dengan nilai yang salah termasuk kesalahan yang diam-diam menurunkan akurasi tanpa error. Data latih diberi augmentasi ringan (crop acak dan flip), sedangkan data test hanya di-resize.

### 2. Memuat model

```python
model = ViTForImageClassification.from_pretrained(
    MODEL_ID, num_labels=N_CLASSES, id2label=id2label, label2id=label2id,
).to(device)
```

`num_labels` membuat head linear baru dengan jumlah keluaran sesuai kelas kita. Saat memuat, Transformers mencetak laporan seperti ini:

```
pooler.dense.bias   | UNEXPECTED
classifier.weight   | MISSING
```

Laporan ini **normal**. `classifier.*` berstatus *MISSING* karena head baru memang tidak ada di checkpoint, sehingga diinisialisasi acak. `pooler.*` berstatus *UNEXPECTED* karena bagian itu ada di checkpoint tetapi tidak dipakai oleh model klasifikasi. Total parameter model: 85,8 juta.

## Training: parameter dan alasannya

Saya menulis training loop PyTorch sendiri, bukan memakai `Trainer`. Alasannya, bagian utamanya terlihat jelas dan tidak terikat pada argumen `Trainer` yang bisa berbeda antarversi.

```python
opt = torch.optim.AdamW(groups, lr=LR)          # LR = 5e-5
sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: (s + 1) / warm if s < warm
                                           else max(0.0, (total - s) / (total - warm)))
...
loss = nn.functional.cross_entropy(model(pixel_values=x).logits, y)
scaler.scale(loss).backward()
scaler.unscale_(opt); nn.utils.clip_grad_norm_(model.parameters(), 1.0)
scaler.step(opt); scaler.update(); sched.step()
```

| Parameter | Nilai | Alasan |
|---|---|---|
| Learning rate | 5e-5 (AdamW) | Fine-tuning butuh learning rate kecil supaya bobot pretrained tidak rusak |
| Warmup | 10% langkah, lalu turun linear ke 0 | Menstabilkan langkah awal ketika head masih acak |
| Weight decay | 0,01 (bias dan LayerNorm dikecualikan) | Praktik umum untuk regularisasi |
| Gradient clipping | 1,0 | Mencegah satu batch memicu lonjakan gradien |
| Epoch | 3 | Cukup untuk melihat tren, dan cukup ringan untuk CPU |
| Batch size | 16 (ringan) / 32 (penuh) | Batch kecil agar muat di memori CPU |
| Mixed precision | fp16, hanya di GPU | Mempercepat training dan menghemat memori |

Saya tidak melakukan *hyperparameter search*. Semua nilai di atas adalah titik awal yang umum, bukan hasil tuning. Dengan 400 gambar dan batch 16, satu epoch hanya 25 langkah, jadi total training cuma 75 langkah.

Waktu per epoch di CPU saya (Intel Core Ultra 7 258V, 8 core) berkisar sekitar 4 sampai 7 menit. Dua kali eksekusi menghasilkan total 704 dan 1.041 detik, jadi waktunya cukup berfluktuasi sementara angka akurasinya identik.

## Evaluasi

Sebelum training, accuracy 0,113 pada 300 gambar test (tebakan acak untuk 10 kelas = 0,100). Berikut hasil per epoch:

| Epoch | Train loss | Test loss | Test accuracy |
|---|---|---|---|
| 1 | 2,111 | 1,889 | 0,863 |
| 2 | 1,626 | 1,580 | 0,887 |
| 3 | 1,359 | 1,477 | **0,890** |

Hasil akhir: **accuracy 0,890** dan **macro-F1 0,890**.

Cara membaca metriknya:
- **Accuracy**: proporsi tebakan yang benar. Mudah dipahami, tetapi bisa menipu kalau kelasnya tidak seimbang. Di sini tiap kelas punya 30 gambar test, jadi aman.
- **Macro-F1**: rata-rata F1 per kelas, dengan bobot yang sama untuk semua kelas. F1 adalah rata-rata harmonik precision dan recall.
- **Confusion matrix**: baris adalah label sebenarnya, kolom adalah prediksi. Angka di luar diagonal menunjukkan kelas mana yang tertukar.

![Kurva loss dan accuracy]({{ "/assets/images/02_kurva_training.webp" | relative_url }}){: width="1089" height="384" loading="lazy"}

Perhatikan sumbu *accuracy* di grafik kanan. Rentangnya hanya 0,865 sampai 0,890, jadi kenaikannya terlihat curam padahal selisihnya tipis. Hampir seluruh lompatan terjadi di epoch pertama (dari 0,113 ke 0,863).

Beberapa hal yang menurut saya penting saat membaca hasil ini:

- **Loss masih tinggi walau accuracy tinggi.** Test loss 1,48 untuk 10 kelas adalah angka yang besar (tebakan acak sama dengan ln 10 ≈ 2,30). Pada prediksi di bawah, probabilitas model hanya sekitar 13% sampai 35%, bahkan untuk prediksi yang benar. Artinya urutan peringkat kelasnya sudah tepat tetapi distribusi probabilitasnya masih datar. Dugaan saya, ini karena baru 75 langkah dan head masih belajar mengeluarkan logit yang tajam. Dugaan ini belum saya uji dengan menambah epoch.
- **Satu run, tanpa interval kepercayaan.** Dengan 300 gambar test, ketidakpastian accuracy sekitar ±3,5 poin persentase (perkiraan binomial 95%). Selisih antar epoch (0,887 ke 0,890) lebih kecil dari itu, jadi tidak bisa disimpulkan bahwa epoch 3 "lebih baik".
- **Test set dipakai untuk memantau tiap epoch.** Saya tidak memilih model atau mengubah hyperparameter berdasarkan angka itu (hanya satu konfigurasi dan satu run). Untuk eksperimen serius, sediakan set validasi terpisah.

![Confusion matrix]({{ "/assets/images/03_confusion_matrix.webp" | relative_url }}){: width="770" height="695" loading="lazy"}

Confusion matrix menunjukkan kesalahannya terkonsentrasi di ras anjing yang mirip:

- American Pit Bull Terrier: akurasi hanya 0,633. Sepuluh dari 30 gambar tertukar menjadi American Bulldog.
- Beagle (0,733): tujuh gambar tertukar menjadi Basset Hound.
- Boxer (0,800): enam gambar tertukar menjadi American Bulldog.
- Birman, Bombay, dan American Bulldog benar semua (30 dari 30).

Totalnya 33 dari 300 gambar salah. Sebagai pembanding, akurasi kelima ras kucing berkisar 0,90 sampai 1,00, sedangkan lima ras anjing berkisar 0,63 sampai 1,00. Kenapa kucing cenderung lebih mudah di subset ini tidak saya selidiki.

## Visualisasi hasil prediksi

```python
@torch.inference_mode()
def predict_top3(pil_img):
    model.eval()
    x = test_tf(pil_img.convert("RGB")).unsqueeze(0).to(device)
    p = model(pixel_values=x).logits.softmax(-1)[0]
    top = p.topk(3)
    return [(class_names[i], round(v, 4)) for v, i in zip(top.values.tolist(), top.indices.tolist())]
```

`softmax` mengubah skor mentah menjadi probabilitas, dan `topk(3)` mengambil tiga kandidat teratas. Untuk satu gambar test Abyssinian, hasilnya: Abyssinian (0,212), Bengal (0,101), American Pit Bull Terrier (0,093). Jawabannya benar, tetapi probabilitasnya rendah, sejalan dengan pengamatan loss di atas.

![Prediksi acak pada data test]({{ "/assets/images/04_prediksi_acak.webp" | relative_url }}){: width="1485" height="842" loading="lazy"}

Tujuh dari delapan gambar acak benar (hijau). Satu yang salah adalah Pit Bull Terrier yang ditebak American Bulldog.

![Contoh kesalahan prediksi]({{ "/assets/images/05_kesalahan.webp" | relative_url }}){: width="1485" height="842" loading="lazy"}

Contoh kesalahan memperlihatkan tiga Abyssinian yang ditebak British Shorthair, dan lima Pit Bull Terrier yang ditebak American Bulldog. Sebagian gambar ini memang sulit, bahkan untuk mata manusia yang tidak hafal ciri ras. Itu juga alasan evaluasi tidak boleh berhenti di angka akurasi: melihat contoh salahnya memberi petunjuk apakah masalahnya di model atau di data.

## Troubleshooting

Tiga item pertama benar-benar saya alami. Tiga berikutnya adalah masalah umum yang tidak saya temui, jadi tolong anggap sebagai saran, bukan hasil uji.

1. **`No module named pip` saat `%pip install` (saya alami).** Terjadi di environment lokal saya, yaitu virtual environment buatan `uv` yang tidak menyertakan pip. Solusi: pasang pip di environment itu, atau instal dengan `uv pip install transformers==5.20.2 scikit-learn`. Di Colab masalah ini tidak muncul.
2. **Laporan `MISSING` dan `UNEXPECTED` saat memuat model (saya alami).** Terlihat seperti error, tetapi sebenarnya normal. Penjelasannya ada di bagian "Memuat model".
3. **Judul subplot menimpa gambar di atasnya (saya alami).** Di eksekusi pertama, judul dua baris pada grid prediksi menabrak baris gambar di atasnya. Saya perbaiki dengan memperbesar tinggi figure (`figsize=(3.4 * cols, 4.0 * rows)`) lalu menjalankan ulang notebook, dan angka akhirnya identik.
4. **`CUDA out of memory` (umum, tidak saya alami karena tanpa GPU).** Kecilkan `BATCH_SIZE` (misalnya 32 menjadi 16), lalu restart runtime agar memori GPU dibebaskan.
5. **Hasil atau API berbeda karena versi library (umum, tidak saya uji).** Kode ditulis dan dijalankan dengan `transformers==5.20.2`. Kalau Colab memakai versi lain, pasang versi yang sama atau cek dokumentasi versi Anda. API `Trainer` dan *image processor* termasuk bagian yang sering berubah.
6. **`DataLoader` macet di Windows (pencegahan, tidak saya alami).** Di Windows, `num_workers > 0` dapat bermasalah di Jupyter. Notebook sudah mengaturnya menjadi 0 pada Windows (`os.name == "nt"`).

## Pengembangan lanjutan (ide)

Semua poin di bawah adalah **ide**, belum saya jalankan.

- **Ablation dengan jumlah epoch dan learning rate.** Uji apakah loss dan kalibrasi probabilitas membaik dengan 10 epoch, dan seberapa sensitif hasilnya terhadap learning rate.
- **Linear probing versus full fine-tuning.** Bekukan encoder dan latih head saja, lalu bandingkan akurasi dan waktu training dengan fine-tuning penuh.
- **Bandingkan dengan CNN.** Fine-tune ResNet-50 pada data yang sama. Pertanyaannya: pada data sedikit, mana yang lebih efisien?
- **Kalibrasi.** Ukur *expected calibration error* dan coba *temperature scaling* untuk memperbaiki probabilitas yang terlalu datar.
- **Resolusi lebih tinggi.** Dokumentasi menyebut fine-tuning dengan resolusi di atas 224×224 bisa lebih baik. Uji lewat opsi `interpolate_pos_encoding`.
- **Analisis ras yang tertukar.** Investigasi kenapa Pit Bull Terrier dan American Bulldog sering tertukar: apakah label datanya ambigu, atau model kekurangan fitur pembeda?

## Kesimpulan

Dalam tutorial ini kita mengambil ViT-B/16 yang di-pretrain di ImageNet-21k, mengganti head-nya, dan fine-tune pada subset Oxford-IIIT Pet (10 ras, 400 gambar latih, 3 epoch). Pada konfigurasi ringan di CPU, accuracy naik dari 11,3% ke 89,0% dengan macro-F1 0,890. Sebagian besar kenaikan terjadi di epoch pertama, dan kesalahan terkonsentrasi di ras anjing yang mirip.

Yang perlu diingat: ini satu run pada subset kecil, tanpa hyperparameter tuning, di CPU. Karena itu angkanya cukup untuk memahami alurnya, tidak untuk membandingkan model secara serius. Jalankan notebook di Colab dengan konfigurasi penuh untuk melihat bagaimana hasilnya berubah. Saya sengaja tidak memperkirakan angkanya karena belum menjalankannya.

Kode dan notebook ada di [repositori GitHub](https://github.com/harisY/vit-pets-finetune), berlisensi MIT. Dataset dan model pretrained punya lisensi sendiri: CC BY-SA 4.0 untuk Oxford-IIIT Pet dan Apache-2.0 untuk checkpoint `google/vit-base-patch16-224-in21k`.

## Referensi

1. A. Dosovitskiy, L. Beyer, A. Kolesnikov, D. Weissenborn, X. Zhai, T. Unterthiner, M. Dehghani, M. Minderer, G. Heigold, S. Gelly, J. Uszkoreit, dan N. Houlsby, "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale," *ICLR*, 2021. arXiv:2010.11929. <https://arxiv.org/abs/2010.11929>
2. A. Vaswani, N. Shazeer, N. Parmar, J. Uszkoreit, L. Jones, A. N. Gomez, Ł. Kaiser, dan I. Polosukhin, "Attention Is All You Need," *Advances in Neural Information Processing Systems 30 (NeurIPS)*, 2017. arXiv:1706.03762. <https://arxiv.org/abs/1706.03762>
3. O. M. Parkhi, A. Vedaldi, A. Zisserman, dan C. V. Jawahar, "Cats and Dogs," *IEEE Conference on Computer Vision and Pattern Recognition (CVPR)*, 2012. Halaman dataset: <https://www.robots.ox.ac.uk/~vgg/data/pets/>
4. Hugging Face, dokumentasi model ViT di Transformers. <https://huggingface.co/docs/transformers/model_doc/vit>
5. Hugging Face, model card `google/vit-base-patch16-224-in21k`. <https://huggingface.co/google/vit-base-patch16-224-in21k>
6. PyTorch, dokumentasi `torchvision.datasets.OxfordIIITPet`. <https://docs.pytorch.org/vision/stable/generated/torchvision.datasets.OxfordIIITPet.html>
