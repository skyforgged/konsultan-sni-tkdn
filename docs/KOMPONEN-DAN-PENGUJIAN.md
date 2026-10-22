# Verifikasi Komponen dan Quality Gates

Daftar berkas komponen disamakan dengan `konsultan-slf` dan seluruh komponen konten menggunakan sistem visual forest/lime milik TKDN.

## Komponen reusable yang diadopsi

- `src/components/shared/ContentCard.astro`
- `src/components/shared/FaqBlock.astro`
- `src/components/shared/CtaBlock.astro`
- `src/components/shared/TableBlock.astro`
- `src/components/shared/NoteBlock.astro`
- `src/components/shared/StepsBlock.astro`
- `src/components/shared/StatsBlock.astro`
- `src/components/shared/GlossaryBlock.astro`
- `src/components/shared/QuoteBlock.astro`
- `src/components/shared/ArticleSectionBlock.astro`
- `src/components/shared/ProcessTimeline.astro`
- `src/components/shared/ChecklistCard.astro`
- `src/components/shared/ComparisonTable.astro`
- `src/components/shared/DocumentList.astro`
- `src/components/shared/ImagePanel.astro`
- `src/components/shared/FeatureCardGrid.astro`
- `src/components/shared/StatsGrid.astro`
- `src/components/shared/SourceLinks.astro`
- `src/components/shared/ContactPanel.astro`
- `src/components/shared/PageHeaderBlock.astro`
- `src/components/shared/HomeHeroBlock.astro`
- `src/components/shared/ServiceListBlock.astro`
- `src/components/shared/HomeProcessBlock.astro`
- `src/components/shared/ArticleListBlock.astro`
- `src/components/shared/HomeCtaBlock.astro`
- `src/components/shared/NotFoundBlock.astro`
- `src/components/shared/SiteHeader.astro`
- `src/components/shared/SiteFooter.astro`
- `src/components/shared/ArticlePreviousArticles.astro`
- `src/components/blocks/BlockRenderer.astro`
- `src/components/blocks.ts`

Katalog noindex `/komponen/` merender seluruh 26 blok registry. Header dan footer dipakai oleh layout utama; komponen artikel sebelumnya dipakai pada detail artikel. Artikel, panduan, dan layanan menggunakan `BlockRenderer` setelah sumber kontennya diubah menjadi blok semantik.

## Pengujian SLF yang dipertahankan

1. `check-frontmatter-integrity.mjs`
2. `check-content-dates.mjs`
3. `check-internal-links.mjs`
4. `check-seo-output.mjs`
5. `check-image-alt.mjs`
6. `check-article-content-output.mjs`
7. `check-published-content.mjs`

Ketujuh tes tersebut dijalankan berurutan oleh `npm run build`, bersama seluruh quality gate TKDN sebelumnya dan tes Playwright. `check-component-coverage.mjs` juga memastikan semua blok registry ditampilkan di katalog dan tidak ada renderer Markdown Astro langsung di halaman detail.
