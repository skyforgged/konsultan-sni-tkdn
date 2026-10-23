# Catatan Implementasi FooterBrand Dinamis

## Konteks
Footer kolom brand (bagian "Konsultan") dapat menampilkan teks yang berbeda tergantung halaman yang sedang ditampilkan.

## Persyaratan

### 1. Halaman Layanan (`/layanan/<slug>`)
- **Teks footer:** `<nama situs> menyediakan layanan <judul layanan>`
- **Contoh:** "Konsultan SNI–TKDN menyediakan layanan Konsultan SNI"
- **Implementasi:** `src/pages/layanan/[slug].astro` mengirim `brandCopy` ke `BaseLayout`

### 2. Halaman Artikel (`/artikel/<slug>`)
- **Teks footer:** Jika artikel memiliki `relatedServices`, gunakan layanan pertama yang direferensikan
- **Format:** `<nama situs> menyediakan layanan <judul layanan terkait>`
- **Contoh:** Artikel "Perbedaan Konsultasi, Pengujian, dan Sertifikasi Produk" merujuk ke service ID 9 (Konsultan SNI) → footer menampilkan "Konsultan SNI–TKDN menyediakan layanan Konsultan SNI"
- **Implementasi:** `src/pages/artikel/[slug].astro` resolve service dari `relatedServices[0]` dan mengirim `brandCopy`

### 3. Halaman Lain
- **Teks footer:** Gunakan paragraf default dari `siteConfig.footerCopyParagraphs`
- **Implementasi:** `SiteFooter.astro` fallback ke konfigurasi jika `brandCopy` tidak diberikan

## Kontrak Data

### Relasi `relatedServices`
- **Wajib menggunakan ID integer**, bukan slug string
- **Alasan:** ID lebih stabil; slug dapat berubah dan rentan terhadap broken links
- **Contoh benar:** `relatedServices: [9]`
- **Contoh salah:** `relatedServices: ["konsultan-sni"]`

### Schema Support
`src/content.config.ts` sudah mendukung union type:
```typescript
relatedServices: z.array(z.union([z.string().min(1), z.number().int().positive()])).default([])
```

Namun untuk konten baru, **selalu gunakan ID integer**.

## Implementasi Teknis

### File yang Diubah
1. **`src/layouts/BaseLayout.astro`**
   - Tambah prop `brandCopy?: string | string[]`
   - Pass ke `<SiteFooter brandCopy={brandCopy}/>`

2. **`src/components/shared/SiteFooter.astro`**
   - Terima prop `brandCopy`
   - Render dinamis: jika `brandCopy` ada → gunakan; jika tidak → fallback ke `siteConfig.footerCopyParagraphs`
   - Tambah kelas semantik `footer-brand` pada kolom brand

3. **`src/pages/layanan/[slug].astro`**
   - Set `brandCopy={`${siteConfig.name} menyediakan layanan ${entry.data.title}`}`

4. **`src/pages/artikel/[slug].astro`**
   - Resolve service dari `relatedServices[0]` (jika ada)
   - Set `brandCopy` berdasarkan judul service yang ditemukan

5. **`src/content/articles/article-perbedaan-konsultasi-pengujian-sertifikasi.md`**
   - Ubah `relatedServices: ["konsultan-sni"]` → `relatedServices: [9]`

## Catatan Tata Bahasa
Kalimat "Konsultan SNI–TKDN menyediakan Konsultan SNI" terasa janggal karena:
- Subjek: "Konsultan SNI–TKDN" (perusahaan)
- Predikat: "menyediakan" (kata kerja transitif)
- Objek: "Konsultan SNI" (nama layanan, bukan benda yang dapat disediakan)

**Solusi:** Tambahkan kata "layanan" atau "jasa" → "menyediakan **layanan** Konsultan SNI"

## Status
✅ Implementasi selesai dan build lulus (commit `563eb48`)
</newString>

</newString>
