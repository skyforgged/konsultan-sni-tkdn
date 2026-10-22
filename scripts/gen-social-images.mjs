import { mkdir, access } from 'node:fs/promises';
import sharp from 'sharp';

const source = 'public/images/og-default.svg';
const target = 'public/images/og-default.webp';
await access(source);
await mkdir('public/images', { recursive: true });
await sharp(source, { density: 144 })
  .resize(1200, 630, { fit: 'contain', background: '#f4f7f5' })
  .webp({ quality: 88 })
  .toFile(target);
console.log('Social image generated: ' + target + ' (1200×630 WebP)');
