# Komponen Reusable dan Quality Gates

Dokumen ini mencatat kesetaraan arsitektur dengan `konsultan-slf` sekaligus penyesuaian visual dan data untuk Konsultan SNI–TKDN.

## Komponen dengan nama berkas yang disamakan

Komponen blok konten di `src/components/shared/`:

- `ContentCard.astro`
- `FaqBlock.astro`
- `CtaBlock.astro`
- `TableBlock.astro`
- `NoteBlock.astro`
- `StepsBlock.astro`
- `StatsBlock.astro`
- `GlossaryBlock.astro`
- `QuoteBlock.astro`
- `ArticleSectionBlock.astro`
- `ProcessTimeline.astro`
- `ChecklistCard.astro`
- `ComparisonTable.astro`
- `DocumentList.astro`
- `ImagePanel.astro`
- `FeatureCardGrid.astro`
- `StatsGrid.astro`
- `SourceLinks.astro`
- `ContactPanel.astro`
- `PageHeaderBlock.astro`
- `HomeHeroBlock.astro`
- `ServiceListBlock.astro`
- `HomeProcessBlock.astro`
- `ArticleListBlock.astro`
- `HomeCtaBlock.astro`
- `NotFoundBlock.astro`
- `SiteHeader.astro`
- `SiteFooter.astro`
- `ArticlePreviousArticles.astro`

Renderer bersama berada di `src/components/blocks/BlockRenderer.astro`, dan registry di `src/components/blocks.ts`. Komponen mengikuti palet forest/lime, token CSS dan pola visual proyek TKDN; tidak memakai utility class Tailwind milik SLF secara mentah. Halaman `/komponen/` adalah katalog noindex untuk menguji seluruh 26 blok konten melalui renderer yang sama dengan artikel, panduan, dan layanan.

## Pengujian yang dipertahankan dari SLF

Build menjalankan semua quality gate berikut; tes baru tidak menggantikan atau mengurangi pemeriksaan yang sudah ada.

1. `scripts/check-frontmatter-integrity.mjs` — delimiter dan integritas metadata frontmatter.
2. `scripts/check-content-dates.mjs` — format UTC, urutan tanggal, dan keunikan timestamp global.
3. `scripts/check-internal-links.mjs` — tautan lokal, fragment, ID HTML duplikat, dan skema URL berbahaya.
4. `scripts/check-seo-output.mjs` — metadata, canonical, social cards, sitemap/robots, serta validasi JSON-LD.
5. `scripts/check-image-alt.mjs` — atribut `alt` dan `src` pada seluruh gambar HTML.
6. `scripts/check-article-content-output.mjs` — konten artikel/panduan benar-benar tampil melalui komponen reusable.
7. `scripts/check-published-content.mjs` — format tanggal dan deteksi placeholder pada konten terbit.

Pemeriksaan asli proyek tetap aktif: `astro check`, integritas ID/slug/relasi, validasi output konten, validasi SEO/output, dan Playwright. `scripts/check-component-coverage.mjs` memastikan setiap key registry dipakai di katalog dan halaman detail tidak memakai renderer Markdown Astro secara langsung.

## Strategi konten

Body artikel, panduan, dan layanan diproses oleh `markdownToBlocks()`, lalu setiap paragraf, judul bagian, daftar, kutipan, dan tabel dirender melalui komponen Astro yang terdaftar. Konten yang sudah memakai frontmatter `blocks` langsung menggunakan block tersebut. Halaman statis tetap dirakit dari komponen dan data frontmatter, bukan body Markdown.
