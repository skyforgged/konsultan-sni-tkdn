# Verifikasi Komponen dan Pengujian

Konten halaman statis kini disimpan sebagai frontmatter `blocks` dan dirender dengan `PageBlocks`. Detail artikel, panduan, dan layanan melewati `BlockRenderer`, bukan renderer Markdown Astro langsung. Halaman `/komponen/` (noindex) merender seluruh 26 komponen blok dari registry untuk verifikasi reusable.

Quality gates dari `konsultan-slf` yang dijalankan bersama quality gates TKDN:
- `check-frontmatter-integrity.mjs`
- `check-content-dates.mjs`
- `check-internal-links.mjs`
- `check-seo-output.mjs`
- `check-image-alt.mjs`
- `check-article-content-output.mjs`
- `check-published-content.mjs`

Tes Playwright juga mencakup seluruh halaman inti, navigasi, menu mobile, 404, katalog komponen, dan rendering artikel melalui komponen.
