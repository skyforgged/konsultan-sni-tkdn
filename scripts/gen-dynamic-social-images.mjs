import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_ROOT = path.resolve(__dirname, '../src/content');
const OUTPUT_DIR = path.resolve(__dirname, '../public/images');
const TEMPLATE_SVG = path.resolve(__dirname, '../public/images/og-template.svg');

const collections = ['articles', 'guides', 'services', 'pages'];

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function generateOgImage(title, outputPath) {
  const svgTemplate = await readFile(TEMPLATE_SVG, 'utf-8');
  // Replace placeholder with actual title, wrapping long titles
  const lines = wrapText(title, 40);
  let y = 280;
  const textElements = lines.map(line => {
    const el = `<text x="600" y="${y}" font-family="Manrope, sans-serif" font-size="48" fill="white" font-weight="700" text-anchor="middle">${escapeXml(line)}</text>`;
    y += 60;
    return el;
  }).join('\n');

  const finalSvg = svgTemplate
    .replace('{{TITLE_LINES}}', textElements)
    .replace('{{BRAND}}', 'Konsultan SNI–TKDN');

  await sharp(Buffer.from(finalSvg), { density: 144 })
    .resize(1200, 630, { fit: 'cover', background: '#12372d' })
    .webp({ quality: 90 })
    .toFile(outputPath);
}

function wrapText(text, maxLen) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxLen) {
      lines.push(current.trim());
      current = w;
    } else {
      current = (current + ' ' + w).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 3); // max 3 lines
}

function escapeXml(str) {
  return str.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, '&apos;');
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  // Ensure template exists
  const templateContent = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#12372d"/>
  <circle cx="1050" cy="500" r="200" fill="#d4f078" opacity="0.1"/>
  <circle cx="150" cy="130" r="150" fill="#d4f078" opacity="0.05"/>
  {{TITLE_LINES}}
  <text x="600" y="560" font-family="Manrope, sans-serif" font-size="24" fill="#d4f078" font-weight="600" text-anchor="middle">{{BRAND}}</text>
</svg>`;
  await writeFile(TEMPLATE_SVG, templateContent);

  for (const collection of collections) {
    const colPath = path.join(CONTENT_ROOT, collection);
    try {
      const files = await readdir(colPath);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filePath = path.join(colPath, file);
        const content = await readFile(filePath, 'utf-8');
        const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
        if (!fmMatch) continue;
        const frontmatter = fmMatch[1];
        const titleMatch = frontmatter.match(/^title:\s*["']?(.+?)["']?\s*$/m);
        const slugMatch = frontmatter.match(/^slug:\s*["']?(.+?)["']?\s*$/m);
        if (!titleMatch || !slugMatch) continue;
        const title = titleMatch[1].replace(/^["']|["']$/g, '');
        const slug = slugMatch[1].replace(/^["']|["']$/g, '');
        const outName = `og-${slug}.webp`;
        const outPath = path.join(OUTPUT_DIR, outName);
        console.log(`Generating OG image for ${collection}/${slug}: ${title}`);
        await generateOgImage(title, outPath);
      }
    } catch (e) {
      console.warn(`Collection ${collection} not found or empty`);
    }
  }
  console.log('All dynamic OG images generated.');
}

main().catch(console.error);