import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const htmlFiles = [];
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) await walk(full);
    else if (item.isFile() && item.name.endsWith('.html')) htmlFiles.push(full);
  }
}
await walk(root);
if (!htmlFiles.length) throw new Error('Tidak ada HTML hasil build di dist/.');

const failures = [];
const siteUrl = process.env.SITE_URL;
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const rel = path.relative(root, file);
  if (!/<title>[^<]+<\/title>/i.test(html)) failures.push(`${rel}: title tidak ditemukan`);
  if (!/<meta\s+name=["']description["']\s+content=["'][^"']{20,}["']/i.test(html)) failures.push(`${rel}: meta description tidak ditemukan atau terlalu pendek`);
  if (siteUrl && !/<link\s+rel=["']canonical["']\s+href=["']https?:\/\//i.test(html)) failures.push(`${rel}: canonical absolut tidak ditemukan padahal SITE_URL disetel`);
  for (const match of html.matchAll(/<img\b([^>]*)>/gi)) {
    if (!/\balt\s*=\s*["'][^"']*["']/i.test(match[1])) failures.push(`${rel}: elemen img tanpa atribut alt`);
  }
  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]); }
    catch { failures.push(`${rel}: JSON-LD tidak valid`); }
  }
  for (const match of html.matchAll(/\bhref=["']([^"']+)["']/gi)) {
    const href = match[1];
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    const pathname = decodeURIComponent(href.split(/[?#]/)[0]) || '/';
    let target;
    if (pathname === '/') target = path.join(root, 'index.html');
    else if (/\.[a-z0-9]{2,6}$/i.test(pathname)) target = path.join(root, pathname.slice(1));
    else target = path.join(root, pathname.replace(/^\/+/, ''), 'index.html');
    try { await access(target); }
    catch { failures.push(`${rel}: tautan internal tidak ditemukan: ${href}`); }
  }
}
if (failures.length) {
  console.error('Pemeriksaan output gagal:');
  for (const failure of failures) console.error(' - ' + failure);
  process.exitCode = 1;
} else {
  console.log(`Pemeriksaan output lulus: ${htmlFiles.length} halaman HTML, metadata dasar, tautan internal, alt gambar, dan JSON-LD.`);
}
