# Konsultan SNI–TKDN

Situs konsultasi dan pendampingan persiapan SNI, TKDN, dan BMP.

## Teknologi
- Astro 5 dan Content Collections dengan schema terstruktur.
- Halaman statis untuk layanan, artikel, dan panduan.
- SEO terpusat pada layout dasar.
- Komponen HowTo menghasilkan HTML dan Schema.org JSON-LD dari data langkah yang sama.

## Menjalankan proyek
Memerlukan Node.js 20 atau lebih baru.

```sh
npm install
npm run dev
npm run build
npm run preview
```

Atur `SITE_URL` ke domain produksi sebelum build produksi agar canonical dan sitemap menggunakan domain yang benar. Tanpa variabel tersebut canonical tidak dirender dan sitemap tidak diaktifkan.

## Struktur penting
- `src/config/site.ts`: identitas, navigasi, kanal kontak.
- `src/content.config.ts`: kontrak/schema konten.
- `src/content/services/`: halaman layanan.
- `src/content/articles/`: artikel edukasi.
- `src/content/guides/`: panduan langkah demi langkah.
- `src/components/HowTo.astro`: panduan + structured data.
- `src/layouts/BaseLayout.astro`: layout dan metadata SEO.
- `docs/RISET.md`: strategi layanan dan konten.
- `docs/ARSITEKTUR-ENGINE.md`: prinsip arsitektur.

## Sebelum peluncuran
- Lengkapi kanal kontak dan identitas badan usaha yang benar.
- Verifikasi regulasi dan persyaratan dari sumber primer.
- Jangan menambahkan klaim, testimoni, logo klien, atau mitra tanpa bukti/izin.
- Jalankan `npm run build` dan audit HTML hasil build.
