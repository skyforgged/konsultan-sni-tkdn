// Memastikan setiap artikel terbit benar-benar merender isinya di output build.
// Kasus yang dicegah: frontmatter terpotong atau blocks kosong, sehingga halaman
// terbit tanpa satu pun section (data hilang diam-diam karena blocks punya default []).
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const contentDir = path.resolve('src/content/articles');
const distRoot = path.resolve('dist');
const errors = [];
let checked = 0;
let skipped = 0;

try {
  await stat(distRoot);
} catch {
  console.error('Article content output check failed: build output directory "dist" does not exist. Run the Astro build first.');
  process.exit(1);
}

for (const file of await markdownFiles(contentDir)) {
  const label = relative(process.cwd(), file);
  const source = await readFile(file, 'utf8');
  const frontmatter = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';

  if (/^draft:\s*["']?true["']?\s*$/m.test(frontmatter)) {
    skipped++;
    continue;
  }

  const slug = unquote(frontmatter.match(/^slug:\s*(.+)$/m)?.[1] ?? path.basename(file, '.md'));
  const htmlPath = path.join(distRoot, 'articles', slug, 'index.html');

  let html;
  try {
    html = await readFile(htmlPath, 'utf8');
  } catch {
    errors.push(label + ': halaman terbit tidak ditemukan di "dist/articles/' + slug + '/index.html"');
    continue;
  }

  checked++;
  const visibleText = toVisibleText(html);
  const headings = uniqueMarkers(frontmatter, /^\s+(?:heading|title):\s*(.+?)\s*$/gm);
  const paragraphs = uniqueMarkers(frontmatter, /^\s+text:\s*(.+?)\s*$/gm);
  const markers = headings.length > 0 ? headings : paragraphs;

  if (markers.length === 0) {
    errors.push(label + ': tidak ada penanda isi (heading/title/teks paragraf) di frontmatter blocks; periksa struktur frontmatter');
    continue;
  }

  const missing = markers.filter((marker) => !visibleText.includes(marker));
  if (missing.length > 0) {
    const kind = headings.length > 0 ? 'heading/title blok' : 'teks paragraf blok';
    errors.push(
      label + ': ' + missing.length + ' dari ' + markers.length + ' ' + kind + ' tidak muncul di halaman terbit, ' +
      'mis. ' + missing.slice(0, 3).map((item) => '"' + item + '"').join(', ') +
      '. Artikel terbit tanpa seluruh isinya, biasanya karena frontmatter terpotong atau blocks kosong',
    );
  }
}

if (errors.length) {
  console.error('Article content output check failed: ' + errors.length + ' issue(s) across ' + checked + ' published articles.\n');
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Article content output check passed: ' + checked + ' published article pages render their block content' + (skipped > 0 ? ' (' + skipped + ' draft article(s) skipped)' : '') + '.');
}

function uniqueMarkers(frontmatter, pattern) {
  const markers = [];
  for (const match of frontmatter.matchAll(pattern)) {
    const value = unquote(match[1]);
    if (value && !markers.includes(value)) markers.push(value);
  }
  return markers;
}

function unquote(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function toVisibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ');
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
