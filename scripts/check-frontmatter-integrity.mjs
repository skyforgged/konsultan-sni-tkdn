// Memastikan setiap berkas konten benar-benar menaruh seluruh datanya di dalam frontmatter.
// Konten di luar frontmatter tidak pernah dirender oleh layout, sehingga apa pun yang berada
// di body (termasuk frontmatter yang terpotong akibat delimiter "---" nyasar) adalah data hilang.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const contentRoot = path.resolve('src/content');
const collections = ['articles', 'pages', 'services', 'guides'];
const frontmatterKeyPattern = /^(?:id|slug|ulid|title|description|pubDate|updatedDate|draft|image|socialImage|contentType|serviceArea|relatedArticles|relatedType|relatedId|blocks):\s/m;
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

    const delimiters = [];
    lines.forEach((line, index) => {
      if (/^---\s*$/.test(line)) delimiters.push(index);
    });

    if (delimiters.length < 2) {
      errors.push(label + ': frontmatter tidak ditutup; tambahkan baris "---" penutup');
      continue;
    }

    if (delimiters.length > 2) {
      errors.push(
        label + ': ditemukan ' + delimiters.length + ' baris "---" pada baris ' +
        delimiters.map((index) => index + 1).join(', ') +
        '; frontmatter hanya boleh dibuka dan ditutup sekali. Hapus delimiter berlebih setelah baris ' +
        (delimiters[1] + 1) + ' dan pindahkan isinya ke dalam frontmatter',
      );
      continue;
    }

    const body = lines.slice(delimiters[1] + 1).join('\n').trim();
    if (!body) continue;

    const truncatedFrontmatter = frontmatterKeyPattern.test(body);
    errors.push(
      label + ': ada konten setelah frontmatter penutup (mulai baris ' + (delimiters[1] + 2) + ')' +
      (truncatedFrontmatter
        ? '. Isi tersebut tampak seperti frontmatter yang terpotong (mis. key "blocks:" atau "title:"), sehingga seluruh data blok tidak akan dirender'
        : '. Konten di luar frontmatter tidak pernah dirender; pindahkan data ke frontmatter atau hapus body'),
    );
  }
}

if (errors.length) {
  console.error('Frontmatter integrity check failed: ' + errors.length + ' issue(s) across ' + checked + ' Markdown files.\n');
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Frontmatter integrity check passed: ' + checked + ' Markdown files checked.');
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

function relative(from, to) {
  return path.relative(from, to).split(path.sep).join('/');
}
