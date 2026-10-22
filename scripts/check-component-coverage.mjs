import { readFile } from 'node:fs/promises';

const registryPath = 'src/components/blocks.ts';
const catalogPath = 'src/pages/komponen.astro';
const routes = ['src/pages/artikel/[slug].astro', 'src/pages/panduan/[slug].astro', 'src/pages/layanan/[slug].astro'];
const failures = [];
const registry = await readFile(registryPath, 'utf8');
const catalog = await readFile(catalogPath, 'utf8');
const keys = [...registry.matchAll(/^\s*([\w'-]+):\s*[A-Za-z][\w]*,?\s*$/gm)].map(match => match[1].replace(/^['"]|['"]$/g, ''));
const examples = new Set([...catalog.matchAll(/component:\s*'([^']+)'/g)].map(match => match[1]));
for (const key of keys) if (!examples.has(key)) failures.push('Komponen registry "' + key + '" belum dipakai pada katalog reusable.');
for (const key of examples) if (!keys.includes(key)) failures.push('Katalog memakai komponen "' + key + '" yang tidak terdaftar pada registry.');
for (const route of routes) {
  const source = await readFile(route, 'utf8');
  if (/\b(?:render\(entry\)|const\s*\{\s*Content\s*\}\s*=\s*await\s*render)/.test(source) || /<Content\s*\/?\s*>/.test(source)) {
    failures.push(route + ': renderer Markdown langsung masih dipakai; gunakan BlockRenderer.');
  }
  if (!source.includes('BlockRenderer.astro')) failures.push(route + ': tidak menggunakan BlockRenderer.');
}
if (failures.length) {
  console.error('Component coverage check failed: ' + failures.length + ' issue(s).\n' + failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Component coverage check passed: ' + keys.length + ' registered blocks are demonstrated in the catalog; article, guide, and service routes use BlockRenderer instead of Astro Markdown Content.');
}
