# Konsultan SNI–TKDN

Situs konsultasi dan pendampingan persiapan SNI, TKDN, dan BMP.

## Teknologi
- Astro 5 dan Content Collections dengan schema frontmatter tervalidasi.
- Sumber frontmatter untuk halaman umum, layanan, artikel, dan panduan.
- Relasi konten berbasis slug yang dirender sebagai tautan kontekstual.
- SEO terpusat pada layout dasar; metadata sosial dan canonical dapat ditentukan per halaman.
- Komponen HowTo menghasilkan konten visual dan Schema.org JSON-LD dari data langkah yang sama.

## Menjalankan proyek
Memerlukan Node.js 20 atau lebih baru.

```sh
npm install
npm run dev
npm run build
npm run preview
```

Atur `SITE_URL` ke domain produksi sebelum build produksi agar canonical dan sitemap menggunakan domain yang benar.

## Struktur penting
- `src/config/site.ts`: identitas situs, navigasi, kanal kontak.
- `src/content.config.ts`: kontrak/schema frontmatter.
- `src/content/pages/`: beranda, halaman informasi, FAQ, dan metadata listing.
- `src/content/services/`: halaman layanan.
- `src/content/articles/`: artikel edukasi.
- `src/content/guides/`: panduan langkah demi langkah.
- `src/components/RelatedLinks.astro`: tautan terkait berdasarkan frontmatter.
- `src/components/HowTo.astro`: panduan dan structured data HowTo.
- `src/layouts/BaseLayout.astro`: layout dan metadata SEO.
- `docs/RISET.md`: riset layanan dan konten.
- `docs/ARSITEKTUR-ENGINE.md`: prinsip arsitektur dan kontrak frontmatter.
- `docs/CONTENT-POLICY.md`: kebijakan editorial.

## Standar frontmatter
Gunakan `type`, `slug`, `title`, `description`, `pubDate`, `updatedDate`, `draft`, dan `socialImage` pada semua konten. Gunakan `navLabel` hanya untuk halaman navigasi, `canonical` untuk override yang memang diperlukan, serta `image` dan `imageAlt` untuk gambar utama.

Relasi internal ditulis menggunakan slug:
- `relatedServices`
- `relatedPages`
- `relatedArticles`
- `relatedGuides`

Contoh:

```yaml
type: "article"
slug: "perbedaan-konsultasi-pengujian-sertifikasi"
title: "Perbedaan Konsultasi, Pengujian, dan Sertifikasi Produk"
description: "Pahami perbedaan peran konsultan, laboratorium pengujian, dan lembaga sertifikasi agar ruang lingkup dan tanggung jawab lebih jelas."
pubDate: 2026-10-22
updatedDate: 2026-10-22
draft: false
socialImage: "/images/og-default.svg"
relatedServices: ["konsultan-sni"]
relatedPages: ["faq", "kontak"]
relatedGuides: ["persiapan-sni"]
```

Relasi harus menunjuk ke konten yang tersedia dan terbit. Build akan memeriksa relasi yang dirender; jangan menambahkan slug tujuan sebelum kontennya dibuat.

## Sebelum peluncuran
- Lengkapi kanal kontak dan identitas badan usaha yang benar.
- Verifikasi regulasi dan persyaratan dari sumber primer.
- Jangan menambahkan klaim, testimoni, logo klien, atau mitra tanpa bukti/izin.
- Jalankan `npm run build` dan audit HTML hasil build.
