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
const globalUlids = new Map();

for (const collection of collectionNames) {
  for (const file of await markdownFiles(path.join(root, collection))) {
    const label = relative(file);
    const source = await readFile(file, 'utf8');
    const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!match) {
      errors.push(`${label}: frontmatter YAML tidak ditemukan atau tidak ditutup`);
      continue;
    }
    const frontmatter = match[1];
    const body = source.slice(match[0].length).trim();
    const blockCount = [...frontmatter.matchAll(/^\s*-\s*(?:component:\s*["']?[\w-]+|\{\s*"component"\s*:\s*"[^"]+")/gm)].length;
    if (!body && blockCount === 0) errors.push(`${label}: body konten kosong dan tidak ada component blocks`);

    const idRaw = scalar(frontmatter, 'id');
    const id = idRaw === undefined ? undefined : idRaw;
    const ulid = scalar(frontmatter, 'ulid');
    const slug = scalar(frontmatter, 'slug');
    const title = scalar(frontmatter, 'title');
    const draft = scalar(frontmatter, 'draft') === 'true';
    const status = scalar(frontmatter, 'status') || 'active';
    const record = { file: label, id, ulid, slug, title, draft, status, relationships: {} };
    records[collection].push(record);

    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) {
      errors.push(`${label}: id wajib berupa integer positif tanpa tanda kutip, ditemukan "${idRaw ?? 'kosong'}"`);
    } else {
      const previous = globalIds.get(id);
      if (previous) errors.push(`${label}: id ${id} duplikat dengan ${previous}`);
      else globalIds.set(id, label);
    }
    if (typeof ulid !== 'string' || !/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(ulid)) {
      errors.push(`${label}: ulid wajib berupa ULID valid 26 karakter`);
    } else {
      const previous = globalUlids.get(ulid);
      if (previous) errors.push(`${label}: ulid ${ulid} duplikat dengan ${previous}`);
      else globalUlids.set(ulid, label);
    }
    if (typeof slug !== 'string' || !slug || /[\s?#]/.test(slug) || slug.startsWith('/') || slug.endsWith('/')) errors.push(`${label}: slug tidak valid "${slug ?? ''}"`);
    if (typeof title !== 'string' || title.length < 3) errors.push(`${label}: title tidak ada atau terlalu pendek`);

    for (const field of ['pubDate', 'updatedDate']) {
      const value = scalar(frontmatter, field);
      if (!value) {
        errors.push(`${label}: ${field} wajib diisi`);
        continue;
      }
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value) || Number.isNaN(Date.parse(value))) {
        errors.push(`${label}: ${field} harus timestamp UTC valid YYYY-MM-DDTHH:mm:ssZ, ditemukan "${value}"`);
      } else {
        const previous = timestamps.get(value);
        if (previous) errors.push(`${label}: ${field} bentrok pada ${value} dengan ${previous}`);
        else timestamps.set(value, `${label} (${field})`);
      }
    }
    const pubDate = scalar(frontmatter, 'pubDate');
    const updatedDate = scalar(frontmatter, 'updatedDate');
    if (typeof pubDate === 'string' && typeof updatedDate === 'string' && updatedDate < pubDate) errors.push(`${label}: updatedDate lebih awal dari pubDate`);
    if (typeof pubDate === 'string' && typeof updatedDate === 'string' && updatedDate === pubDate) errors.push(`${label}: updatedDate tidak boleh sama dengan pubDate`);

    if (!scalar(frontmatter, 'socialImage')) errors.push(`${label}: socialImage wajib diisi`);
    if (draft) continue;
    const placeholderPatterns = [
      [/lorem\s+ipsum/i, 'Lorem ipsum'],
      [/\bTODO\b/i, 'TODO'],
      [/\bFIXME\b/i, 'FIXME'],
      [/\bexample\.com\b/i, 'example.com placeholder'],
      [/\bisi di sini\b/i, 'placeholder isi di sini'],
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
        const found = records[targetCollection].find(item => typeof target === 'number' ? item.id === target : item.slug === target);
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
  console.log(`Content integrity check lulus: ${count} file; ID integer dan ULID unik, slug unik, timestamp valid, relasi ter-resolve.`);
}

function scalar(frontmatter, key) {
  const line = frontmatter.split(/\r?\n/).find(item => item.startsWith(key + ':'));
  if (!line) return undefined;
  const raw = line.slice(key.length + 1).trim();
  if (/^["']/.test(raw)) return unquote(raw);
  if (raw === 'true' || raw === 'false') return raw;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
}
function arrayField(frontmatter, key) {
  const lines = frontmatter.split(/\r?\n/);
  const index = lines.findIndex(line => line.startsWith(key + ':'));
  if (index < 0) return [];
  const value = lines[index].slice(key.length + 1).trim();
  if (value.startsWith('[')) {
    return [...value.matchAll(/["']([^"']+)["']|(?:^|[,\s])([0-9]+)(?=\s*[,\]])/g)]
      .map(item => item[1] !== undefined ? item[1] : Number(item[2]));
  }
  const result = [];
  for (const line of lines.slice(index + 1)) {
    if (/^\S/.test(line)) break;
    const item = line.match(/^\s+-\s*(.*?)\s*$/);
    if (item) {
      const raw = item[1].trim();
      result.push(/^["']/.test(raw) ? unquote(raw) : /^\d+$/.test(raw) ? Number(raw) : raw);
    }
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
