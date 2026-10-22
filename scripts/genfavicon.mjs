import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const svg = await readFile('public/favicon.svg');

const sizes = [16, 24, 32, 48, 64];
const pngs = [];
for (const s of sizes) {
  const buf = await sharp(svg, { density: 300 }).resize(s, s).png().toBuffer();
  pngs.push(buf);
}

const ico = await pngToIco(pngs);
await writeFile('public/favicon.ico', ico);

const apple = await sharp(svg, { density: 300 }).resize(180, 180).png().toBuffer();
await writeFile('public/apple-touch-icon.png', apple);

console.log('generated favicon.ico and apple-touch-icon.png');
