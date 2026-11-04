import { expect, type Page } from '@playwright/test';
import { accessible, fitsWidth, focusByKeyboard, hydrated, ring, test } from './support';

const exitName = 'Quick exit to a neutral website';
const exitLink = (page: Page) => page.getByRole('banner').getByRole('link', { name: exitName, exact: true, includeHidden: true });

type Visit = { referer: string | undefined; hidden: boolean | null };

// Stands in for the neutral site, so no run contacts the real host. For every request it records the Referer header and
// whether the ORAN page was already hidden while the request was held (null without JavaScript, where nothing can hide it).
//
// The hidden state cannot be read with page.evaluate here: while a navigation request is held in a route handler, Chromium
// answers no evaluate, CDP session or screenshot call for that page until the navigation commits, so the read deadlocks
// against the fulfilment it precedes. The page reports instead. An init script watches the `hidden` attribute and calls a
// binding, which is a one-way message that is still delivered. The handler holds the response until that report arrives
// (or two seconds pass), so a page that is hidden only after weather.gov answers is recorded as not hidden.
async function neutralSite(page: Page, scripted: boolean): Promise<Visit[]> {
  const visits: Visit[] = [];
  let reported = false;
  let wake: (() => void) | undefined;
  if (scripted) {
    await page.exposeFunction('oranBodyHidden', () => {
      reported = true;
      wake?.();
    });
    await page.addInitScript(() => {
      new MutationObserver(() => {
        if (document.body?.hidden) (window as unknown as { oranBodyHidden(): void }).oranBodyHidden();
      }).observe(document, { attributes: true, subtree: true, attributeFilter: ['hidden'] });
    });
  }
  await page.route(/^https:\/\/www\.weather\.gov\//, async (route) => {
    if (scripted && !reported) await new Promise<void>((resolve) => { wake = resolve; setTimeout(resolve, 2000); });
    visits.push({ referer: route.request().headers()['referer'], hidden: scripted ? reported : null });
    reported = false;
    wake = undefined;
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Weather</title><h1>Neutral page</h1>' });
  });
  return visits;
}

let visits: Visit[] = [];
test.beforeEach(async ({ page, javaScriptEnabled }) => {
  visits = await neutralSite(page, javaScriptEnabled);
});

test('Exit is a 44px neutral link on the right of the top bar on Safety results', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/dev/components');
  const exit = exitLink(page);
  await expect(exit).toBeVisible();
  await expect(exit).toHaveText('Exit');
  await expect(exit).toHaveAttribute('href', 'https://www.weather.gov');
  await expect(exit).toHaveAttribute('rel', /noreferrer/);
  await expect(exit).toHaveCSS('background-color', 'rgb(235, 238, 241)');
  await expect(exit).toHaveCSS('color', 'rgb(28, 39, 51)');
  await expect(exit).toHaveCSS('font-size', '14px');
  await expect(exit).toHaveCSS('font-weight', '700');
  await expect(exit).toHaveCSS('border-radius', '12px');
  await expect(exit).toHaveCSS('text-decoration-line', 'none');

  const box = await exit.boundingBox();
  const brand = await page.getByRole('banner').getByRole('link', { name: 'ORAN Open Resource Access Network', exact: true }).boundingBox();
  const nav = await page.getByRole('navigation', { name: 'Main navigation', exact: true }).boundingBox();
  if (!box || !brand || !nav) throw new Error('The brand link, Exit link or navigation has no box.');
  expect(box.width, 'Exit width').toBeGreaterThanOrEqual(44);
  expect(box.height, 'Exit height').toBeGreaterThanOrEqual(44);
  expect(box.x, 'Exit is right of the brand').toBeGreaterThanOrEqual(brand.x + brand.width);
  expect(box.y + box.height, 'Exit is above the navigation').toBeLessThanOrEqual(nav.y);

  await focusByKeyboard(page, exit);
  expect(await ring(exit), 'focus ring').toEqual({ style: 'solid', width: '3px', color: 'rgb(23, 89, 107)', offset: '2px' });

  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await accessible(page);
  }

  await page.setViewportSize({ width: 320, height: 800 });
  expect(await fitsWidth(page), 'fits 320px').toBe(true);
  await expect(exit).toBeInViewport();

  // ADR-0007: crisis help never appears in a top bar.
  await expect(page.getByRole('banner').getByText('Get help now')).toHaveCount(0);

  // Pages that are not Safety results carry the link in the markup but hide it.
  await page.goto('/sign-in');
  await expect(exit).toHaveCount(1);
  await expect(exit).toBeHidden();
});

test('Exit keeps its edge under forced colors and does not animate with reduced motion', async ({ page }) => {
  await page.goto('/dev/components');
  const exit = exitLink(page);
  await expect(exit).toBeVisible();
  expect(await exit.evaluate((element) => getComputedStyle(element).transitionDuration)).toContain('0.12s');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await exit.evaluate((element) => getComputedStyle(element).transitionDuration)).toMatch(/^0s(, 0s)*$/);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.emulateMedia({ forcedColors: 'active' });
  await expect(exit).toHaveCSS('border-top-style', 'solid');
  await expect(exit).toHaveCSS('border-top-width', '1px');
  expect(await exit.evaluate((element) => getComputedStyle(element).borderTopColor), 'border color under forced colors').not.toBe('rgba(0, 0, 0, 0)');
});

test('Exit names the neutral site in English and Spanish and keeps its visible word in its name', async ({ page }) => {
  await page.goto('/dev/components');
  const exit = exitLink(page);
  await expect(exit).toHaveText('Exit');
  expect(exitName.toLowerCase()).toContain((await exit.innerText()).toLowerCase());

  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('es');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Idioma', exact: true })).toBeVisible();

  await page.goto('/dev/components');
  const salir = page.getByRole('banner').getByRole('link', { name: 'Salir rápido a un sitio web neutral', exact: true });
  await expect(salir).toHaveText('Salir');
  expect('Salir rápido a un sitio web neutral'.toLowerCase()).toContain((await salir.innerText()).toLowerCase());

  await page.setViewportSize({ width: 320, height: 800 });
  expect(await fitsWidth(page), 'fits 320px in Spanish').toBe(true);
  await expect(salir).toBeInViewport();
});

test('clicking Exit replaces the page and hides it at once', async ({ page }) => {
  await page.goto('/sign-in');
  await page.goto('/dev/components');
  const exit = exitLink(page);
  await hydrated(exit);
  await exit.click();
  await page.waitForURL('https://www.weather.gov/');
  expect(visits).toEqual([{ referer: undefined, hidden: true }]);

  // location.replace puts no entry in the history, so Back skips the catalog and returns to the page before it.
  await page.goBack();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('Exit is a plain link to the neutral site', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(exitLink(page)).toBeHidden();

    await page.goto('/dev/components');
    const exit = exitLink(page);
    await expect(exit).toBeVisible();
    await exit.click();
    await page.waitForURL('https://www.weather.gov/');
    expect(visits).toHaveLength(1);
    expect(visits[0].referer).toBeUndefined();
  });
});
