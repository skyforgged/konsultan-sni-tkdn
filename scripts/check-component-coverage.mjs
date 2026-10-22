import { readFile } from 'node:fs/promises';

const registryPath = 'src/components/blocks.ts';
const catalogPath = 'src/pages/komponen.astro';
const routes = ['src/pages/artikel/[slug].astro', 'src/pages/panduan/[slug].astro', 'src/pages/layanan/[slug].astro'];
const pageRoutes = ['src/pages/index.astro','src/pages/faq.astro','src/pages/tentang-kami.astro','src/pages/404.astro','src/pages/artikel/index.astro','src/pages/panduan/index.astro','src/pages/layanan/index.astro','src/pages/kontak/index.astro'];
const requiredFiles = [
  'ContentCard.astro','FaqBlock.astro','CtaBlock.astro','TableBlock.astro','NoteBlock.astro','StepsBlock.astro',
  'StatsBlock.astro','GlossaryBlock.astro','QuoteBlock.astro','ArticleSectionBlock.astro','ProcessTimeline.astro',
  'ChecklistCard.astro','ComparisonTable.astro','DocumentList.astro','ImagePanel.astro','FeatureCardGrid.astro',
  'StatsGrid.astro','SourceLinks.astro','ContactPanel.astro','PageHeaderBlock.astro','HomeHeroBlock.astro',
  'ServiceListBlock.astro','HomeProcessBlock.astro','ArticleListBlock.astro','HomeCtaBlock.astro','NotFoundBlock.astro',
  'SiteHeader.astro','SiteFooter.astro','ArticlePreviousArticles.astro'
];
const failures = [];
const registry = await readFile(registryPath, 'utf8');
const catalog = await readFile(catalogPath, 'utf8');
const keys = [...registry.matchAll(/^\s*([\w'-]+):\s*[A-Za-z][\w]*,?\s*$/gm)].map(match => match[1].replace(/^['"]|['"]$/g, ''));
const examples = new Set([...catalog.matchAll(/component:\s*'([^']+)'/g)].map(match => match[1]));
for (const filename of requiredFiles) {
  try { await readFile('src/components/shared/' + filename, 'utf8'); }
  catch { failures.push('Komponen bersama wajib tidak ditemukan: src/components/shared/' + filename); }
}
try { await readFile('src/components/PageBlocks.astro', 'utf8'); } catch { failures.push('Komponen halaman wajib tidak ditemukan: src/components/PageBlocks.astro'); }
const layout = await readFile('src/layouts/BaseLayout.astro', 'utf8');
if (!layout.includes('SiteHeader.astro') || !layout.includes('SiteFooter.astro')) failures.push('BaseLayout harus menggunakan SiteHeader dan SiteFooter reusable.');
const articleRoute = await readFile('src/pages/artikel/[slug].astro', 'utf8');
if (!articleRoute.includes('ArticlePreviousArticles.astro')) failures.push('Detail artikel harus menggunakan ArticlePreviousArticles.');
for (const key of keys) if (!examples.has(key)) failures.push('Komponen registry "' + key + '" belum dipakai pada katalog reusable.');
for (const key of examples) if (!keys.includes(key)) failures.push('Katalog memakai komponen "' + key + '" yang tidak terdaftar pada registry.');
for (const route of routes) {
  const source = await readFile(route, 'utf8');
  if (/\b(?:render\(entry\)|const\s*\{\s*Content\s*\}\s*=\s*await\s*render)/.test(source) || /<Content\s*\/?\s*>/.test(source)) {
    failures.push(route + ': renderer Markdown langsung masih dipakai; gunakan BlockRenderer.');
  }
  if (!source.includes('BlockRenderer.astro')) failures.push(route + ': tidak menggunakan BlockRenderer.');
}
for (const route of pageRoutes) {
  const source = await readFile(route, 'utf8');
  if (/\\b(?:render\\(entry\\)|const\\s*\\{\\s*Content\\s*\\}\\s*=\\s*await\\s*render)/.test(source) || /<Content\\s*\\/?\\s*>/.test(source) || /\\{page\\.body\\}/.test(source)) {
    failures.push(route + ': renderer Markdown langsung masih dipakai; pindahkan isi ke frontmatter blocks dan gunakan PageBlocks.');
  }
  if (!source.includes('PageBlocks.astro')) failures.push(route + ': tidak menggunakan PageBlocks untuk konten page frontmatter.');
}
if (failures.length) {
  console.error('Component coverage check failed: ' + failures.length + ' issue(s).\n' + failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Component coverage check passed: ' + keys.length + ' registered blocks are demonstrated in the catalog; all required shared component files exist; article, guide, and service routes use BlockRenderer instead of Astro Markdown Content.');
}
