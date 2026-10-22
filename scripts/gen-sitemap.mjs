import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import './lib/env.mjs';

const dist = path.resolve('dist');
const indexPath = path.join(dist, 'sitemap-index.xml');
let index;
try { index = await readFile(indexPath, 'utf8'); }
catch {
  console.log('Sitemap consolidation skipped: Astro sitemap index is absent (SITE_URL may be unset).');
  process.exit(0);
}
const childUrls = [...index.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map(match => decodeXml(match[1].trim()));
if (!childUrls.length) throw new Error('sitemap-index.xml has no child sitemap locations.');

const entries = [];
const seen = new Set();
for (const childUrl of childUrls) {
  let childPath;
  try {
    const url = new URL(childUrl);
    childPath = path.resolve(dist, '.' + decodeURIComponent(url.pathname));
  } catch {
    throw new Error('Invalid child sitemap URL: ' + childUrl);
  }
  if (!childPath.startsWith(dist + path.sep)) throw new Error('Child sitemap path escapes dist: ' + childUrl);
  const xml = await readFile(childPath, 'utf8');
  for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const entry = match[1];
    const location = entry.match(/<loc>([\s\S]*?)<\/loc>/i);
    if (!location) continue;
    const normalized = decodeXml(location[1].trim());
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    entries.push(entry);
  }
}
if (!entries.length) throw new Error('No URL entries found in child sitemap files.');
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
  + entries.map(entry => '  <url>' + entry + '</url>').join('\n')
  + '\n</urlset>\n';
await writeFile(path.join(dist, 'sitemap.xml'), sitemap, 'utf8');
console.log('Sitemap consolidation passed: ' + entries.length + ' canonical URLs copied into dist/sitemap.xml.');
function decodeXml(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
