import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import { accessible, contrast, documentedColors, documentedTokenNames, enterAs, fitsWidth, focusByKeyboard, normalized, readTokens, resolveAs, ring, test } from './support';

// The non-color values approved in docs/DESIGN_SYSTEM.md §3.3 and §3.4. The colors are read from the document itself.
const blendTokens: Record<string, string> = {
  '--font-family-base': "'Figtree', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  '--font-weight-regular': '400',
  '--font-weight-semibold': '600',
  '--font-weight-bold': '700',
  '--font-weight-heavy': '800',
  '--font-size-xs': '12px',
  '--font-size-sm': '14px',
  '--font-size-md': '16px',
  '--font-size-lg': '18px',
  '--font-size-xl': '24px',
  '--line-height-xs': '16px',
  '--line-height-sm': '20px',
  '--line-height-md': '24px',
  '--line-height-lg': '24px',
  '--line-height-xl': '30px',
  '--space-1': '4px',
  '--space-2': '8px',
  '--space-3': '12px',
  '--space-4': '16px',
  '--space-5': '20px',
  '--space-6': '24px',
  '--space-7': '32px',
  '--space-8': '48px',
  '--size-target': '44px',
  '--size-control-lg': '48px',
  '--size-topbar': '56px',
  '--size-tabbar': '76px',
  '--size-sidenav': '272px',
  '--size-drawer': 'min(316px, 85vw)',
  '--size-chat-column': '760px',
  '--radius-badge': '10px',
  '--radius-control': '12px',
  '--radius-card': '14px',
  '--radius-bubble': '20px',
  '--radius-full': '9999px',
  '--shadow-1': '0 1px 2px rgba(28,39,51,.06), 0 2px 10px rgba(28,39,51,.05)',
  '--shadow-2': '0 4px 14px rgba(28,39,51,.16)',
  '--motion-fast': '120ms',
  '--motion-base': '200ms',
  '--motion-easing': 'cubic-bezier(.2, 0, 0, 1)',
  '--layer-bar': '10',
  '--layer-map-overlay': '20',
  '--layer-sheet': '30',
  '--layer-drawer': '40',
  '--layer-dialog': '50',
  '--layer-toast': '60',
};

// Ruling DS-1: approved values that §3 did not name. The names are recorded in DESIGN_SYSTEM.md §3.3 and §3.4.
const derivedTokens = [
  '--line-height-xs',
  '--line-height-sm',
  '--line-height-md',
  '--line-height-lg',
  '--line-height-xl',
  '--layer-bar',
  '--layer-map-overlay',
  '--layer-sheet',
  '--layer-drawer',
  '--layer-dialog',
  '--layer-toast',
];

// Next's CSS pipeline re-serializes these value types (#FFFFFF as #fff, rgba() as #rrggbbaa, 120ms as .12s),
// so a served value that is spelled differently is compared by what the browser computes from it.
function computedKind(name: string) {
  if (name.startsWith('--color-')) return 'color';
  if (name.startsWith('--shadow-')) return 'boxShadow';
  if (name === '--motion-fast' || name === '--motion-base') return 'transitionDuration';
  return undefined;
}

test('implements every DESIGN_SYSTEM §3 token with its exact value', async ({ page }) => {
  const colors = documentedColors();
  expect(colors.size).toBe(23);
  const expected = new Map([...colors, ...Object.entries(blendTokens)]);
  const documented = documentedTokenNames();

  // Every token the document names is implemented here, and every token implemented here is documented.
  expect([...documented].filter((name) => !expected.has(name))).toEqual([]);
  expect([...expected.keys()].filter((name) => !documented.has(name))).toEqual([]);
  expect(derivedTokens.filter((name) => !documented.has(name))).toEqual([]);
  expect(derivedTokens.filter((name) => !(name in blendTokens))).toEqual([]);

  await page.goto('/');
  const actual = await readTokens(page, expected.keys());
  const mismatches: string[] = [];
  for (const [name, value] of expected) {
    const served = actual.get(name) ?? '';
    if (normalized(served) === normalized(value)) continue;
    const kind = computedKind(name);
    if (kind) {
      const [servedValue, approvedValue] = await resolveAs(page, kind, [served, value]);
      if (approvedValue && servedValue === approvedValue) continue;
    }
    mismatches.push(name + ': expected "' + value + '", found "' + served + '"');
  }
  expect(mismatches).toEqual([]);
});

test('writes every approved token verbatim in the globals.css token block', () => {
  const lines = readFileSync('src/app/globals.css', 'utf8').split(/\r?\n/);
  const expected = new Map([...documentedColors(), ...Object.entries(blendTokens)]);
  expect([...expected].filter(([name, value]) => !lines.includes('  ' + name + ': ' + value + ';')).map(([name]) => name)).toEqual([]);
  expect(lines).toContain('  color-scheme: light;');
});

// Foreground, background, documented ratio. Names are prefixed with --color-.
const textPairs: [string, string, number][] = [
  ['text', 'surface', 15.14], ['text', 'bg', 13.72], ['text', 'surface-user', 13.34], ['text', 'surface-neutral', 13.0],
  ['text', 'primary-tint', 12.77], ['text', 'accent-tint', 13.27], ['text', 'accent', 8.43], ['text', 'danger-tint', 13.24],
  ['text-secondary', 'surface', 7.58], ['text-secondary', 'bg', 6.87], ['text-secondary', 'surface-neutral', 6.51],
  ['text-secondary', 'accent-tint', 6.65], ['text-secondary', 'surface-user', 6.68], ['primary', 'surface', 7.84], ['primary', 'bg', 7.11],
  ['primary', 'primary-tint', 6.62], ['primary', 'primary-tint-strong', 6.08], ['primary', 'accent-tint', 6.88], ['primary-hover', 'surface', 11.1],
  ['on-primary', 'primary', 7.84], ['on-primary', 'primary-hover', 11.1], ['text-personal', 'accent-tint', 6.56], ['text-personal', 'surface', 7.48],
  ['status-open', 'surface', 6.46], ['status-open', 'bg', 5.86], ['danger', 'surface', 6.57], ['danger', 'bg', 5.96], ['danger', 'danger-tint', 5.75],
  ['on-primary', 'danger', 6.57],
];
const nonTextPairs: [string, string, number][] = [
  ['border-input', 'surface', 3.43], ['border-input', 'bg', 3.11], ['control-off', 'surface', 4.62], ['control-off', 'surface-neutral', 3.97], ['on-accent', 'accent', 8.43],
];

test('implemented colors keep the DESIGN_SYSTEM §3.2 contrast ratios', async ({ page }) => {
  await page.goto('/');
  const names = new Set([...textPairs, ...nonTextPairs].flatMap(([foreground, background]) => ['--color-' + foreground, '--color-' + background]));
  names.add('--color-primary-hover');
  names.add('--color-bg');
  const colors = await readTokens(page, names);
  const color = (name: string) => colors.get('--color-' + name) ?? '';
  const ratio = (foreground: string, background: string) => contrast(color(foreground), color(background));

  const failures: string[] = [];
  for (const [minimum, pairs] of [[4.5, textPairs], [3, nonTextPairs]] as const) {
    for (const [foreground, background, documented] of pairs) {
      const actual = ratio(foreground, background);
      if (Number(actual.toFixed(2)) !== documented || actual < minimum) {
        failures.push(foreground + ' on ' + background + ': documented ' + documented + ', computed ' + actual + ', minimum ' + minimum);
      }
    }
  }
  expect(failures).toEqual([]);
  // Link hover on the page ground (Task 3).
  expect(ratio('primary-hover', 'bg')).toBeGreaterThanOrEqual(4.5);
});

test('forces the light color scheme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('light');
});

const figtreeStack = /^["']?Figtree["']?,/;
const googleFonts = /fonts\.(googleapis|gstatic)\.com/;

test('seeker pages load self-hosted Figtree and never contact Google Fonts', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));

  const checkFigtree = async (path: string) => {
    expect(new URL(page.url()).pathname).toBe(path);
    await page.evaluate(() => document.fonts.ready);
    const faces = await page.evaluate(() =>
      [...document.fonts]
        .filter((face) => face.family.replace(/["']/g, '') === 'Figtree')
        .map(({ weight, display, style, status }) => ({ weight, display, style, status })),
    );
    expect(faces.map((face) => face.weight).sort(), path + ' faces').toEqual(['400', '600', '700', '800']);
    expect(faces.map((face) => face.display), path + ' display').toEqual(['swap', 'swap', 'swap', 'swap']);
    expect(faces.map((face) => face.style), path + ' style').toEqual(['normal', 'normal', 'normal', 'normal']);
    expect(faces.find((face) => face.weight === '400')?.status, path + ' regular face').toBe('loaded');
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily), path + ' body font').toMatch(figtreeStack);
  };

  await page.goto('/');
  await checkFigtree('/');
  await page.goto('/sign-in');
  await checkFigtree('/sign-in');
  await enterAs(page, 'My profile');
  await checkFigtree('/profile');

  expect(requested.filter((url) => googleFonts.test(url))).toEqual([]);
  const fontFiles = requested.filter((url) => /\.woff2?$/.test(new URL(url).pathname));
  expect(fontFiles.filter((url) => new URL(url).origin !== 'http://127.0.0.1:3100')).toEqual([]);
  expect(fontFiles.some((url) => new URL(url).pathname.endsWith('.woff2'))).toBe(true);
});

test('text renders in the fallback stack when font files fail', async ({ page }) => {
  const requested: string[] = [];
  let aborted = 0;
  page.on('request', (request) => requested.push(request.url()));
  await page.route(/\.woff2?(\?.*)?$/, (route) => {
    aborted += 1;
    return route.abort();
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(figtreeStack);
  expect(requested.filter((url) => googleFonts.test(url))).toEqual([]);

  // The failure was real: font requests were intercepted, and the browser gave up on the regular face.
  await page.evaluate(() => document.fonts.ready);
  expect(aborted).toBeGreaterThan(0);
  const regular = await page.evaluate(() =>
    [...document.fonts].find((face) => face.family.replace(/["']/g, '') === 'Figtree' && face.weight === '400')?.status,
  );
  expect(regular).toBe('error');
});

test('existing pages pass axe and reflow at phone and desktop widths', async ({ page }) => {
  test.setTimeout(180_000);
  // The first dev-server compile of a route streams a "Loading…" shell, so wait for the real page before measuring it.
  const open = async (path: string) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 }).or(page.getByRole('main').getByRole('alert'))).toBeVisible();
  };
  const check = async (path: string) => {
    for (const width of [360, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await open(path);
      await accessible(page);
    }
    await page.setViewportSize({ width: 320, height: 800 });
    await open(path);
    expect(await fitsWidth(page), path + ' fits 320px').toBe(true);
  };

  for (const path of ['/', '/sign-in', '/no-such-page']) await check(path);
  await enterAs(page, 'Admin');
  for (const path of ['/admin', '/organization', '/community', '/profile']) await check(path);
});

test('controls follow the Blend button and field specs', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await enterAs(page, 'Admin');
  await page.goto('/admin');
  const primary = page.getByRole('button', { name: 'Add resource', exact: true });
  await expect(primary).toBeVisible();
  await expect(primary).toHaveCSS('background-color', 'rgb(23, 89, 107)');
  await expect(primary).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(primary).toHaveCSS('border-radius', '12px');
  await expect(primary).toHaveCSS('font-weight', '700');
  await expect(primary).toHaveCSS('font-size', '16px');
  await expect(primary).toHaveCSS('border-top-style', 'solid');

  // The border width is not asserted: browsers snap 1.5px to a device pixel.
  const field = page.getByRole('textbox', { name: 'Resource name', exact: true });
  await expect(field).toHaveCSS('font-size', '16px');
  await expect(field).toHaveCSS('border-top-style', 'solid');
  await expect(field).toHaveCSS('border-top-color', 'rgb(128, 140, 153)');
  await expect(field).toHaveCSS('border-radius', '12px');
  await expect(field).toHaveCSS('background-color', 'rgb(255, 255, 255)');

  const secondary = page.getByRole('button', { name: 'Sign out', exact: true });
  await expect(secondary).toHaveCSS('background-color', 'rgb(226, 238, 240)');
  await expect(secondary).toHaveCSS('color', 'rgb(23, 89, 107)');

  const body = page.locator('body');
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await expect(body, colorScheme + ' background').toHaveCSS('background-color', 'rgb(242, 244, 245)');
    await expect(body, colorScheme + ' text').toHaveCSS('color', 'rgb(28, 39, 51)');
  }

  const title = page.getByRole('heading', { level: 1 });
  await expect(title).toHaveCSS('font-size', '24px');
  await expect(title).toHaveCSS('line-height', '30px');
  await expect(title).toHaveCSS('font-weight', '700');

  const main = page.getByRole('main');
  for (const role of ['button', 'combobox', 'textbox'] as const) {
    const controls = await main.getByRole(role).all();
    if (role !== 'combobox') expect(controls.length, role + ' count').toBeGreaterThan(0);
    for (const control of controls) {
      const box = await control.boundingBox();
      if (!box) continue;
      expect(box.height, role + ' height').toBeGreaterThanOrEqual(44);
      if (role === 'button') expect(box.width, role + ' width').toBeGreaterThanOrEqual(44);
    }
  }
  const checkboxes = await main.getByRole('checkbox').all();
  expect(checkboxes.length, 'checkbox count').toBeGreaterThan(0);
  for (const checkbox of checkboxes) {
    const box = await checkbox.locator('..').boundingBox();
    expect(box?.height, 'checkbox label height').toBeGreaterThanOrEqual(44);
  }

  // Radios get the same 44px row and teal accent as checkboxes. No page here has one yet, so a minimal fieldset is added.
  await page.evaluate(() => {
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = 'Test';
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 't';
    label.append(input, ' Option');
    fieldset.append(legend, label);
    document.querySelector('main')?.append(fieldset);
  });
  const radio = page.getByRole('radio', { name: 'Option', exact: true });
  await expect(radio).toBeVisible();
  expect((await radio.locator('..').boundingBox())?.height, 'radio label height').toBeGreaterThanOrEqual(44);
  await expect(radio).toHaveCSS('accent-color', 'rgb(23, 89, 107)');
});

const focusRing = { style: 'solid', width: '3px', color: 'rgb(23, 89, 107)', offset: '2px' };

test('keyboard focus shows the Blend focus ring', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('button', { name: 'Enter as Admin', exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content', exact: true });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport({ ratio: 1 });
  expect(await ring(skip), 'skip link').toEqual(focusRing);

  const enter = page.getByRole('button', { name: 'Enter as Admin', exact: true });
  await focusByKeyboard(page, enter);
  expect(await ring(enter), 'filled button').toEqual(focusRing);

  await enterAs(page, 'Admin');
  const field = page.getByRole('textbox', { name: 'Resource name', exact: true });
  await expect(field).toBeVisible();
  await focusByKeyboard(page, field);
  expect(await ring(field), 'text field').toEqual(focusRing);
  const checkbox = page.getByRole('checkbox', { name: 'Food', exact: true }).first();
  await focusByKeyboard(page, checkbox);
  expect(await ring(checkbox), 'checkbox').toEqual(focusRing);
});

test('honours reduced motion and keeps control boundaries under forced colors', async ({ page }) => {
  await page.goto('/sign-in');
  const enter = page.getByRole('button', { name: 'Enter as Admin', exact: true });
  await expect(enter).toBeVisible();
  expect(await enter.evaluate((element) => getComputedStyle(element).transitionDuration)).toContain('0.12s');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await enter.evaluate((element) => getComputedStyle(element).transitionDuration)).toMatch(/^0s(, 0s)*$/);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.emulateMedia({ forcedColors: 'active' });
  await expect(enter).toHaveCSS('border-top-style', 'solid');
  await expect(enter).toHaveCSS('border-top-width', '1px');
  await expect(page.getByRole('combobox', { name: 'Language', exact: true })).toHaveCSS('border-top-style', 'solid');

  // The focus ring is an outline, which forced colors keep (the color becomes a system color, so only its shape is checked).
  await focusByKeyboard(page, enter);
  expect(await ring(enter), 'ring under forced colors').toMatchObject({ style: 'solid', width: '3px' });

  await enterAs(page, 'Admin');
  const field = page.getByRole('textbox', { name: 'Resource name', exact: true });
  await expect(field).toBeVisible();
  await expect(field).toHaveCSS('border-top-style', 'solid');
});

test('the error glyph is not painted in the page background under forced colors', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() => {
    const message = document.createElement('p');
    message.className = 'error';
    message.textContent = 'Example error message';
    document.querySelector('main')?.append(message);
  });
  await page.emulateMedia({ forcedColors: 'active' });
  const message = page.locator('p.error');
  await expect(message).toBeVisible();
  const colors = await message.evaluate((element) => ({
    glyph: getComputedStyle(element, '::before').backgroundColor,
    page: getComputedStyle(document.body).backgroundColor,
  }));
  expect(colors.glyph, 'glyph against the page color ' + colors.page).not.toBe(colors.page);
});

// A hex color or a color function. Named colors are left to review: `transparent`, `currentColor` and system colors are allowed.
const rawColor = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|color)\(/i;

// Drops only the rules whose whole selector is `:root`. `html:root`, `.a, :root` and `.x :root` stay, so their values are checked.
function withoutTokenBlocks(css: string): string {
  return css.replace(/(?<=^|\})\s*:root\s*\{[^}]*\}/g, '');
}

test('rules use tokens instead of raw colors', () => {
  const rules = withoutTokenBlocks(readFileSync('src/app/globals.css', 'utf8'));
  expect(rules).toContain('.card');
  expect(rules.match(rawColor)).toBeNull();

  // Negative controls: the guard can fail. Raw colors hidden behind a `:root` in a longer selector are still found,
  // and an exact `:root` block is still skipped.
  for (const css of ['html:root{color:#fff}', '.a, :root{color:rgb(0,0,0)}', '.x :root{color:hsl(0 0% 0%)}', 'a{}:root,.b{color:#000}']) {
    expect(withoutTokenBlocks(css).match(rawColor), css).not.toBeNull();
  }
  expect(withoutTokenBlocks(':root{color:#fff}\n:root { color:rgb(0,0,0) }').match(rawColor)).toBeNull();
});
