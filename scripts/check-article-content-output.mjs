// Quality gate ported from konsultan-slf and adapted for TKDN component-rendered articles/guides.
// It checks published routes, real content markers, and ensures each body uses reusable blocks.
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const contentRoot = path.resolve('src/content');
const distRoot = path.resolve('dist');
const collections = [
  { source: 'articles', route: 'artikel' },
  { source: 'guides', route: 'panduan' },
];
const errors = [];
let checked = 0;
let skipped = 0;

try { await stat(distRoot); } catch {
  console.error('Article content output check failed: build output directory "dist" does not exist. Run the Astro build first.');
  process.exit(1);
}

for (const collection of collections) {
  for (const file of await markdownFiles(path.join(contentRoot, collection.source))) {
    const label = relative(process.cwd(), file);
    const source = await readFile(file, 'utf8');
    const parsed = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    const frontmatter = parsed?.[1] ?? '';
    const body = parsed ? source.slice(parsed[0].length).trim() : '';
    if (/^draft:\s*["']?true["']?\s*$/m.test(frontmatter) || /^status:\s*["']?(?:inactive|archived)["']?\s*$/m.test(frontmatter)) {
      skipped++;
      continue;
    }
    if (!parsed) { errors.push(label + ': frontmatter YAML tidak ditemukan'); continue; }
    const slug = unquote(frontmatter.match(/^slug:\s*(.+)$/m)?.[1] ?? path.basename(file, '.md'));
    const htmlPath = path.join(distRoot, collection.route, slug, 'index.html');
    let html;
    try { html = await readFile(htmlPath, 'utf8'); } catch {
      errors.push(label + ': halaman terbit tidak ditemukan di "' + collection.route + '/' + slug + '/index.html"');
      continue;
    }
    checked++;
    const visible = normalize(toVisibleText(html));
    if (!/<h1\b/i.test(html) || !visible.includes(normalize(unquote(frontmatter.match(/^title:\s*(.+)$/m)?.[1] ?? '')))) {
      errors.push(label + ': judul utama tidak dirender pada halaman terbit');
    }
    const blockCount = (html.match(/class=["'][^"']*\btkdn-block\b/g) ?? []).length;
    if (blockCount < 1) errors.push(label + ': isi tidak dirender melalui reusable content block (.tkdn-block)');

    const markers = new Set();
    for (const match of frontmatter.matchAll(/^\s+(?:heading|title|text|question|answer):\s*(.+?)\s*$/gm)) {
      const value = cleanInline(unquote(match[1]));
      if (value.length >= 12) markers.add(value);
    }
    for (const line of body.split(/\r?\n/)) {
      if (/^!\\[[^\\]]*\\]\\([^)]+\\)$/.test(line.trim())) continue; // Image alt text is checked by the image-alt gate.
      const value = cleanInline(line.replace(/^#{1,6}\s+/, '').replace(/^>\s?/, '').replace(/^[-*+]\s+/, '').replace(/^\d+[.)]\s+/, ''));
      if (value.length >= 24 && !/^\|?\s*:?-{3,}/.test(value) && !/^\|.*\|$/.test(value)) markers.add(value);
    }
    const missing = [...markers].filter(marker => !visible.includes(normalize(marker)));
    if (missing.length) {
      errors.push(label + ': ' + missing.length + ' marker isi tidak muncul di halaman terbit; contoh: ' + missing.slice(0, 3).map(value => JSON.stringify(value.slice(0, 100))).join(', '));
    }
  }
}

if (errors.length) {
  console.error('Article content output check failed: ' + errors.length + ' issue(s) across ' + checked + ' published article/guide pages.\n');
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Article content output check passed: ' + checked + ' published article/guide pages render content through reusable components' + (skipped ? ' (' + skipped + ' drafts/inactive entries skipped)' : '') + '.');
}

function cleanInline(value) {
  return value.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1').replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/~~(.*?)~~/g, '$1').trim();
}
function normalize(value) { return value.replace(/\s+/g, ' ').toLocaleLowerCase('id-ID').trim(); }
function unquote(value) { const text = value.trim(); return ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) ? text.slice(1, -1) : text; }
function toVisibleText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex,16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec,10))).replace(/\s+/g, ' ');
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
