---
layout: page
title: Tentang penulis
permalink: /tentang/
---

<div class="profile-header">
  <img class="avatar profile-avatar" src="https://github.com/harisY.png?size=240" alt="Foto profil Abdul Haris" width="120" height="120">
  <div>
    <p class="profile-name">Abdul Haris</p>
    <p class="profile-role">Mahasiswa S2 TI UNPAM</p>
    <p><a href="https://github.com/harisY">GitHub</a> dan <a href="https://github.com/harisY/harisY.github.io">repositori blog ini</a></p>
  </div>
</div>

Saya menulis catatan dan tutorial dari mata kuliah Advanced Computer Vision untuk teman-teman sesama mahasiswa: membaca paper, memahami metodenya, dan mencari ide riset yang bisa dikembangkan menjadi tesis.

## Tulisan

<ul class="profile-posts">
{%- for post in site.posts -%}
  <li><a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a> <span class="post-meta">{% include date-id.html date=post.date %}</span></li>
{%- endfor -%}
</ul>

## Kontak

Pertanyaan dan koreksi bisa disampaikan lewat [GitHub](https://github.com/harisY).
