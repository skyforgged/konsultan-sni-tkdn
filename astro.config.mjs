import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
const site = process.env.SITE_URL;
export default defineConfig({
  site,
  integrations: site ? [sitemap({
    filter: (page) => {
      const pathname = new URL(page).pathname.replace(/\\/+$/, '') || '/';
      return pathname !== '/komponen' && pathname !== '/404' && !pathname.endsWith('/404.html');
    },
  })] : [],
});
