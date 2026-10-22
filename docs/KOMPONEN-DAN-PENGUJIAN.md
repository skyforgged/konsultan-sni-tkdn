# Catatan Verifikasi Komponen dan Pengujian

Implementasi memakai nama berkas yang sama dengan arsitektur komponen konsultan-slf, dengan tampilan forest/lime dan CSS proyek Konsultan SNI–TKDN. Katalog noindex `/komponen/` menampilkan seluruh 26 komponen blok melalui renderer yang sama dengan artikel, panduan, dan layanan.

Quality gates SLF yang kini dijalankan oleh `npm run build`:
1. `check-frontmatter-integrity.mjs`
2. `check-content-dates.mjs`
3. `check-internal-links.mjs`
4. `check-seo-output.mjs`
5. `check-image-alt.mjs`
6. `check-article-content-output.mjs`
7. `check-published-content.mjs`

Quality gates lama TKDN dan Playwright tetap dipertahankan. `check-component-coverage.mjs` memastikan seluruh blok terdaftar digunakan pada katalog, semua berkas komponen wajib tersedia, dan halaman detail artikel/panduan/layanan memakai `BlockRenderer` alih-alih renderer Markdown Astro langsung.
