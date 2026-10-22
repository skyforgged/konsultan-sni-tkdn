# Fondasi Engine yang Dipertahankan untuk Konsultan SNI–TKDN

**Status:** keputusan arsitektur awal  
**Acuan:** repository [konsultan-slf](https://github.com/skyforgged/konsultan-slf), ditinjau 22 Oktober 2026  
**Tujuan:** memisahkan fondasi teknis yang perlu dipertahankan dari theme/komponen visual yang boleh berubah, lalu menjadikannya pedoman pengembangan `konsultan-sni-tkdn`.

## 1. Prinsip utama: theme boleh berubah, engine harus stabil

Analogi yang digunakan dalam dokumen ini:

- **Theme** adalah tampilan dan cara penyajian: layout, komponen visual, susunan blok, styling, ilustrasi, warna, tipografi, dan pola halaman. Bagian ini boleh diganti atau didesain ulang selama kontrak datanya tetap dipenuhi.
- **Engine** adalah fondasi yang membuat situs konsisten dan dapat diandalkan: model konten, schema/validasi, pemisahan data dari presentasi, routing dan URL, metadata SEO, pemeriksaan hasil build, pengelolaan aset, serta alur perubahan dan review.
- **Data** adalah konten yang dilihat pengguna atau dibaca mesin: judul, isi, label, menu, metadata, alt gambar, FAQ, structured data, identitas situs, dan informasi layanan.

**Keputusan:** saat mengembangkan Konsultan SNI–TKDN, pertahankan prinsip dan mekanisme engine dari Konsultan SLF yang terbukti bermanfaat. Jangan menyalin theme secara membabi buta; adaptasi visual dan model kontennya terhadap kebutuhan SNI, TKDN, dan BMP.

## 2. Fondasi yang wajib dipertahankan

### 2.0 Frontmatter sebagai kontrak untuk semua halaman

**Keputusan wajib:** setiap URL publik yang dikelola situs harus mempunyai satu sumber konten terstruktur dengan frontmatter. Ini mencakup beranda, halaman informasi, halaman indeks/listing, layanan, artikel, panduan, dan FAQ. Halaman teknis 404 juga harus memiliki metadata yang terdefinisi, walaupun tidak perlu masuk sitemap.

Jangan menganggap frontmatter hanya milik artikel Markdown. Metadata SEO, identitas, navigasi, aset sosial, status publikasi, dan hubungan antarkonten harus berasal dari data konten/config yang tervalidasi. Astro template bertugas merender data itu, bukan menjadi tempat kedua untuk menulis ulang judul, deskripsi, isi, CTA, dan tautan relasi.

#### Kontrak metadata minimum

| Field | Tujuan |
|---|---|
| `id` / `ulid` (opsional bila ID internal dibuat otomatis) | Identitas internal stabil; jangan dijadikan URL |
| `type` | Jenis konten yang eksplisit: `page`, `service`, `article`, `guide`, atau `faq` |
| `slug` | Slug URL yang eksplisit dan stabil |
| `title` | Judul halaman dan title SEO |
| `pubDate` | Tanggal publikasi pertama |
| `updatedDate` | Tanggal perubahan substantif terakhir |
| `description` | Ringkasan unik untuk SEO dan preview |
| `socialImage` | Gambar sosial/OG khusus halaman, dengan fallback yang terkonfigurasi |
| `draft` | Status draft agar konten yang belum siap tidak diterbitkan |
| `navLabel` (opsional) | Label navigasi bila halaman memang ditampilkan di menu |
| `canonical` (opsional) | Canonical override; default diturunkan dari URL produksi dan slug |
| `image` dan `imageAlt` (opsional) | Gambar utama serta teks alternatif yang bermakna |
| `relatedServices`, `relatedPages`, `relatedArticles`, `relatedGuides` | Relasi eksplisit ke slug konten lain yang benar-benar ada |

Nama field perlu konsisten. Bila implementasi memilih nama Astro yang sudah dipakai seperti `publishDate`, dokumentasikan pemetaan satu kali dan jangan mencampur `pubDate` serta `publishDate` tanpa alasan. Nilai tanggal harus valid; tanggal publikasi tidak boleh otomatis diganti setiap kali file diedit.

#### Relasi konten adalah bagian dari engine

Artikel dan panduan harus dapat menghubungkan pembaca ke layanan yang relevan, panduan pendukung, artikel terkait, halaman kontak, dan halaman informasi. Jangan mengandalkan sidebar dengan tautan hard-coded yang sama di semua artikel.

- Gunakan slug, bukan URL bebas, untuk relasi internal agar typo dan tautan putus dapat dideteksi saat build.
- Validasi setiap relasi terhadap koleksi yang benar; konten target harus ada dan tidak berstatus draft.
- Render tautan terkait sebagai bagian konten yang terlihat dan berguna, dengan anchor text yang menjelaskan tujuan.
- Tampilkan layanan terkait di artikel/panduan dan konten edukasi terkait di halaman layanan.
- Hindari tautan yang tidak relevan hanya demi SEO; relasi harus membantu alur keputusan pembaca.
- Tautan CTA ke kontak dapat menjadi fallback umum, tetapi tidak menggantikan relasi kontekstual.
- Relasi tidak boleh menciptakan siklus navigasi yang membingungkan atau menautkan halaman ke dirinya sendiri.

#### Semua halaman publik memiliki sumber frontmatter

- `pages`: beranda, tentang kami, kontak, FAQ, indeks layanan, indeks artikel, indeks panduan, serta halaman informasi lain.
- `services`: halaman layanan detail.
- `articles`: artikel edukasi.
- `guides`: panduan berorientasi langkah.
- `faq`: bila FAQ dipisahkan menjadi halaman atau entri koleksi.
- `404`: metadata terdefinisi, tidak masuk sitemap dan memakai noindex.

Template boleh berbeda sesuai tipe halaman, tetapi metadata, isi utama, navigasi, gambar, CTA, dan relasi harus berasal dari frontmatter atau konfigurasi yang tervalidasi. Hindari halaman penting yang isi dan metadatanya tersembunyi sepenuhnya di file `.astro`.



### P0 — Wajib menjadi prinsip desain sejak awal

#### 2.1 Pemisahan theme, data, dan konfigurasi

Referensi pola Konsultan SLF:
- `src/layouts/` untuk layout/theme.
- `src/components/shared/` dan `src/components/blocks/` untuk komponen presentasi.
- `src/components/blocks.ts` untuk pemetaan tipe blok ke komponen.
- `src/content/` untuk data halaman, artikel, dan layanan.
- `src/content.config.ts` untuk schema bentuk data.
- `src/config/site.ts` untuk identitas situs.
- `src/config/ui.ts` untuk label UI bersama.

Yang dipertahankan:
- Komponen menerima data melalui props; jangan menyisipkan isi halaman, copywriting, atau label spesifik di dalam komponen.
- Teks yang tampil di halaman berasal dari data konten atau konfigurasi UI yang sesuai.
- Konten halaman statis pun mempunyai sumber data yang eksplisit.
- Mengganti teks atau mengoreksi fakta seharusnya tidak memerlukan perubahan komponen visual.
- Pemetaan blok konten dibuat eksplisit dan divalidasi, bukan bergantung pada nama komponen yang ditebak saat runtime.

Adaptasi untuk SNI–TKDN:
- Model konten perlu mengakomodasi halaman layanan SNI, TKDN, BMP, layanan terpadu, artikel, panduan langkah demi langkah, FAQ, dan komponen HowTo jika memang dibutuhkan.
- Jangan memaksakan semua tipe konten SLF ke proyek ini. Pertahankan polanya, rancang schema sesuai domain SNI–TKDN.

#### 2.2 Schema konten sebagai kontrak

Pertahankan validasi terstruktur untuk frontmatter/data:
- Field wajib dan opsional dinyatakan eksplisit.
- Tipe blok dan properti tiap blok divalidasi.
- Relasi seperti artikel terkait hanya boleh menunjuk konten yang benar-benar tersedia dan layak ditautkan.
- Slug/ID, status draft/publikasi, tanggal, gambar, dan metadata memiliki aturan yang konsisten.
- Kesalahan data ditemukan saat build, bukan baru terlihat sebagai halaman kosong atau markup rusak di browser.

Schema adalah kontrak antara data dan theme. Perubahan kontrak harus disengaja dan disertai pembaruan komponen serta tes yang relevan.

#### 2.3 Build sebagai gerbang kualitas

Di Konsultan SLF, perintah build menggabungkan pemeriksaan konten, typecheck, build Astro, tautan internal, SEO output, alt gambar, hasil render artikel, dan konten publikasi. Prinsip ini sangat layak dipertahankan.

Untuk Konsultan SNI–TKDN, siapkan gerbang kualitas bertahap yang setidaknya memeriksa:
1. Integritas frontmatter dan schema.
2. Format serta konsistensi tanggal/ID jika field tersebut digunakan.
3. Typecheck dan build produksi.
4. Tautan internal yang menuju halaman yang benar-benar ada.
5. SEO output: title, description, canonical, Open Graph, robots, sitemap, dan JSON-LD yang valid.
6. Alt gambar pada seluruh output HTML.
7. Artikel/panduan terbit benar-benar merender isi dan heading yang didefinisikan.
8. Tidak ada konten placeholder, klaim palsu, atau konten terbit kosong.
9. Setiap perubahan penting lulus pemeriksaan sebelum dianggap selesai.

Jangan mengklaim build atau tes lulus sebelum benar-benar dijalankan. Sesuaikan daftar pemeriksaan dengan teknologi dan script yang benar-benar ada di repo SNI–TKDN.

#### 2.4 SEO teknis terpusat dan dapat diuji

Pertahankan satu sistem terpusat untuk metadata, canonical, Open Graph, robots, sitemap, serta structured data. Data per halaman harus spesifik; jangan mengandalkan satu metadata generik untuk semua halaman.

Prinsip domain:
- Domain resmi SEO harus eksplisit melalui konfigurasi, misalnya `SITE_URL`.
- Canonical, sitemap, dan URL absolut untuk social image menggunakan domain resmi, bukan hostname preview yang kebetulan sedang dibuka.
- Konfigurasi lokal/preview tidak boleh tanpa sengaja menjadi canonical produksi.
- Uji HTML hasil build; konfigurasi saja tidak membuktikan metadata output sudah benar.

Structured data harus sesuai dengan konten yang benar-benar tampil. FAQ/HowTo hanya digunakan ketika isi halaman memenuhi maksud dan persyaratan tipenya; jangan menambah schema demi mengejar rich result yang tidak dijamin.

#### 2.5 Jaga URL dan identitas konten

Pertahankan slug, URL publik, ID konten, relasi artikel-layanan, dan aset spesifik halaman kecuali ada alasan teknis yang jelas.

Jika URL perlu berubah:
- catat alasan dan dampaknya;
- periksa semua internal link dan canonical;
- siapkan redirect yang tepat jika diperlukan;
- validasi sitemap dan output build sesudah perubahan.

Jangan mengubah URL atau ID sebagai efek samping redesign theme.

### P1 — Sangat dianjurkan

#### 2.6 Komponen blok yang dapat dipakai ulang

Pertahankan arsitektur blok dengan tipe yang jelas dan registry/pemetaan eksplisit. Blok adalah kontrak data-presentasi, bukan tempat menulis isi editorial.

Manfaat:
- susunan halaman dapat berubah tanpa menulis ulang semua konten;
- satu blok dapat diperbaiki dan digunakan ulang;
- konten dapat memiliki komposisi yang berbeda tanpa menggandakan markup;
- schema bisa memastikan properti wajib tersedia.

Namun, jangan membuat abstraksi terlalu umum untuk kebutuhan yang belum ada. Tambahkan blok berdasarkan kebutuhan nyata, misalnya daftar dokumen, langkah proses, perbandingan, FAQ, CTA konsultasi, atau HowTo.

#### 2.7 Kebijakan konten dan workflow perubahan

Pertahankan aturan editorial yang membatasi ruang lingkup, meminta verifikasi sumber primer untuk klaim penting, melarang angka/testimoni/keberhasilan yang dikarang, dan melindungi URL/relasi konten.

Untuk domain SNI–TKDN, kebijakan harus spesifik:
- verifikasi regulasi dan prosedur pada sumber resmi yang relevan;
- bedakan ketentuan resmi, interpretasi, dan saran konsultan;
- jangan menjanjikan sertifikat, nilai TKDN, BMP, durasi, atau hasil yang tidak dapat dijamin;
- catat sumber bagi klaim hukum/teknis penting;
- jangan memperbarui tanggal publikasi hanya untuk memberi kesan konten baru;
- jika tidak ada perbaikan substantif, jangan mengubah konten hanya demi menghasilkan commit.

#### 2.8 Otomasi AI dengan review dan batas perubahan

Konsultan SLF memiliki workflow update konten manual-trigger yang dibatasi, menggunakan prompt editor/reviewer, menjalankan build, dan mengajukan PR hanya setelah review lolos. Yang dipertahankan adalah **kontrolnya**, bukan keharusan menyalin workflow atau nama model persis.

Jika nanti diterapkan di Konsultan SNI–TKDN:
- batasi satu run pada satu target utama;
- gunakan sumber resmi untuk verifikasi;
- lakukan review independen;
- jalankan semua pemeriksaan;
- gunakan pull request atau mekanisme review sebelum merge;
- simpan secret di pengaturan GitHub, bukan dalam repository;
- jangan izinkan AI memublikasikan klaim hukum/teknis tanpa pemeriksaan yang sesuai.

#### 2.9 Konfigurasi domain dan lingkungan

Pisahkan konfigurasi domain produksi dari domain lokal dan preview. Gunakan environment variable atau konfigurasi yang eksplisit; jangan menyebar URL situs secara hard-coded di banyak komponen.

Konfigurasi ini perlu diverifikasi pada canonical, sitemap, dan Open Graph output setelah build.

#### 2.10 Aset dan aksesibilitas

Pertahankan pemeriksaan alt gambar dan gunakan aset yang sesuai dengan halaman. Gambar dekoratif boleh menggunakan `alt=""`; atribut alt yang hilang tidak boleh lolos.

Aset spesifik halaman sebaiknya tetap spesifik. Jika theme diganti, audit ulang ukuran, format, path, alt, metadata sosial, dan kecocokan gambar dengan isi.

## 3. Bagian yang boleh berubah bersama theme

Hal berikut bukan engine yang harus disalin persis:
- warna, tipografi, radius, shadow, spacing, dan gaya tombol;
- susunan hero, kartu, sidebar, CTA, header, dan footer;
- desain visual blok dan ilustrasi;
- urutan section di halaman;
- komposisi halaman selama tetap memakai kontrak data yang sah;
- detail copywriting dan label yang memang menjadi data konten.

Perubahan visual tetap harus menjaga semantik HTML, aksesibilitas, performa, internal link, dan metadata.

## 4. Jangan menyalin tanpa evaluasi

Tidak semua implementasi Konsultan SLF otomatis cocok untuk Konsultan SNI–TKDN.

- **Jangan menyalin konten domain SLF/PBG**; gunakan hanya pola arsitektur yang relevan.
- **Jangan menyalin schema konten mentah-mentah**; kebutuhan layanan dan panduan SNI–TKDN berbeda.
- **Jangan menyalin dependency atau workflow hanya karena tersedia**; pastikan kompatibel dengan repo target, versi runtime, izin, dan kebutuhan aktual.
- **Jangan menyalin theme sebagai syarat**; proyek ini boleh memiliki identitas visual sendiri.
- **Jangan mengasumsikan semua script audit cocok langsung**; audit dan adaptasi path, koleksi, serta aturan konten dahulu.
- **Periksa lisensi dan provenance** sebelum menyalin kode/aset lintas repository. Repository referensi menyatakan GPL-2.0; pertahankan atribusi dan evaluasi implikasi lisensi untuk kode yang benar-benar disalin. Mengikuti prinsip arsitektur tanpa menyalin implementasi bukan hal yang sama dengan menyalin kode.

## 5. Prioritas penerapan untuk Konsultan SNI–TKDN

Karena repository target saat peninjauan masih sangat minimal dan baru memiliki `README.md` serta `docs/RISET.md`, dokumen ini menetapkan arah desain; ini bukan klaim bahwa engine tersebut sudah diterapkan.

Urutan yang direkomendasikan:
1. Tetapkan stack, struktur direktori, dan kontrak data yang sesuai untuk SNI–TKDN.
2. Bangun pemisahan data/theme sejak halaman pertama.
3. Definisikan schema untuk halaman, layanan, artikel, panduan, dan blok yang diperlukan.
4. Buat sistem metadata/SEO dan konfigurasi domain yang konsisten.
5. Tambahkan validasi build untuk frontmatter, tautan, SEO output, gambar, dan konten yang dirender.
6. Lindungi slug, ID, relasi konten, dan aset spesifik halaman.
7. Dokumentasikan kebijakan editorial serta prosedur perubahan.
8. Setelah fondasi stabil, iterasikan theme tanpa merusak kontrak engine.
9. Tambahkan workflow AI/review otomatis setelah pemeriksaan dasar dapat diandalkan.

## 6. Kriteria penerimaan

Fondasi dianggap dijalankan dengan benar bila:
- teks halaman dapat diubah tanpa mengedit komponen visual;
- schema menolak data yang tidak valid;
- perubahan theme tidak memutus konten, URL, relasi, atau SEO;
- build mendeteksi tautan rusak, metadata penting yang hilang, alt yang hilang, dan konten yang tidak ter-render;
- canonical/sitemap menggunakan domain yang ditetapkan untuk lingkungan build;
- klaim dan tanggal konten mengikuti kebijakan editorial;
- hasil tes dilaporkan berdasarkan pemeriksaan yang benar-benar dijalankan.

**Ringkasan keputusan:** pertahankan *pemisahan theme–data, schema sebagai kontrak, build sebagai gerbang kualitas, SEO terpusat yang diuji pada output, stabilitas URL/ID, validasi aset, serta workflow editorial/review yang terkendali*. Theme visual boleh berubah; kontrak engine hanya berubah secara disengaja, terdokumentasi, dan diuji.
