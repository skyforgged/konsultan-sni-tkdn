import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const failures = [];
const canonicalOwners = new Map();
const descriptionOwners = new Map();
const htmlFiles = [];
const htmlByRoute = new Map();
let jsonLdChecked = 0;
let imageCount = 0;

try { await stat(root); } catch {
  console.error('SEO/output check gagal: dist/ tidak ditemukan; jalankan build terlebih dahulu.');
  process.exit(1);
}
await walk(root);
for (const file of htmlFiles) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  const route = routeFor(relative);
  htmlByRoute.set(route, {file, html: await readFile(file, 'utf8'), relative});
}
if (!htmlFiles.length) failures.push('Tidak ada halaman HTML di dist/.');

for (const page of htmlByRoute.values()) {
  const {html, relative} = page;
  const titleTags = [...html.matchAll(/<title\\b[^>]*>([\\s\\S]*?)<\\/title>/gi)];
  if (titleTags.length !== 1) failures.push(`${relative}: harus memiliki tepat satu <title>, ditemukan ${titleTags.length}`);
  const title = decode(titleTags[0]?.[1]?.replace(/<[^>]*>/g, '') ?? '').trim();
  if (!title) failures.push(`${relative}: title kosong`);

  const tags = [...html.matchAll(/<meta\\b[^>]*>/gi)].map(match => match[0]);
  const meta = (key, value) => tags.filter(tag => attr(tag, key)?.toLowerCase() === value.toLowerCase());
  const robots = meta('name', 'robots').map(tag => attr(tag, 'content') || '').join(' ').toLowerCase();
  const noindex = robots.includes('noindex');
  const descriptions = meta('name', 'description');
  if (descriptions.length !== 1) failures.push(`${relative}: harus memiliki tepat satu meta description, ditemukan ${descriptions.length}`);
  const description = decode(attr(descriptions[0] || '', 'content') || '').trim();
  if (!description) failures.push(`${relative}: meta description kosong`);
  if (description && !noindex) {
    const key = description.replace(/\\s+/g, ' ').toLocaleLowerCase('id-ID');
    if (descriptionOwners.has(key)) failures.push(`${relative}: meta description duplikat dengan ${descriptionOwners.get(key)}`);
    else descriptionOwners.set(key, relative);
  }

  const canonicals = [...html.matchAll(/<link\\b[^>]*>/gi)].map(m=>m[0]).filter(tag => (attr(tag,'rel')||'').toLowerCase().split(/\\s+/).includes('canonical'));
  if (noindex && canonicals.length) failures.push(`${relative}: halaman noindex tidak boleh memiliki canonical`);
  if (!noindex && canonicals.length !== 1) failures.push(`${relative}: halaman indexable harus memiliki tepat satu canonical, ditemukan ${canonicals.length}`);
  const canonical = attr(canonicals[0] || '', 'href');
  if (!noindex && canonical) {
    if (!absoluteHttp(canonical)) failures.push(`${relative}: canonical harus URL absolut HTTP(S): ${canonical}`);
    else {
      if (canonicalOwners.has(canonical)) failures.push(`${relative}: canonical duplikat dengan ${canonicalOwners.get(canonical)}: ${canonical}`);
      else canonicalOwners.set(canonical, relative);
    }
  }
  const ogUrl = attr(meta('property','og:url')[0] || '', 'content');
  if (canonical && ogUrl && canonical !== ogUrl) failures.push(`${relative}: og:url tidak sama dengan canonical`);

  const requiredMeta = [
    ['property','og:title'], ['property','og:description'],
    ...(!noindex ? [['property','og:url']] : []), ['property','og:image'], ['name','twitter:card'], ['name','twitter:title'],
    ['name','twitter:description'], ['name','twitter:image'],
  ];
  for (const [key,value] of requiredMeta) {
    const found = meta(key,value);
    if (found.length !== 1) failures.push(`${relative}: harus memiliki tepat satu metadata ${value}, ditemukan ${found.length}`);
    else if (!(attr(found[0],'content') || '').trim()) failures.push(`${relative}: metadata ${value} kosong`);
  }
  const ogTitle = attr(meta('property','og:title')[0] || '', 'content');
  const twitterTitle = attr(meta('name','twitter:title')[0] || '', 'content');
  const ogDescription = attr(meta('property','og:description')[0] || '', 'content');
  const twitterDescription = attr(meta('name','twitter:description')[0] || '', 'content');
  const ogImage = attr(meta('property','og:image')[0] || '', 'content');
  const twitterImage = attr(meta('name','twitter:image')[0] || '', 'content');
  if (title && ogTitle && title !== decode(ogTitle)) failures.push(`${relative}: og:title tidak konsisten dengan title`);
  if (title && twitterTitle && title !== decode(twitterTitle)) failures.push(`${relative}: twitter:title tidak konsisten dengan title`);
  if (description && ogDescription && description !== decode(ogDescription)) failures.push(`${relative}: og:description tidak konsisten dengan description`);
  if (description && twitterDescription && description !== decode(twitterDescription)) failures.push(`${relative}: twitter:description tidak konsisten dengan description`);
  if (ogImage && twitterImage && ogImage !== twitterImage) failures.push(`${relative}: twitter:image tidak sama dengan og:image`);
  if (ogImage && !/\\.(png|jpe?g|webp|gif)(?:[?#].*)?$/i.test(ogImage)) failures.push(`${relative}: og:image harus berupa gambar raster: ${ogImage}`);
  if (ogImage) await checkPublicAsset(ogImage, canonical, relative, 'og:image');

  const ids = new Set();
  for (const match of html.matchAll(/\\bid=["']([^"']+)["']/gi)) {
    if (ids.has(match[1])) failures.push(`${relative}: ID HTML duplikat "${match[1]}"`);
    ids.add(match[1]);
  }

  for (const match of html.matchAll(/<img\\b([^>]*)>/gi)) {
    imageCount++;
    const attributes = match[1];
    const alt = attr(attributes, 'alt');
    const src = attr(attributes, 'src');
    if (alt === null) failures.push(`${relative}: <img> tidak memiliki atribut alt`);
    if (!src) failures.push(`${relative}: <img> tidak memiliki src yang valid`);
    else if (/[<>]/.test(src)) failures.push(`${relative}: src gambar mengandung markup: ${src}`);
    else await checkPublicAsset(src, canonical, relative, 'img src');
  }

  for (const block of html.matchAll(/<script\\b[^>]*type=["']application\\/ld\\+json["'][^>]*>([\\s\\S]*?)<\\/script>/gi)) {
    try {
      const data = JSON.parse(block[1]);
      jsonLdChecked++;
      validateJsonLd(data, relative);
    } catch (error) { failures.push(`${relative}: JSON-LD tidak valid (${error.message})`); }
  }
}

for (const page of htmlByRoute.values()) {
  const {html, relative, route} = page;
  for (const match of html.matchAll(/\\bhref=["']([^"']+)["']/gi)) {
    const href = decode(match[1].trim());
    if (!href || /^(?:https?:|mailto:|tel:|sms:|javascript:|data:|#|\\/\\/)/i.test(href)) {
      if (/^(?:javascript|data):/i.test(href)) failures.push(`${relative}: skema URL berbahaya: ${href}`);
      continue;
    }
    if (!href.startsWith('/')) continue;
    const [pathnameRaw, fragment] = href.split('#');
    const pathname = (pathnameRaw || route).split('?')[0];
    const targetRoute = normalizeRoute(pathname);
    const target = htmlByRoute.get(targetRoute);
    if (!target) {
      const assetPath = path.resolve(root, '.' + pathname);
      if (!await isFile(assetPath)) failures.push(`${relative}: target tautan internal tidak ditemukan: ${href}`);
      continue;
    }
    if (fragment) {
      const targetIds = new Set([...target.html.matchAll(/\\bid=["']([^"']+)["']/gi)].map(m=>m[1]));
      let decodedFragment = fragment;
      try { decodedFragment = decodeURIComponent(fragment); } catch {}
      if (!targetIds.has(decodedFragment)) failures.push(`${relative}: fragment #${decodedFragment} tidak ditemukan di ${target.relative}`);
    }
  }
}

const robotsPath = path.join(root,'robots.txt');
const sitemapPath = path.join(root,'sitemap.xml');
if (!await isFile(robotsPath)) failures.push('robots.txt tidak ditemukan pada output build');
if (!await isFile(sitemapPath)) failures.push('sitemap.xml tidak ditemukan pada output build');
if (await isFile(robotsPath)) {
  const robots = await readFile(robotsPath,'utf8');
  const directives = [...robots.matchAll(/^Sitemap:\\s*(\\S+)\\s*$/gim)];
  if (directives.length !== 1) failures.push(`robots.txt harus memuat tepat satu deklarasi Sitemap, ditemukan ${directives.length}`);
  for (const [,url] of directives) if (!absoluteHttp(url)) failures.push(`URL Sitemap pada robots.txt tidak valid: ${url}`);
}
if (await isFile(sitemapPath)) {
  const sitemap = await readFile(sitemapPath,'utf8');
  const locations = [...sitemap.matchAll(/<loc>([\\s\\S]*?)<\\/loc>/gi)].map(m=>decodeXml(m[1].trim()));
  if (!sitemap.includes('<urlset') || !sitemap.includes('</urlset>')) failures.push('sitemap.xml tidak memiliki struktur urlset yang valid');
  if (!locations.length) failures.push('sitemap.xml tidak memiliki URL');
  const seen = new Set();
  for (const url of locations) {
    if (!absoluteHttp(url)) { failures.push(`URL sitemap tidak absolut/valid: ${url}`); continue; }
    if (seen.has(url)) failures.push(`URL duplikat di sitemap.xml: ${url}`);
    seen.add(url);
    if (canonicalOwners.size && !canonicalOwners.has(url)) failures.push(`URL sitemap tidak cocok dengan canonical halaman indexable: ${url}`);
  }
}

if (failures.length) {
  console.error(`SEO/output check gagal: ${failures.length} masalah pada ${htmlFiles.length} halaman HTML.`);
  for (const failure of failures) console.error(' - ' + failure);
  process.exitCode = 1;
} else {
  console.log(`SEO/output check lulus: ${htmlFiles.length} halaman HTML, canonical/meta unik, social metadata, ${jsonLdChecked} blok JSON-LD, ${imageCount} gambar, tautan/fragment internal, robots.txt, dan sitemap.xml.`);
}

async function walk(dir) {
  for (const item of await readdir(dir,{withFileTypes:true})) {
    const full = path.join(dir,item.name);
    if (item.isDirectory()) await walk(full);
    else if (item.isFile() && item.name.endsWith('.html')) htmlFiles.push(full);
  }
}
function routeFor(relative) {
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return '/' + relative.slice(0,-11) + '/';
  if (relative === '404.html') return '/404.html';
  return '/' + relative;
}
function normalizeRoute(value) {
  let pathname = value || '/';
  try { pathname = decodeURIComponent(pathname); } catch {}
  if (pathname.endsWith('/')) return pathname;
  if (/\\.[a-z0-9]{2,8}$/i.test(pathname)) return pathname;
  return pathname + '/';
}
function attr(tag,name) {
  if (!tag) return null;
  const pattern = /([^\\s=]+)\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))/g;
  for (const match of tag.matchAll(pattern)) {
    if (match[1].toLowerCase() === name.toLowerCase()) return match[2] ?? match[3] ?? match[4] ?? '';
  }
  return null;
}
function decode(value) {
  return value.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function decodeXml(value) { return decode(value); }
function absoluteHttp(value) { try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:'; } catch { return false; } }
async function isFile(file) { try { return (await stat(file)).isFile(); } catch { return false; } }
async function checkPublicAsset(value, canonical, page, label) {
  try {
    const url = new URL(value, canonical || 'https://local.invalid/');
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    const canonicalOrigin = canonical && absoluteHttp(canonical) ? new URL(canonical).origin : null;
    if (canonicalOrigin && url.origin !== canonicalOrigin) return;
    const pathname = decodeURIComponent(url.pathname);
    const target = path.resolve(root, '.' + pathname);
    if (!target.startsWith(root + path.sep)) { failures.push(`${page}: ${label} path keluar dari dist: ${value}`); return; }
    if (!await isFile(target)) failures.push(`${page}: file ${label} tidak ditemukan: ${value}`);
  } catch { failures.push(`${page}: URL ${label} tidak valid: ${value}`); }
}
function validateJsonLd(data,page) {
  const items = Array.isArray(data) ? data : [data];
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) { failures.push(`${page}: setiap JSON-LD harus berupa objek`); continue; }
    if (!item['@context']) failures.push(`${page}: JSON-LD tidak memiliki @context`);
    if (!item['@type']) failures.push(`${page}: JSON-LD tidak memiliki @type`);
    if (item['@type'] === 'HowTo' && (!Array.isArray(item.step) || item.step.length < 2)) failures.push(`${page}: HowTo JSON-LD harus memiliki minimal dua step`);
    if (item['@type'] === 'FAQPage' && (!item.mainEntity || !Array.isArray(item.mainEntity))) failures.push(`${page}: FAQPage JSON-LD tidak memiliki mainEntity array`);
  }
}
