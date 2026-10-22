// Frontmatter integrity gate ported from konsultan-slf.
// TKDN intentionally permits Markdown source in articles/guides/services only because those routes
// transform every paragraph/list/quote/table into reusable Astro components before rendering.
// Static pages must remain frontmatter-driven; malformed YAML-like metadata after the closing
// delimiter is always rejected so content cannot silently disappear.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const contentRoot = path.resolve('src/content');
const collections = ['articles', 'pages', 'services', 'guides'];
const metadataKeyPattern = /^(?:id|slug|ulid|title|description|pubDate|updatedDate|draft|image|socialImage|contentType|serviceArea|relatedArticles|relatedServices|relatedPages|relatedGuides|relatedType|relatedId|blocks):\s/m;
const errors = [];
let checked = 0;

for (const collection of collections) {
  for (const file of await markdownFiles(path.join(contentRoot, collection))) {
    checked++;
    const source = await readFile(file, 'utf8');
    const lines = source.split(/\r?\n/);
    const label = relative(process.cwd(), file);
    if (lines[0]?.trim() !== '---') {
      errors.push(label + ': baris pertama harus "---" (frontmatter wajib berada di awal berkas)');
      continue;
    }
    const closing = lines.findIndex((line, index) => index > 0 && /^---\s*$/.test(line));
    if (closing < 0) {
      errors.push(label + ': frontmatter tidak ditutup; tambahkan baris "---" penutup');
      continue;
    }
    const frontmatter = lines.slice(1, closing).join('\n');
    const body = lines.slice(closing + 1).join('\n').trim();
    if (!frontmatter.trim()) errors.push(label + ': frontmatter kosong');
    if (metadataKeyPattern.test(body)) {
      errors.push(label + ': ditemukan metadata mirip frontmatter setelah delimiter penutup; pindahkan metadata ke header YAML');
      continue;
    }
    if (collection === 'pages' && body) {
      errors.push(label + ': halaman statis harus menggunakan frontmatter dan komponen Astro; body Markdown tidak digunakan pada koleksi pages');
      continue;
    }
    if (body && !['articles', 'guides', 'services'].includes(collection)) {
      errors.push(label + ': body hanya diizinkan pada koleksi yang dirender melalui BlockRenderer');
    }
  }
}
if (errors.length) {
  console.error('Frontmatter integrity check failed: ' + errors.length + ' issue(s) across ' + checked + ' Markdown files.\n');
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Frontmatter integrity check passed: ' + checked + ' files have valid frontmatter; article, guide, and service bodies are component-rendered.');
}
async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(fullPath);
  }
  return files;
}
function relative(from, to) { return path.relative(from, to).split(path.sep).join('/'); }
