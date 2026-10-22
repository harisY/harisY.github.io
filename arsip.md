---
layout: page
title: Arsip
permalink: /arsip/
---
{% assign tags_sorted = site.tags | sort %}
{% assign years = site.posts | group_by_exp: "post", "post.date | date: '%Y'" %}

<form class="search" id="cari" role="search">
  <label for="cari-input">Cari tulisan</label>
  <input id="cari-input" type="search" data-index="{{ '/search.json' | relative_url }}" placeholder="Misalnya: ViT atau segmentasi" autocomplete="off" spellcheck="false">
</form>
<p class="search-status" id="cari-status" role="status" aria-live="polite"></p>
<div id="cari-hasil"></div>

<div id="telusuri">

<h2>Berdasarkan topik</h2>

<ul class="tags topic-index" aria-label="Daftar topik">
{% for tag in tags_sorted %}<li><a href="#{{ tag[0] | slugify }}">{{ tag[0] }} ({{ tag[1].size }})</a></li>
{% endfor %}</ul>

{% for tag in tags_sorted %}<h3 id="{{ tag[0] | slugify }}">{{ tag[0] }}</h3>
<ul>
{% for post in tag[1] %}<li><a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a></li>
{% endfor %}</ul>
{% endfor %}

<h2>Semua tulisan</h2>

{% for year in years %}<h3>{{ year.name }}</h3>
<ul>
{% for post in year.items %}<li><a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a> <span class="post-meta">{{ post.date | date: "%Y-%m-%d" }}</span></li>
{% endfor %}</ul>
{% endfor %}

</div>

<script src="{{ '/assets/search.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>
