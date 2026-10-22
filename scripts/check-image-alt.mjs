// Memastikan setiap <img> pada output dist punya atribut alt dan src yang wajar.
// Kasus yang dicegah:
//   1. <img> tanpa atribut alt sama sekali — pembaca layar kehilangan teks alternatif.
//   2. src berisi markup (mis. SVG mentah) sehingga tag HTML rusak dan atribut
//      setelahnya, termasuk alt, tidak terbaca parser.
// Catatan: alt="" DIIZINKAN; itu cara standar (WCAG) menandai gambar dekoratif.
// Yang dilarang adalah atribut alt yang hilang sepenuhnya.
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const distRoot = path.resolve('dist');
const errors = [];
let imagesChecked = 0;
let decorativeCount = 0;

try {
  await stat(distRoot);
} catch {
  console.error('Image alt check failed: build output directory "dist" does not exist. Run the Astro build first.');
  process.exit(1);
}

async function htmlFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_astro' || entry.name === 'images') continue;
      files.push(...await htmlFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(entryPath);
    }
  }
  return files;
}

// Mengambil tag <img ...> secara utuh dengan menghormati tanda kutip, sehingga
// nilai atribut yang memuat ">" tidak memotong tag lebih awal.
function imgTags(html) {
  const tags = [];
  let cursor = 0;
  while ((cursor = html.indexOf('<img', cursor)) !== -1) {
    let end = cursor + 4;
    let quote = null;
    for (; end < html.length; end++) {
      const char = html[end];
      if (quote) {
        if (char === quote) quote = null;
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '>') {
        break;
      }
    }
    tags.push(html.slice(cursor, end + 1));
    cursor = end + 1;
  }
  return tags;
}

function attribute(tag, name) {
  const match = tag.match(new RegExp('\\s' + name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))'));
  if (!match) return null;
  return match[2] ?? match[3] ?? match[4] ?? '';
}

const summarize = (tag) => (tag.length > 120 ? tag.slice(0, 117) + '...' : tag);
const relative = (file) => path.relative(distRoot, file).split(path.sep).join('/');

for (const file of await htmlFiles(distRoot)) {
  const html = await readFile(file, 'utf8');
  for (const tag of imgTags(html)) {
    imagesChecked++;
    const alt = attribute(tag, 'alt');
    const src = attribute(tag, 'src');

    if (alt === null) {
      errors.push(relative(file) + ': <img> without an alt attribute: ' + summarize(tag));
    } else if (alt.trim() === '') {
      decorativeCount++;
    }

    if (src === null || src.trim() === '') {
      errors.push(relative(file) + ': <img> without a usable src attribute: ' + summarize(tag));
    } else if (/[<>]/.test(src)) {
      errors.push(
        relative(file) + ': <img> src contains markup instead of a URL/path, which breaks the HTML ' +
        '(and hides later attributes such as alt): ' + summarize(tag),
      );
    }
  }
}

if (errors.length) {
  console.error('Image alt check failed: ' + errors.length + ' issue(s) across ' + imagesChecked + ' images.\n');
  console.error(errors.map((error) => '- ' + error).join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    'Image alt check passed: ' + imagesChecked + ' images have an alt attribute' +
    (decorativeCount > 0 ? ' (' + decorativeCount + ' decorative with alt="")' : '') + '.',
  );
}
