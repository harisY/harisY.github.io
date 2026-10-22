---
layout: page
title: Arsip
permalink: /arsip/
---

## Berdasarkan topik

{%- assign tags_sorted = site.tags | sort -%}
<ul class="tags topic-index" aria-label="Daftar topik">
{%- for tag in tags_sorted -%}
  <li><a href="#{{ tag[0] | slugify }}">{{ tag[0] }} ({{ tag[1].size }})</a></li>
{%- endfor -%}
</ul>

{%- for tag in tags_sorted %}

### {{ tag[0] }}
{: #{{ tag[0] | slugify }} }

{% for post in tag[1] -%}
- [{{ post.title | escape }}]({{ post.url | relative_url }})
{% endfor -%}
{%- endfor %}

## Semua tulisan

{%- assign years = site.posts | group_by_exp: "post", "post.date | date: '%Y'" -%}
{%- for year in years %}

### {{ year.name }}

{% for post in year.items -%}
- [{{ post.title | escape }}]({{ post.url | relative_url }}), {{ post.date | date: "%Y-%m-%d" }}
{% endfor -%}
{%- endfor %}
