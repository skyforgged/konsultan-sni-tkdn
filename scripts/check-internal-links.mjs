import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const errors = [];
let checked = 0;

try {
  await stat(root);
} catch {
  console.error('Internal link check failed: build output directory "dist" does not exist. Run the Astro build first.');
  process.exit(1);
}

const htmlFiles = await walk(root);
const pages = htmlFiles.filter((item) => item.endsWith('.html'));

for (const file of pages) {
  const html = await readFile(file, 'utf8');
  const idMatches = [...html.matchAll(/\bid=(["'])([^"'<>]+)\1/gi)];
  const pageIds = new Set();
  const duplicateIds = new Set();
  for (const idMatch of idMatches) {
    const id = decodeHtmlAttribute(idMatch[2]);
    if (pageIds.has(id)) duplicateIds.add(id);
    pageIds.add(id);
  }
  for (const id of duplicateIds) errors.push(relative(file) + ': duplicate HTML id "' + id + '"');
  const references = [...html.matchAll(/\b(href|src|poster)=(["'])([^"'<>]+)\2/gi)];

  for (const match of references) {
    const attribute = match[1].toLowerCase();
    const value = decodeHtmlAttribute(match[3].trim());
    if (!value) continue;
    const schemeProbe = value.replace(/[\u0000-\u0020]/g, '');
    if (/^(?:javascript|vbscript):/i.test(schemeProbe)) {
      errors.push(`${relative(file)}: unsafe URL scheme in ${attribute}="${value}"`);
      continue;
    }
    if (/^(?:https?:|mailto:|tel:|data:|blob:|\/\/)/i.test(value)) continue;

    let parsed;
    let pathname;
    let fragment;
    try {
      parsed = new URL(value, `https://internal-link-check.invalid/${relative(file)}`);
      pathname = decodeURIComponent(parsed.pathname);
      fragment = parsed.hash ? decodeURIComponent(parsed.hash.slice(1)) : '';
    } catch {
      errors.push(`${relative(file)}: invalid URL "${value}"`);
      continue;
    }

    if (attribute === 'href' && fragment && (pathname === `/${relative(file)}` || value.startsWith('#') || value.startsWith('?'))) {
      checked++;
      if (!pageIds.has(fragment)) errors.push(`${relative(file)}: missing fragment "#${fragment}"`);
      continue;
    }
    if (!pathname.startsWith('/')) continue;

    const target = path.resolve(root, `.${pathname}`);
    if (!target.startsWith(root + path.sep) && target !== root) {
      errors.push(`${relative(file)}: path escapes output directory "${value}"`);
      continue;
    }

    const candidates = pathname.endsWith('/')
      ? [path.join(target, 'index.html')]
      : [target, path.join(target, 'index.html')];

    let exists = false;
    for (const candidate of candidates) {
      try {
        if ((await stat(candidate)).isFile()) {
          exists = true;
          break;
        }
      } catch {
        // Try the next valid static-output mapping.
      }
    }

    checked++;
    if (!exists) {
      errors.push(`${relative(file)}: missing local target "${value}"`);
    } else if (attribute === 'href' && fragment) {
      const htmlTarget = pathname.endsWith('/') ? path.join(target, 'index.html') : (await stat(target)).isFile() ? target : path.join(target, 'index.html');
      const targetHtml = await readFile(htmlTarget, 'utf8');
      const targetIds = new Set([...targetHtml.matchAll(/\bid=(["'])([^"'<>]+)\1/gi)].map((item) => decodeHtmlAttribute(item[2])));
      checked++;
      if (!targetIds.has(fragment)) errors.push(`${relative(file)}: missing fragment "${value}"`);
    }
  }
}

if (errors.length) {
  console.error(`Internal link check failed: ${errors.length} issue(s) across ${checked} local references.\n`);
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Internal link check passed: ${checked} local references checked across ${pages.length} HTML pages.`);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function decodeHtmlAttribute(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
