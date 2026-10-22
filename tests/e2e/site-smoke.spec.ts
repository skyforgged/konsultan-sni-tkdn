import { test, expect } from '@playwright/test';

const coreRoutes = [
  '/',
  '/layanan/',
  '/artikel/',
  '/panduan/',
  '/faq/',
  '/kontak/',
  '/tentang-kami/',
];

test('halaman utama dan halaman inti merespons serta memiliki struktur dasar yang sehat', async ({ page }) => {
  for (const route of coreRoutes) {
    const response = await page.goto(route);
    expect(response, route + ' should return a response').not.toBeNull();
    expect(response!.status(), route + ' status').toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page).toHaveTitle(/\S+/);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.trim().length ?? 0, route + ' description length').toBeGreaterThanOrEqual(20);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('a.skip-link')).toHaveAttribute('href', '#konten');
    const missingAlt = await page.locator('img:not([alt])').count();
    expect(missingAlt, route + ' images missing alt attributes').toBe(0);
  }
});

test('navigasi utama dapat membuka daftar layanan', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Jelajahi layanan/i }).click();
  await expect(page).toHaveURL(/\/layanan\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /Konsultan SNI/i }).first()).toBeVisible();
});

test('menu mobile dapat dibuka dan tautannya terlihat', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.locator('.mobile-menu');
  await expect(menu).toBeVisible();
  await menu.locator('summary').click();
  await expect(menu.locator('nav')).toBeVisible();
  await expect(menu.locator('nav').getByRole('link', { name: /Kontak/i })).toBeVisible();
});

test('halaman tidak ditemukan menampilkan status 404 dan noindex', async ({ page }) => {
  const response = await page.goto('/__playwright-route-that-does-not-exist__/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: /Halaman tidak ditemukan/i })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('katalog komponen merender seluruh komponen reusable dan menggunakan layout TKDN', async ({ page }) => {
  const response = await page.goto('/komponen/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: /Katalog Komponen Reusable/i })).toBeVisible();
  await expect(page.locator('.tkdn-block')).toHaveCount(26);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('.tkdn-site-header')).toBeVisible();
  await expect(page.locator('.tkdn-site-footer')).toBeVisible();
});

test('halaman artikel menggunakan blok komponen, bukan renderer Markdown langsung', async ({ page }) => {
  await page.goto('/artikel/');
  const firstArticle = page.locator('.article-card').first();
  if (await firstArticle.count()) {
    await firstArticle.click();
    await expect(page.locator('.component-article-content .tkdn-block').first()).toBeVisible();
    await expect(page.locator('.component-article-content')).not.toContainText(/^#{1,6}\s/m);
  }
});
