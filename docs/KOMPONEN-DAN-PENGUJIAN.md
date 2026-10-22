# Komponen dan Quality Gates

Semua 15 berkas konten kini menggunakan frontmatter blocks dan tidak menyimpan body Markdown. Halaman statis memakai `PageBlocks`; artikel, panduan, dan layanan memakai `BlockRenderer`. Katalog noindex `/komponen/` menampilkan seluruh 26 blok reusable dengan gaya forest/lime.

Seluruh quality gates SLF tetap aktif bersama pemeriksaan TKDN:
- integritas konten dan frontmatter
- validasi timestamp global
- tautan internal dan fragment
- SEO, social metadata, sitemap, robots, JSON-LD
- atribut alt gambar
- validasi output artikel/panduan
- validasi konten terbit
- Astro check/build dan Playwright
