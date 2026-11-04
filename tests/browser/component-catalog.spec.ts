import { expect } from '@playwright/test';
import { catalogAllowed } from '../../src/app/dev/guard';
import { accessible, documentedColors, fitsWidth, test } from './support';

test('catalog guard admits only the local launcher on loopback', () => {
  const local = { ORAN_LOCAL_DEV: '1', ORAN_ENV: 'development', NODE_ENV: 'development', DATABASE_URL: 'postgresql://oran@127.0.0.1:5432/oran' };
  for (const host of ['127.0.0.1:3100', 'localhost:3000', '[::1]:3100']) expect(catalogAllowed(local, host), host).toBe(true);

  const denied = [
    { ...local, NODE_ENV: 'production' },
    { ...local, VERCEL: '1' },
    { ...local, ORAN_ENV: 'preview' },
    { ...local, ORAN_ENV: 'production' },
    { ...local, ORAN_ENV: 'test' },
    { ...local, ORAN_LOCAL_DEV: undefined },
    { ...local, ORAN_LOCAL_DEV: '0' },
    { ...local, DATABASE_URL: 'postgresql://u:p@db.example.com/oran' },
  ];
  for (const env of denied) expect(catalogAllowed(env, '127.0.0.1:3100'), JSON.stringify(env)).toBe(false);

  for (const host of ['oran.example', 'oran.example:3100', '127.0.0.1.evil.example', 'localhost.evil.example', '', null]) {
    expect(catalogAllowed(local, host), String(host)).toBe(false);
  }
});

test('catalog renders tokens and base styles accessibly at every width', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const response = await page.goto('/dev/components');
  expect(response?.status()).toBe(200);

  await expect(page.getByRole('heading', { level: 1, name: 'Component catalog', exact: true })).toBeVisible();
  for (const name of ['Color tokens', 'Typography', 'Form controls', 'Surfaces']) {
    await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible();
  }
  // The page is kept out of search indexes whenever it is served.
  expect(await page.evaluate(() => document.querySelector('meta[name="robots"]')?.getAttribute('content'))).toMatch(/noindex/);

  // One swatch per approved color, in the order DESIGN_SYSTEM.md §3.1 lists them.
  await expect(page.getByRole('list', { name: 'Color tokens', exact: true }).getByRole('listitem')).toHaveText([...documentedColors().keys()]);

  const website = page.getByRole('textbox', { name: 'Website', exact: true });
  await expect(website).toHaveAttribute('aria-invalid', 'true');
  await expect(website).toHaveAccessibleDescription('Enter a full web address that starts with https://');
  await expect(website).toHaveCSS('border-top-color', 'rgb(180, 35, 24)');
  await expect(page.getByRole('textbox', { name: 'ZIP code', exact: true })).toHaveAccessibleDescription('Five digits');
  await expect(page.getByRole('textbox', { name: 'Organization name', exact: true })).toHaveCSS('background-color', 'rgb(242, 244, 245)');

  const size = page.getByText('Size xl: 24px/30px', { exact: true });
  await expect(size).toHaveCSS('font-size', '24px');
  await expect(size).toHaveCSS('line-height', '30px');

  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await accessible(page);
  }

  // The long unbroken card name and address must wrap inside the card instead of widening the page.
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(page.getByRole('heading', { level: 3, name: /^Syntheticresourceresource/ })).toBeVisible();
  expect(await fitsWidth(page)).toBe(true);
});

test('cards keep visible boundaries under forced colors', async ({ page }) => {
  await page.goto('/dev/components');
  const card = page.getByRole('article', { name: 'Synthetic food pantry', exact: true });
  await expect(card).toBeVisible();
  const edges = () => card.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { shadow: computed.boxShadow, style: computed.borderTopStyle, width: computed.borderTopWidth, color: computed.borderTopColor };
  });

  const normal = await edges();
  expect(normal.shadow, 'shadow').not.toBe('none');
  expect(normal).toMatchObject({ style: 'solid', width: '1px' });

  // Forced colors compute the shadow to none, so the 1px border is the card's only edge there. The author's transparent
  // border color is replaced by a system color, which makes that edge visible.
  await page.emulateMedia({ forcedColors: 'active' });
  const forced = await edges();
  expect(forced).toMatchObject({ style: 'solid', width: '1px' });
  expect(forced.color, 'border color under forced colors').not.toBe(normal.color);
});

test('the catalog is not linked from the app', async ({ page }) => {
  for (const path of ['/', '/sign-in']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /catalog/i }), path).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link'), path).toHaveCount(5);
  }
});
