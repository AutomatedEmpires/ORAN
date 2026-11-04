import { expect, type Locator } from '@playwright/test';
import { catalogAllowed } from '../../src/app/dev/guard';
import { buttonClassName } from '../../src/ui/button';
import { accessible, documentedColors, fitsWidth, focusByKeyboard, ring, test } from './support';

test('catalog guard admits only the local launcher on loopback', () => {
  const local = { ORAN_LOCAL_DEV: '1', ORAN_ENV: 'development', NODE_ENV: 'development', DATABASE_URL: 'postgresql://oran@127.0.0.1:5432/oran' };
  for (const host of ['127.0.0.1:3100', 'localhost:3000', '[::1]:3100', 'LOCALHOST:3000']) expect(catalogAllowed(local, host), host).toBe(true);

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

  // `evil@127.0.0.1` parses to the loopback hostname, so only the host-shape check refuses it; `localhost:` and the
  // out-of-range port are refused by that check or by URL parsing, and 127.0.0.2 is loopback but not the launcher's address.
  for (const host of ['oran.example', 'oran.example:3100', '127.0.0.1.evil.example', 'localhost.evil.example', 'evil@127.0.0.1', '127.0.0.2', 'localhost:99999', 'localhost:', '', null]) {
    expect(catalogAllowed(local, host), String(host)).toBe(false);
  }
});

test('catalog renders tokens and base styles accessibly at every width', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const response = await page.goto('/dev/components');
  expect(response?.status()).toBe(200);

  await expect(page.getByRole('heading', { level: 1, name: 'Component catalog', exact: true })).toBeVisible();
  for (const name of ['Color tokens', 'Typography', 'Buttons', 'Form controls', 'Surfaces']) {
    await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible();
  }
  // The page is kept out of search indexes whenever it is served.
  expect(await page.evaluate(() => document.querySelector('meta[name="robots"]')?.getAttribute('content'))).toMatch(/noindex/);

  // One swatch per approved color, in the order DESIGN_SYSTEM.md §3.1 lists them.
  // role="list" keeps the list semantics that Safari and VoiceOver drop from a list styled with list-style:none.
  const swatches = page.getByRole('list', { name: 'Color tokens', exact: true });
  await expect(swatches).toHaveAttribute('role', 'list');
  await expect(swatches.getByRole('listitem')).toHaveText([...documentedColors().keys()]);

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
  expect(forced.color, 'border color under forced colors').not.toBe('rgba(0, 0, 0, 0)');
  expect(forced.color, 'border color under forced colors').not.toBe(normal.color);
});

test('buttonClassName composes variant and size classes', () => {
  expect(buttonClassName()).toBe('button');
  expect(buttonClassName('secondary', 'compact')).toBe('button button-secondary button-compact');
  expect(buttonClassName('destructive-confirm', 'large')).toBe('button button-destructive-confirm button-large');
});

const variants = [
  ['Primary', 'rgb(23, 89, 107)', 'rgb(255, 255, 255)'],
  ['Secondary', 'rgb(226, 238, 240)', 'rgb(23, 89, 107)'],
  ['Quiet', 'rgba(0, 0, 0, 0)', 'rgb(23, 89, 107)'],
  ['Destructive', 'rgba(0, 0, 0, 0)', 'rgb(180, 35, 24)'],
  ['Destructive confirm', 'rgb(180, 35, 24)', 'rgb(255, 255, 255)'],
] as const;

// Resolves once the element's running CSS transitions have finished, so a color read afterwards is not a half-way value.
async function settled(target: Locator): Promise<void> {
  await target.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)).then(() => undefined));
}

test('catalog renders every Button variant, size and state', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/dev/components');
  const button = (name: string) => page.getByRole('button', { name, exact: true });
  const height = async (name: string) => (await button(name).boundingBox())?.height ?? 0;

  for (const [label, background, color] of variants) {
    const base = button(label);
    await expect(base, label).toHaveCSS('background-color', background);
    await expect(base, label).toHaveCSS('color', color);
    for (const name of [label, label + ' large', label + ' compact', label + ' disabled', label + ' busy']) {
      await expect(button(name), name).toHaveCSS('border-radius', '12px');
      await expect(button(name), name).toHaveCSS('font-weight', '700');
      expect(await height(name), name + ' height').toBeGreaterThanOrEqual(44);
    }
    await expect(base).toHaveCSS('font-size', '16px');
    expect(await height(label + ' large'), label + ' large height').toBeGreaterThanOrEqual(48);
    await expect(button(label + ' compact')).toHaveCSS('font-size', '14px');

    // Disabled stays focusable and keeps its look under the pointer: the (0,3,0) rule beats every variant's :hover.
    const disabled = button(label + ' disabled');
    await expect(disabled).toHaveAttribute('aria-disabled', 'true');
    await expect(disabled).not.toHaveAttribute('disabled');
    await disabled.focus();
    await expect(disabled).toBeFocused();
    for (const hovered of [false, true]) {
      if (hovered) await disabled.hover();
      await settled(disabled);
      await expect(disabled, label + ' disabled' + (hovered ? ' hovered' : '')).toHaveCSS('background-color', 'rgb(235, 238, 241)');
      await expect(disabled, label + ' disabled' + (hovered ? ' hovered' : '')).toHaveCSS('color', 'rgb(74, 85, 99)');
    }

    // Busy keeps the variant's own look and the label, and says so to assistive technology.
    const busy = button(label + ' busy');
    await expect(busy).toHaveAttribute('aria-busy', 'true');
    await expect(busy).toHaveAttribute('aria-disabled', 'true');
    await expect(busy).toHaveAccessibleName(label + ' busy');
    await expect(busy).toHaveCSS('background-color', background);
    await expect(busy).toHaveCSS('color', color);
    await expect(busy).toHaveCSS('cursor', 'progress');
    expect(await busy.evaluate((element) => getComputedStyle(element, '::before').animationName), label + ' busy spinner').toBe('button-spin');
  }

  const link = page.getByRole('link', { name: 'Secondary link', exact: true });
  await expect(link).toHaveCSS('background-color', 'rgb(226, 238, 240)');
  expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

  for (const label of ['Primary', 'Destructive confirm']) {
    await focusByKeyboard(page, button(label));
    expect(await ring(button(label)), label + ' focus ring').toEqual({ style: 'solid', width: '3px', color: 'rgb(23, 89, 107)', offset: '2px' });
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [label] of variants) {
    expect(await button(label + ' busy').evaluate((element) => getComputedStyle(element, '::before').animationName), label + ' busy spinner').toBe('none');
  }

  // The header's language and sign-out controls are Buttons too.
  await page.goto('/');
  const apply = button('Apply');
  await expect(apply).toHaveCSS('background-color', 'rgb(226, 238, 240)');
  await expect(apply).toHaveCSS('font-size', '14px');
});

test('busy and disabled buttons stay distinguishable under forced colors', async ({ page }) => {
  await page.goto('/dev/components');
  await page.emulateMedia({ forcedColors: 'active' });
  const read = (name: string) => page.getByRole('button', { name, exact: true }).evaluate((element) => {
    const computed = getComputedStyle(element);
    return { edge: computed.borderTopColor, face: computed.backgroundColor, gap: getComputedStyle(element, '::before').borderInlineEndColor };
  });

  // Forced colors replace the disabled fill and text color with the same system colors an enabled button gets, so the
  // border carries the difference: GrayText, where an enabled button has ButtonText.
  expect((await read('Primary disabled')).edge, 'disabled border').not.toBe((await read('Primary')).edge);
  // The spinner's open side is transparent, which forced colors would replace with a visible color and so close the ring.
  const busy = await read('Primary busy');
  expect(busy.gap, 'spinner gap').not.toBe('rgba(0, 0, 0, 0)');
  expect(busy.gap, 'spinner gap against the button face').toBe(busy.face);
});

// React puts its props on a DOM node when it hydrates the node. Before that, nothing runs the click guard.
async function hydrated(target: Locator): Promise<void> {
  await expect.poll(() => target.evaluate((element) => Object.keys(element).some((key) => key.startsWith('__reactProps$'))), { message: 'React has hydrated the button' }).toBe(true);
}

test('disabled and busy buttons never submit', async ({ page }) => {
  await page.goto('/dev/components');
  for (const name of ['Primary disabled', 'Primary busy']) {
    const target = page.getByRole('button', { name, exact: true });
    await hydrated(target);
    const submitted = page.waitForURL(/submitted=1/, { timeout: 1000 }).then(() => true, () => false);
    await target.focus();
    await page.keyboard.press('Enter');
    // Playwright treats aria-disabled as disabled, so a plain click would wait until it times out.
    await target.click({ force: true });
    expect(await submitted, name + ' submitted the form').toBe(false);
  }

  await page.getByRole('button', { name: 'Primary', exact: true }).click();
  await expect(page).toHaveURL(/submitted=1/);
});

test('the catalog is not linked from the app', async ({ page }) => {
  for (const path of ['/', '/sign-in']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /catalog/i }), path).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link'), path).toHaveCount(5);
  }
});
