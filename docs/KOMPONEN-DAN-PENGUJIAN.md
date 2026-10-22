# Komponen Reusable dan Pengujian

Seluruh 15 entri konten disimpan pada frontmatter blocks; body Markdown sudah dikosongkan. Halaman statis dirender melalui `PageBlocks`, sementara artikel, panduan, dan layanan memakai `BlockRenderer`. Katalog noindex `/komponen/` menguji semua 26 komponen blok.

Quality gates SLF yang dipertahankan bersama semua pemeriksaan TKDN:
- `check-frontmatter-integrity.mjs`
- `check-content-dates.mjs`
- `check-internal-links.mjs`
- `check-seo-output.mjs`
- `check-image-alt.mjs`
- `check-article-content-output.mjs`
- `check-published-content.mjs`

Tes Playwright juga memverifikasi halaman inti, navigasi, menu mobile, 404, katalog komponen, dan rendering artikel melalui blok komponen.

CI memverifikasi seluruh blok dan seluruh konten diterbitkan dari frontmatter.
