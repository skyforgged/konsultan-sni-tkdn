import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('src/content');
const collectionNames = ['pages', 'services', 'articles', 'guides'];
const relationshipFields = {
  relatedPages: 'pages',
  relatedServices: 'services',
  relatedArticles: 'articles',
  relatedGuides: 'guides',
};
const errors = [];
const records = Object.fromEntries(collectionNames.map(name => [name, []]));
const timestamps = new Map();
const globalIds = new Map();

for (const collection of collectionNames) {
  for (const file of await markdownFiles(path.join(root, collection))) {
    const label = relative(file);
    const source = await readFile(file, 'utf8');
    const match = source.match(/^---\\s*\\r?\\n([\\s\\S]*?)\\r?\\n---(?:\\r?\\n|$)/);
    if (!match) {
      errors.push(`${label}: frontmatter YAML tidak ditemukan atau tidak ditutup`);
      continue;
    }
    const frontmatter = match[1];
    const body = source.slice(match[0].length).trim();
    if (!body) errors.push(`${label}: body konten kosong`);

    const id = scalar(frontmatter, 'id');
    const slug = scalar(frontmatter, 'slug') || path.basename(file, '.md');
    const title = scalar(frontmatter, 'title');
    const draft = scalar(frontmatter, 'draft') === 'true';
    const status = scalar(frontmatter, 'status') || 'active';
    const record = { file: label, id, slug, title, draft, status, relationships: {} };
    records[collection].push(record);

    if (!id) errors.push(`${label}: id frontmatter wajib`);
    else if (globalIds.has(id)) errors.push(`${label}: id "${id}" duplikat dengan ${globalIds.get(id)}`);
    else globalIds.set(id, label);
    if (!slug || /[\\s?#]/.test(slug) || slug.startsWith('/') || slug.endsWith('/')) errors.push(`${label}: slug tidak valid "${slug}"`);
    if (!title || title.length < 3) errors.push(`${label}: title tidak ada atau terlalu pendek`);

    for (const field of ['pubDate', 'updatedDate']) {
      const value = scalar(frontmatter, field);
      if (!value) {
        errors.push(`${label}: ${field} wajib diisi`);
        continue;
      }
      if (!/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$/.test(value) || Number.isNaN(Date.parse(value))) {
        errors.push(`${label}: ${field} harus timestamp UTC valid YYYY-MM-DDTHH:mm:ssZ, ditemukan "${value}"`);
      } else {
        const previous = timestamps.get(value);
        if (previous) errors.push(`${label}: ${field} bentrok pada ${value} dengan ${previous}`);
        else timestamps.set(value, `${label} (${field})`);
      }
    }
    const pubDate = scalar(frontmatter, 'pubDate');
    const updatedDate = scalar(frontmatter, 'updatedDate');
    if (pubDate && updatedDate && updatedDate < pubDate) errors.push(`${label}: updatedDate lebih awal dari pubDate`);
    if (pubDate && updatedDate && updatedDate === pubDate) errors.push(`${label}: updatedDate tidak boleh sama dengan pubDate`);

    const image = scalar(frontmatter, 'socialImage');
    if (!image) errors.push(`${label}: socialImage wajib diisi`);
    if (draft) continue;
    const placeholderPatterns = [
      [/lorem\\s+ipsum/i, 'Lorem ipsum'],
      [/\\bTODO\\b/i, 'TODO'],
      [/\\bFIXME\\b/i, 'FIXME'],
      [/\\bexample\\.com\\b/i, 'example.com placeholder'],
      [/\\bisi di sini\\b/i, 'placeholder isi di sini'],
    ];
    for (const [pattern, name] of placeholderPatterns) {
      if (pattern.test(source)) errors.push(`${label}: placeholder terdeteksi (${name})`);
    }
    for (const field of Object.keys(relationshipFields)) {
      record.relationships[field] = arrayField(frontmatter, field);
    }
  }
}

for (const collection of collectionNames) {
  const slugs = new Map();
  for (const record of records[collection]) {
    if (slugs.has(record.slug)) errors.push(`${record.file}: slug "${record.slug}" duplikat dengan ${slugs.get(record.slug)} di koleksi ${collection}`);
    else slugs.set(record.slug, record.file);
    if (record.draft) continue;
    for (const [field, targetCollection] of Object.entries(relationshipFields)) {
      for (const target of record.relationships[field] || []) {
        const found = records[targetCollection].find(item => item.slug === target || item.id === target);
        if (!found) errors.push(`${record.file}: ${field} mengarah ke "${target}" yang tidak ditemukan di koleksi ${targetCollection}`);
        else if (found.draft || found.status !== 'active') errors.push(`${record.file}: ${field} mengarah ke konten nonaktif/draft "${target}"`);
      }
    }
  }
}

if (errors.length) {
  console.error(`Content integrity check gagal: ${errors.length} masalah.`);
  for (const error of errors) console.error(' - ' + error);
  process.exitCode = 1;
} else {
  const count = collectionNames.reduce((sum, name) => sum + records[name].length, 0);
  console.log(`Content integrity check lulus: ${count} file; ID dan slug unik, timestamp valid, relasi ter-resolve.`);
}

function scalar(frontmatter, key) {
  const line = frontmatter.split(/\\r?\\n/).find(item => item.startsWith(key + ':'));
  if (!line) return undefined;
  return unquote(line.slice(key.length + 1).trim());
}
function arrayField(frontmatter, key) {
  const lines = frontmatter.split(/\\r?\\n/);
  const index = lines.findIndex(line => line.startsWith(key + ':'));
  if (index < 0) return [];
  const value = lines[index].slice(key.length + 1).trim();
  if (value.startsWith('[')) return [...value.matchAll(/["']([^"']+)["']/g)].map(item => item[1]);
  const result = [];
  for (const line of lines.slice(index + 1)) {
    if (/^\\S/.test(line)) break;
    const item = line.match(/^\\s+-\\s*["']?(.+?)["']?\\s*$/);
    if (item) result.push(unquote(item[1].trim()));
  }
  return result;
}
function unquote(value) {
  return value.replace(/^["']|["']$/g, '');
}
async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}
function relative(file) {
  return path.relative(process.cwd(), file).split(path.sep).join('/');
}
