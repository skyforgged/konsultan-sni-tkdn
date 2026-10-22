import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const failures = [];
let pagesChecked = 0;
let jsonLdChecked = 0;
let socialImagesChecked = 0;
let rasterFallbackChecked = false;
const canonicalUrls = new Set();
const canonicalOwners = new Map();
const descriptionOwners = new Map();
let robotsSitemapUrl = null;

try {
  await stat(root);
} catch {
  console.error('SEO output check failed: "dist" does not exist. Run the Astro build first.');
  process.exit(1);
}

const files = await walk(root);
const pages = files.filter((file) => file.endsWith('.html'));
if (pages.length === 0) failures.push('No HTML pages found in build output.');

for (const file of pages) {
  const html = await readFile(file, 'utf8');
  const page = path.relative(root, file).split(path.sep).join('/');
  pagesChecked++;

  const titleTags = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
  if (titleTags.length !== 1) failures.push(`${page}: expected exactly one <title>, found ${titleTags.length}`);
  const titleText = decodeHtmlEntities(titleTags[0]?.[1].replace(/<[^>]*>/g, '')).trim();
  if (!titleText) failures.push(`${page}: <title> must not be empty`);

  const noindex = /<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["'][^"']*\bnoindex\b)[^>]*>/i.test(html);

  const descriptionTags = (html.match(/<meta\b[^>]*>/gi) ?? [])
    .filter((tag) => getAttr(tag, 'name')?.toLowerCase() === 'description');
  if (descriptionTags.length !== 1) {
    failures.push(`${page}: expected exactly one meta description, found ${descriptionTags.length}`);
  }
  const description = descriptionTags.length === 1
    ? decodeHtmlEntities(getAttr(descriptionTags[0], 'content') ?? '').trim()
    : null;
  if (descriptionTags.length === 1 && !description) failures.push(`${page}: meta description must not be empty`);
  if (description && !noindex) {
    const normalizedDescription = description.replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
    const previousPage = descriptionOwners.get(normalizedDescription);
    if (previousPage && previousPage !== page) {
      failures.push(`${page}: meta description duplicates ${previousPage}`);
    } else {
      descriptionOwners.set(normalizedDescription, page);
    }
  }

  const ogTitle = findMeta(html, 'property', 'og:title');
  const twitterTitle = findMeta(html, 'name', 'twitter:title');
  const ogDescription = findMeta(html, 'property', 'og:description');
  const twitterDescription = findMeta(html, 'name', 'twitter:description');
  if (titleText && ogTitle && titleText !== ogTitle) failures.push(`${page}: og:title does not match the HTML title`);
  if (titleText && twitterTitle && titleText !== twitterTitle) failures.push(`${page}: twitter:title does not match the HTML title`);
  if (description && ogDescription && description !== ogDescription) failures.push(`${page}: og:description does not match the meta description`);
  if (description && twitterDescription && description !== twitterDescription) failures.push(`${page}: twitter:description does not match the meta description`);
  const ogImage = findMeta(html, 'property', 'og:image');
  const twitterImage = findMeta(html, 'name', 'twitter:image');
  if (ogImage && twitterImage && ogImage !== twitterImage) failures.push(`${page}: twitter:image does not match og:image`);

  const canonicals = [...html.matchAll(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi)];
  if (noindex && canonicals.length > 0) {
    failures.push(`${page}: noindex page must not include a canonical link`);
  } else if (!noindex && canonicals.length !== 1) {
    failures.push(`${page}: expected exactly one canonical link, found ${canonicals.length}`);
  }

  const canonicalTag = canonicals[0]?.[0];
  const canonicalHref = canonicalTag ? getAttr(canonicalTag, 'href')?.trim() : null;
  if (!noindex && canonicals.length === 1 && !canonicalHref) {
    failures.push(`${page}: canonical link must have a non-empty href`);
  }
  if (!noindex && canonicalHref && isAbsoluteHttpUrl(canonicalHref)) {
    const previousPage = canonicalOwners.get(canonicalHref);
    if (previousPage && previousPage !== page) {
      failures.push(`${page}: canonical URL is already assigned to ${previousPage}: ${canonicalHref}`);
    } else {
      canonicalOwners.set(canonicalHref, page);
    }
    canonicalUrls.add(canonicalHref);
  }
  if (canonicalHref && !isAbsoluteHttpUrl(canonicalHref)) {
    failures.push(`${page}: canonical URL must be absolute HTTP(S): ${canonicalHref}`);
  }
  const ogUrl = findMeta(html, 'property', 'og:url');
  if (canonicalHref && ogUrl && canonicalHref !== ogUrl) {
    failures.push(`${page}: og:url does not match canonical URL`);
  }

  for (const [attribute, value] of [
    ['property', 'og:title'],
    ['property', 'og:description'],
    ['property', 'og:url'],
    ['property', 'og:image'],
    ['name', 'twitter:card'],
    ['name', 'twitter:title'],
    ['name', 'twitter:description'],
    ['name', 'twitter:image'],
  ]) {
    const matchingTags = (html.match(/<meta\b[^>]*>/gi) ?? [])
      .filter((tag) => getAttr(tag, attribute)?.toLowerCase() === value.toLowerCase());
    if (matchingTags.length === 0) {
      failures.push(`${page}: missing ${value} metadata`);
    } else if (matchingTags.length > 1) {
      failures.push(`${page}: expected exactly one ${value} metadata tag, found ${matchingTags.length}`);
    } else if (!decodeHtmlEntities(getAttr(matchingTags[0], 'content') ?? '').trim()) {
      failures.push(`${page}: ${value} metadata content must not be empty`);
    }
  }

  const canonicalOrigin = canonicalHref && isAbsoluteHttpUrl(canonicalHref) ? new URL(canonicalHref).origin : null;
  for (const [label, imageUrlValue] of [
    ['og:image', findMeta(html, 'property', 'og:image')],
    ['twitter:image', findMeta(html, 'name', 'twitter:image')],
  ]) {
    if (imageUrlValue && !/\.(png|jpe?g|webp|gif)$/i.test(imageUrlValue.split(/[?#]/)[0])) {
      failures.push(`${page}: ${label} must be a raster image (PNG/JPEG/WebP/GIF); social crawlers do not render SVG: ${imageUrlValue}`);
    }
    if (!imageUrlValue || !canonicalOrigin) continue;
    try {
      const imageUrl = new URL(imageUrlValue, canonicalHref);
      if (imageUrl.origin !== canonicalOrigin) continue;
      const pathname = decodeURIComponent(imageUrl.pathname);
      const imagePath = path.resolve(root, `.${pathname}`);
      if (!imagePath.startsWith(root + path.sep)) {
        failures.push(`${page}: ${label} path escapes build output: ${imageUrlValue}`);
      } else {
        try {
          if (!(await stat(imagePath)).isFile()) failures.push(`${page}: ${label} file is missing: ${imageUrlValue}`);
          else socialImagesChecked++;
        } catch {
          failures.push(`${page}: ${label} file is missing: ${imageUrlValue}`);
        }
      }
    } catch {
      failures.push(`${page}: invalid ${label} URL: ${imageUrlValue}`);
    }
  }

  const jsonLdBlocks = [...html.matchAll(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of jsonLdBlocks) {
    try {
      const data = JSON.parse(block[1]);
      jsonLdChecked++;
      validateJsonLd(data, page, failures);
    } catch (error) {
      failures.push(`${page}: invalid JSON-LD (${error instanceof Error ? error.message : String(error)})`);
    }
  }
}

const socialFallbacks = [
  { path: 'images/og-default.webp', type: 'WEBP' },
  { path: 'images/og-default.svg', type: 'SVG' },
];
for (const fallback of socialFallbacks) {
  const target = path.join(root, fallback.path);
  try {
    const info = await stat(target);
    if (!info.isFile()) { failures.push(`Missing social image fallback: ${fallback.path}`); continue; }
    if (fallback.type === 'WEBP') rasterFallbackChecked = true;
  } catch { failures.push(`Missing social image fallback: ${fallback.path}`); }
}

for (const requiredFile of ['robots.txt']) {
  const target = path.join(root, requiredFile);
  try {
    if (!(await stat(target)).isFile()) failures.push(`Missing generated ${requiredFile}`);
  } catch {
    failures.push(`Missing generated ${requiredFile}`);
  }
}

try {
  const robots = await readFile(path.join(root, 'robots.txt'), 'utf8');
  const sitemapDirectives = [...robots.matchAll(/^Sitemap:\s*(\S+)\s*$/gim)];
  if (sitemapDirectives.length !== 1) {
    failures.push(`robots.txt must declare exactly one Sitemap URL, found ${sitemapDirectives.length}.`);
  }
  for (const [, sitemapValue] of sitemapDirectives) {
    if (!isAbsoluteHttpUrl(sitemapValue)) {
      failures.push(`robots.txt Sitemap URL must be absolute HTTP(S): ${sitemapValue}`);
      continue;
    }
    robotsSitemapUrl = new URL(sitemapValue);
    if (!robotsSitemapUrl.pathname.endsWith('/sitemap.xml') && !robotsSitemapUrl.pathname.endsWith('/sitemap-index.xml')) {
      failures.push(`robots.txt Sitemap URL must point to sitemap.xml or sitemap-index.xml: ${sitemapValue}`);
    }
  }
} catch {
  // Missing file is already reported above.
}

const sitemapIndexPath = path.join(root, 'sitemap-index.xml');
const directSitemapPath = path.join(root, 'sitemap.xml');
const sitemapPaths = [];
try {
  if ((await stat(sitemapIndexPath)).isFile()) sitemapPaths.push(sitemapIndexPath);
} catch {}
try {
  if (sitemapPaths.length === 0 && (await stat(directSitemapPath)).isFile()) sitemapPaths.push(directSitemapPath);
} catch {}
if (sitemapPaths.length === 0) {
  failures.push('Missing generated sitemap.xml or sitemap-index.xml');
}

const sitemapFilesToValidate = [];
for (const sitemapPath of sitemapPaths) {
  try {
    const sitemapContent = await readFile(sitemapPath, 'utf8');
    if (sitemapContent.includes('<sitemapindex') && sitemapContent.includes('</sitemapindex>')) {
      const childLocations = [...sitemapContent.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)];
      if (childLocations.length === 0) failures.push('sitemap-index.xml contains no child sitemap locations.');
      for (const [, location] of childLocations) {
        const childUrlValue = decodeXml(location.trim());
        if (!isAbsoluteHttpUrl(childUrlValue)) {
          failures.push(`sitemap-index.xml contains a non-absolute child URL: ${location}`);
          continue;
        }
        let childUrl;
        try { childUrl = new URL(childUrlValue); } catch {
          failures.push(`sitemap-index.xml contains an invalid child URL: ${location}`);
          continue;
        }
        if (childUrl.origin !== new URL(robotsSitemapUrl ?? childUrl).origin) {
          failures.push(`sitemap-index.xml child origin does not match robots.txt Sitemap origin: ${childUrlValue}`);
        }
        const childPath = path.resolve(root, `.${decodeURIComponent(childUrl.pathname)}`);
        if (!childPath.startsWith(root + path.sep)) {
          failures.push(`sitemap-index.xml child path escapes build output: ${childUrlValue}`);
          continue;
        }
        try {
          if (!(await stat(childPath)).isFile()) {
            failures.push(`sitemap-index.xml references a missing child sitemap: ${childUrlValue}`);
          } else {
            sitemapFilesToValidate.push({ path: childPath, url: childUrlValue });
          }
        } catch {
          failures.push(`sitemap-index.xml references a missing child sitemap: ${childUrlValue}`);
        }
      }
    } else if (sitemapContent.includes('<urlset') && sitemapContent.includes('</urlset>')) {
      sitemapFilesToValidate.push({ path: sitemapPath, url: null });
    } else {
      failures.push(`${path.basename(sitemapPath)} has an invalid sitemap envelope.`);
    }
  } catch (error) {
    failures.push(`Could not read ${path.basename(sitemapPath)}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const seenLocations = new Set();
const sitemapOrigins = new Set();
for (const sitemapFile of sitemapFilesToValidate) {
  try {
    const sitemap = await readFile(sitemapFile.path, 'utf8');
    if (!sitemap.includes('<urlset') || !sitemap.includes('</urlset>')) {
      failures.push(`${path.basename(sitemapFile.path)} has an invalid urlset envelope.`);
      continue;
    }
    const locations = [...sitemap.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)];
    if (locations.length === 0) failures.push(`${path.basename(sitemapFile.path)} contains no <loc> entries.`);
    for (const [, location] of locations) {
      const decodedLocation = decodeXml(location.trim());
      if (!isAbsoluteHttpUrl(decodedLocation)) {
        failures.push(`${path.basename(sitemapFile.path)} contains a non-absolute URL: ${location}`);
        continue;
      }
      let sitemapUrl;
      try { sitemapUrl = new URL(decodedLocation); } catch {
        failures.push(`${path.basename(sitemapFile.path)} contains an invalid URL: ${location}`);
        continue;
      }
      if (seenLocations.has(sitemapUrl.href)) failures.push(`Sitemap contains a duplicate URL: ${sitemapUrl.href}`);
      seenLocations.add(sitemapUrl.href);
      sitemapOrigins.add(sitemapUrl.origin);
      if (canonicalUrls.size > 0 && !canonicalUrls.has(sitemapUrl.href)) {
        failures.push(`Sitemap URL has no matching indexable page canonical: ${sitemapUrl.href}`);
      }
    }
  } catch (error) {
    failures.push(`Could not read sitemap file ${path.basename(sitemapFile.path)}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
if (sitemapOrigins.size > 1) failures.push('Sitemap URLs must all use the same origin.');
if (robotsSitemapUrl && sitemapOrigins.size === 1 && robotsSitemapUrl.origin !== [...sitemapOrigins][0]) {
  failures.push('robots.txt Sitemap URL origin does not match sitemap URL origin.');
}
if (robotsSitemapUrl && canonicalUrls.size > 0) {
  const canonicalOrigins = new Set([...canonicalUrls].map((url) => new URL(url).origin));
  if (canonicalOrigins.size === 1 && robotsSitemapUrl.origin !== [...canonicalOrigins][0]) {
    failures.push('robots.txt Sitemap URL origin does not match the indexable page canonical origin.');
  }
}
if (sitemapOrigins.size === 1 && canonicalUrls.size > 0) {
  const canonicalOrigins = new Set([...canonicalUrls].map((url) => new URL(url).origin));
  if (canonicalOrigins.size === 1 && !canonicalOrigins.has([...sitemapOrigins][0])) {
    failures.push('Sitemap origin does not match the indexable page canonical origin.');
  }
}

// Build produksi tidak boleh memakai origin placeholder (fallback konfigurasi: http://konsultan-slf.lan).
// Kegagalan ini senyap karena semua pemeriksaan lain hanya menguji konsistensi origin, bukan kebenarannya.
if (process.env.VERCEL_ENV === 'production' || process.env.REQUIRE_PUBLIC_SITE_URL === '1') {
  const placeholderHosts = new Set();
  for (const url of [...canonicalUrls, ...(robotsSitemapUrl ? [robotsSitemapUrl.href] : [])]) {
    const { hostname } = new URL(url);
    if (hostname === 'localhost' || hostname === '127.0.0.1' || /\.(lan|local|localhost|invalid|test|example)$/i.test(hostname)) placeholderHosts.add(hostname);
  }
  if (placeholderHosts.size > 0) {
    failures.push(`Production build uses a placeholder site origin (${[...placeholderHosts].join(', ')}). Set SITE_URL to the public URL (or expose VERCEL_PROJECT_PRODUCTION_URL) before deploying.`);
  }
}

if (failures.length) {
  console.error(`SEO output check failed: ${failures.length} issue(s) across ${pagesChecked} HTML pages.\n`);
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`SEO output check passed: ${pagesChecked} HTML pages, ${jsonLdChecked} valid JSON-LD blocks, ${socialImagesChecked} local social images, ${rasterFallbackChecked ? 'WebP and SVG social fallbacks' : 'social fallback validation incomplete'}, robots.txt, and sitemap XML/index.`);
}

function validateJsonLd(data, page, failures) {
  const objects = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;
    objects.push(value);
    if (Array.isArray(value['@graph'])) value['@graph'].forEach(visit);
  };
  visit(data);
  if (objects.length === 0) {
    failures.push(`${page}: JSON-LD must contain an object or array of objects`);
    return;
  }

  for (const item of objects) {
    // Skip container objects that only have @context/@graph (structural wrappers)
    const keys = Object.keys(item).filter((k) => !k.startsWith('@'));
    if (keys.length === 0) continue;

    const typeValue = item['@type'];
    const types = Array.isArray(typeValue) ? typeValue : [typeValue];
    if (!types.some((type) => typeof type === 'string')) {
      failures.push(`${page}: JSON-LD object is missing a valid @type`);
      continue;
    }
    if (types.some((type) => ['Article', 'BlogPosting', 'TechArticle', 'NewsArticle'].includes(type))) {
      for (const key of ['headline', 'datePublished', 'mainEntityOfPage', 'url']) {
        if (!item[key]) failures.push(`${page}: Article JSON-LD is missing required field "${key}"`);
      }
      if (item.datePublished && !Number.isFinite(Date.parse(item.datePublished))) {
        failures.push(`${page}: Article JSON-LD has an invalid datePublished value`);
      }
      if (item.dateModified && !Number.isFinite(Date.parse(item.dateModified))) {
        failures.push(`${page}: Article JSON-LD has an invalid dateModified value`);
      }
      if (item.url && !isAbsoluteHttpUrl(item.url)) {
        failures.push(`${page}: Article JSON-LD url must be an absolute HTTP(S) URL`);
      }
    }
    if (types.includes('Service')) {
      for (const key of ['name', 'url', 'provider']) {
        if (!item[key]) failures.push(`${page}: Service JSON-LD is missing required field "${key}"`);
      }
      if (item.url && !isAbsoluteHttpUrl(item.url)) {
        failures.push(`${page}: Service JSON-LD url must be an absolute HTTP(S) URL`);
      }
    }
    // LocalBusiness dan subkelasnya (mis. ProfessionalService) — fitur "Bisnis lokal".
    const isLocalBusiness = types.some(
      (type) => typeof type === 'string' && (type === 'LocalBusiness' || type === 'ProfessionalService'),
    );
    if (isLocalBusiness) {
      for (const key of ['name', 'telephone', 'address']) {
        if (!item[key]) failures.push(`${page}: LocalBusiness JSON-LD is missing required field "${key}"`);
      }
      const address = item.address;
      if (!address || typeof address !== 'object' || !address.streetAddress || !address.addressLocality ||
          !address.addressCountry) {
        failures.push(`${page}: LocalBusiness JSON-LD address must contain streetAddress, addressLocality, and addressCountry`);
      }
      if (item.url && !isAbsoluteHttpUrl(item.url)) {
        failures.push(`${page}: LocalBusiness JSON-LD url must be an absolute HTTP(S) URL`);
      }
    }
    if (types.includes('FAQPage')) {
      if (!Array.isArray(item.mainEntity) || item.mainEntity.length === 0) {
        failures.push(page + ': FAQPage JSON-LD must contain at least one Question in mainEntity');
      } else {
        for (const [index, question] of item.mainEntity.entries()) {
          if (!question || question['@type'] !== 'Question' || !question.name ||
              !question.acceptedAnswer || question.acceptedAnswer['@type'] !== 'Answer' ||
              !question.acceptedAnswer.text) {
            failures.push(page + ': FAQPage question ' + (index + 1) + ' must contain a name and acceptedAnswer.text');
          }
        }
      }
    }
    if (types.includes('HowTo')) {
      if (!Array.isArray(item.step) || item.step.length < 2) {
        failures.push(page + ': HowTo JSON-LD must contain at least two steps');
      } else {
        for (const [index, step] of item.step.entries()) {
          if (!step || step['@type'] !== 'HowToStep' || !step.name || !step.text) {
            failures.push(page + ': HowTo step ' + (index + 1) + ' must contain name and text');
          }
        }
      }
    }
    if (types.includes('BreadcrumbList')) {
      if (!Array.isArray(item.itemListElement) || item.itemListElement.length === 0) {
        failures.push(`${page}: BreadcrumbList JSON-LD must contain itemListElement`);
      } else {
        for (const [index, entry] of item.itemListElement.entries()) {
          if (!entry || typeof entry !== 'object' || !entry.name || !entry.item) {
            failures.push(`${page}: BreadcrumbList item ${index + 1} must contain name and item`);
          } else if (!isAbsoluteHttpUrl(typeof entry.item === 'string' ? entry.item : entry.item['@id'])) {
            failures.push(`${page}: BreadcrumbList item ${index + 1} must use an absolute HTTP(S) URL`);
          }
        }
      }
    }
  }
}

function findMeta(html, key, value) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = tags.find((candidate) => getAttr(candidate, key)?.toLowerCase() === value.toLowerCase());
  return tag ? decodeHtmlEntities(getAttr(tag, 'content')) : null;
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function getAttr(tag, name) {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2] ?? null;
}

function isAbsoluteHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function decodeXml(value) {
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await walk(fullPath));
    else if (entry.isFile()) found.push(fullPath);
  }
  return found;
}
