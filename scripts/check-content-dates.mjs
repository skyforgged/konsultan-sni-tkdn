// Memvalidasi pubDate dan updatedDate di seluruh berkas konten (termasuk draft).
// Aturan:
//   1. Format wajib UTC tanpa milisekon: YYYY-MM-DDTHH:mm:ssZ.
//   2. updatedDate tidak boleh lebih awal dari pubDate.
//   3. updatedDate tidak boleh sama dengan pubDate (agar urutan menurun deterministik).
//   4. pubDate dan updatedDate harus unik secara global lintas koleksi — dua konten
//      tidak mungkin disubmit pada detik yang sama.
// Catatan: draft ikut diperiksa supaya masalah tertangkap sebelum diterbitkan.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const contentRoot = path.resolve('src/content');
const collections = ['articles', 'pages', 'services', 'guides'];
const utcTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const errors = [];

async function markdownFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(entryPath);
  }
  return files;
}

function scalar(frontmatter, key) {
  const match = frontmatter.match(new RegExp('^' + key + ':\\s*(.*?)\\s*$', 'm'));
  if (!match) return undefined;
  return match[1].trim().replace(/^["']|["']$/g, '');
}

const relativePath = (file) => path.relative(process.cwd(), file).split(path.sep).join('/');
const records = [];
let checked = 0;

for (const collection of collections) {
  for (const file of await markdownFiles(path.join(contentRoot, collection))) {
    checked++;
    const source = await readFile(file, 'utf8');
    const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    const label = relativePath(file);

    if (!match) {
      errors.push(label + ': frontmatter YAML tidak ditemukan');
      continue;
    }

    const frontmatter = match[1];
    const pubDate = scalar(frontmatter, 'pubDate');
    const updatedDate = scalar(frontmatter, 'updatedDate');

    for (const [field, value] of [['pubDate', pubDate], ['updatedDate', updatedDate]]) {
      if (value === undefined) {
        errors.push(label + ': ' + field + ' tidak ditemukan');
      } else if (!utcTimestampPattern.test(value)) {
        errors.push(label + ': ' + field + ' harus UTC tanpa milisekon (YYYY-MM-DDTHH:mm:ssZ), ditemukan "' + value + '"');
      }
    }

    if (pubDate && updatedDate) {
      if (updatedDate < pubDate) {
        errors.push(label + ': updatedDate (' + updatedDate + ') tidak boleh lebih awal dari pubDate (' + pubDate + ')');
      } else if (updatedDate === pubDate) {
        errors.push(label + ': updatedDate tidak boleh sama dengan pubDate (' + pubDate + '); pakai waktu yang berbeda');
      }
    }

    records.push({ label, pubDate, updatedDate });
  }
}

const seenTimestamps = new Map();
for (const record of records) {
  for (const field of ['pubDate', 'updatedDate']) {
    const value = record[field];
    if (!value) continue;
    const previous = seenTimestamps.get(value);
    if (previous) {
      errors.push(value + ': ' + field + ' ' + record.label + ' bentrok dengan ' + previous.field + ' ' + previous.label);
    } else {
      seenTimestamps.set(value, { label: record.label, field });
    }
  }
}

if (errors.length) {
  console.error('Content date check failed: ' + errors.length + ' issue(s) across ' + checked + ' content files.\n');
  console.error(errors.map((error) => '- ' + error).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Content date check passed: ' + checked + ' content files use unique UTC timestamps without milliseconds.');
}
