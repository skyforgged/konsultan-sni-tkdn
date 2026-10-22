# Komponen Reusable dan Pengujian

Semua konten 15 halaman/entri kini disimpan pada frontmatter dan dirender melalui komponen Astro. Tidak ada body Markdown murni yang tersisa pada berkas konten. Artikel, panduan, dan layanan memakai `BlockRenderer`; halaman statis memakai `PageBlocks`. Katalog noindex `/komponen/` merender semua 26 komponen blok untuk memastikan pemakaian ulang.

Quality gates SLF yang dijalankan bersama pemeriksaan TKDN:
- `check-frontmatter-integrity.mjs`
- `check-content-dates.mjs`
- `check-internal-links.mjs`
- `check-seo-output.mjs`
- `check-image-alt.mjs`
- `check-article-content-output.mjs`
- `check-published-content.mjs`

Pemeriksaan integritas konten, SEO/output, validasi halaman konten, component coverage, dan Playwright tetap aktif. Tidak ada pengujian yang dihapus untuk menghindari kegagalan build.
