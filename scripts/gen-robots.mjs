import { writeFile } from 'node:fs/promises';
import './lib/env.mjs';

const siteUrl = process.env.SITE_URL;
if (!siteUrl) {
  console.log('SITE_URL tidak disetel; robots.txt dinamis dilewati.');
} else {
  const origin = new URL(siteUrl).origin;
  await writeFile('public/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap-index.xml\n`, 'utf8');
  console.log('robots.txt generated for ' + origin);
}
