import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
const site = process.env.SITE_URL;
export default defineConfig({
  site,
  integrations: site ? [sitemap({
    filter: (page) => !page.includes('/komponen/') && !page.endsWith('/404.html'),
  })] : [],
});
