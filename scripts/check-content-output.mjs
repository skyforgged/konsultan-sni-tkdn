import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const contentRoot = path.resolve('src/content');
const distRoot = path.resolve('dist');
const collections = ['pages', 'services', 'articles', 'guides'];
const errors = [];
let checked = 0;
let howToChecked = 0;

for (const collection of collections) {
  for (const file of await markdownFiles(path.join(contentRoot, collection))) {
    const source = await readFile(file, 'utf8');
    const frontmatter = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    const label = path.relative(process.cwd(), file).split(path.sep).join('/');
    if (!frontmatter) continue;
    if (scalar(frontmatter, 'draft') === 'true') continue;
    const slug = scalar(frontmatter, 'slug') || path.basename(file, '.md');
    let outputPath;
    if (collection === 'pages') {
      if (slug === 'home') outputPath = path.join(distRoot, 'index.html');
      else if (slug === 'not-found') outputPath = path.join(distRoot, '404.html');
      else outputPath = path.join(distRoot, slug, 'index.html');
    } else {
      const prefix = {services: 'layanan', articles: 'artikel', guides: 'panduan'}[collection];
      outputPath = path.join(distRoot, prefix, slug, 'index.html');
    }

    let html;
    try { html = await readFile(outputPath, 'utf8'); }
    catch {
      errors.push(label + ': halaman tidak ditemukan pada output build (' + path.relative(distRoot, outputPath).split(path.sep).join('/') + ')');
      continue;
    }
    checked++;
    const expectedHeading = scalar(frontmatter, 'heroTitle') || scalar(frontmatter, 'title');
    if (expectedHeading) {
      const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(match => visibleText(match[1]));
      if (!headings.some(heading => heading.includes(expectedHeading))) {
        errors.push(label + ': heading utama hasil build tidak memuat teks yang diharapkan: "' + expectedHeading + '"');
      }
    }
    if (collection === 'guides' && /^howTo:\s*$/m.test(frontmatter)) {
      howToChecked++;
      if (!/"@type"\s*:\s*"HowTo"/.test(html)) errors.push(label + ': memiliki howTo di frontmatter tetapi JSON-LD HowTo tidak ditemukan di output');
      const steps = [...frontmatter.matchAll(/^\s+- title:\s*(.+)$/gm)].map(match => unquote(match[1]));
      if (steps.length < 2) errors.push(label + ': HowTo harus memiliki minimal dua langkah di frontmatter');
    }
  }
}

if (errors.length) {
  console.error('Content output check gagal: ' + errors.length + ' masalah.');
  for (const error of errors) console.error(' - ' + error);
  process.exitCode = 1;
} else {
  console.log('Content output check lulus: ' + checked + ' halaman konten terbit; heading utama terverifikasi; ' + howToChecked + ' panduan HowTo memiliki JSON-LD.');
}

function scalar(frontmatter, key) {
  const line = frontmatter.split(/\r?\n/).find(item => item.startsWith(key + ':'));
  if (!line) return undefined;
  return unquote(line.slice(key.length + 1).trim());
}
function unquote(value) {
  return value.replace(/^["']|["']$/g, '');
}
function visibleText(value) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}
async function markdownFiles(directory) {
  const entries = await readdir(directory, {withFileTypes: true}).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}
