# Kebijakan Konten Konsultan SNI–TKDN

## Prinsip editorial
- Bedakan konsultasi/pendampingan dari pengujian, verifikasi, penetapan hasil, dan penerbitan sertifikat.
- Verifikasi regulasi dan prosedur melalui sumber primer sebelum memublikasikan klaim teknis atau hukum.
- Catat sumber dan tanggal verifikasi untuk klaim yang dapat berubah.
- Jangan menjanjikan sertifikat, nilai TKDN/BMP, kelulusan, biaya final, atau durasi yang tidak dapat dikendalikan.
- Jangan mengarang identitas perusahaan, pengalaman, jumlah klien, testimoni, mitra, akreditasi, angka keberhasilan, atau studi kasus.
- Tandai asumsi dan keterbatasan data. Simulasi indikatif bukan keputusan resmi.
- Jangan memperbarui tanggal publikasi hanya untuk memberi kesan baru.
- Jangan membuat artikel dan panduan terpisah yang hanya mengulang maksud pencarian yang sama.
- Pastikan structured data sama dengan informasi yang terlihat oleh pengguna.

## Frontmatter wajib dan relasi internal

Semua halaman publik harus mempunyai sumber frontmatter terstruktur, bukan hanya artikel. Gunakan koleksi/tipe yang jelas untuk halaman statis (termasuk beranda dan halaman indeks), layanan, artikel, panduan, dan FAQ.

Metadata minimum:
- `type`, `slug`, `title`, `description`, `pubDate`, `updatedDate`, `draft`;
- `socialImage` dan, jika relevan, `image` + `imageAlt`;
- `navLabel` hanya jika halaman masuk navigasi;
- `canonical` hanya sebagai override yang sudah diverifikasi;
- relasi eksplisit seperti `relatedServices`, `relatedPages`, `relatedArticles`, dan `relatedGuides`.

Nama slug pada relasi harus menunjuk ke entri yang ada dan terbit. Jangan menautkan draft, jangan mengarang URL, dan jangan menyimpan tautan internal sebagai string bebas jika dapat dinyatakan sebagai slug. Pemeriksaan build harus gagal jika relasi wajib menunjuk ke target yang tidak ada atau ke dirinya sendiri.

## Sebelum publikasi
1. Periksa ketepatan isi dan sumber.
2. Periksa judul, deskripsi, tanggal, slug, internal link, dan gambar/alt.
3. Pastikan klaim tidak menyiratkan kewenangan atau jaminan hasil.
4. Jalankan pemeriksaan dan build.
5. Catat hal yang masih memerlukan verifikasi manusia.
