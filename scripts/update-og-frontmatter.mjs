import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_ROOT = path.resolve(__dirname, '../src/content');
const collections = ['articles', 'guides', 'services', 'pages'];

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function updateFrontmatter() {
  for (const collection of collections) {
    const colPath = path.join(CONTENT_ROOT, collection);
    try {
      const files = await readdir(colPath);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const filePath = path.join(colPath, file);
        let content = await readFile(filePath, 'utf-8');
        const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
        if (!fmMatch) continue;
        const frontmatter = fmMatch[1];
        const slugMatch = frontmatter.match(/^slug:\s*["']?(.+?)["']?\s*$/m);
        if (!slugMatch) continue;
        const slug = slugMatch[1].replace(/^["']|["']$/g, '');
        
        // Generate the new OG image path
        const ogImage = `/images/og-${slug}.webp`;
        
        // Replace socialImage and add/update image field
        let newFm = frontmatter
          .replace(/^socialImage:.*$/m, `socialImage: "${ogImage}"`)
          .replace(/^image:.*$/m, `image: "${ogImage}"`);
        
        // If image field doesn't exist, add it after socialImage
        if (!/^image:/m.test(newFm)) {
          newFm = newFm.replace(/^socialImage:.*$/m, `socialImage: "${ogImage}"\nimage: "${ogImage}"`);
        }
        
        const newContent = content.replace(frontmatter, newFm);
        await writeFile(filePath, newContent);
        console.log(`Updated ${collection}/${slug} -> ${ogImage}`);
      }
    } catch (e) {
      console.warn(`Collection ${collection} not found or empty`);
    }
  }
  console.log('All frontmatter updated with unique OG images.');
}

updateFrontmatter().catch(console.error);