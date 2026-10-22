---
layout: page
title: Tentang Penulis
permalink: /tentang/
---

<div class="profile-header">
  <img class="author-avatar profile-avatar" src="https://github.com/harisY.png?size=240" alt="Foto profil Abdul Haris" width="120" height="120">
  <div>
    <p class="profile-name">Abdul Haris</p>
    <p class="profile-role">Mahasiswa S2 TI UNPAM</p>
    <p class="profile-links"><a href="https://github.com/harisY">GitHub</a> &middot; <a href="https://github.com/harisY/harisY.github.io">Repositori blog ini</a></p>
  </div>
</div>

Saya menulis catatan dan tutorial dari mata kuliah Advanced Computer Vision untuk teman-teman sesama mahasiswa: membaca paper, memahami metodenya, dan mencari ide riset yang bisa dikembangkan menjadi tesis.

## Tulisan

<ul class="profile-posts">
{%- for post in site.posts -%}
  <li><a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a> <span class="post-meta">{{ post.date | date: "%Y-%m-%d" }}</span></li>
{%- endfor -%}
  <li><a href="https://harisy.github.io/acv-sam2-blog/">Dari “Klik Objeknya” ke “Sebut Namanya”: Perjalanan SAM 2 menuju SAM 3</a> <span class="post-meta">2026-10-21</span></li>
</ul>

## Kontak

Pertanyaan dan koreksi bisa disampaikan lewat [GitHub](https://github.com/harisY).
