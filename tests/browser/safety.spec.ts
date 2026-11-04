import { randomUUID } from 'node:crypto';
import { expect, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { accessible, enterAs, fitsWidth, focusByKeyboard, hydrated, ring, saveNeeds, test } from './support';

const exitName = 'Quick exit to a neutral website';
const exitLink = (page: Page) => page.getByRole('banner').getByRole('link', { name: exitName, exact: true, includeHidden: true });

// What a visit records instead of a flag when the browser has no Navigation API, so the failure names its cause.
const noNavigationApi = 'window.navigation is missing, so the hidden check cannot run';
type Visit = { referer: string | undefined; hidden: boolean | string | null };

// Stands in for the neutral site, so no run contacts the real host. For every request it records the Referer header and
// whether the ORAN page was hidden at the moment it started to leave (null without JavaScript, where nothing can hide it).
// The route is on the context, so a tab that a stray click opens is answered here too and never reaches the real host.
//
// The hidden state cannot be read with page.evaluate here: while a navigation request is held in a route handler, Chromium
// answers no evaluate, CDP session or screenshot call for that page until the navigation commits, so the read deadlocks
// against the fulfilment it precedes. The page reports instead. An init script reads `document.body.hidden` inside the
// Navigation API's `navigate` event, which fires synchronously inside location.replace(), so a page that is hidden any
// later than that (after the call, after a timer, after weather.gov answers) is recorded as not hidden. It sends the value
// through a binding, which is a one-way message that is still delivered. The handler holds the response until that report
// arrives (or two seconds pass), only to absorb the order in which the report and the request reach this side.
// A browser without the Navigation API would never report. Each document then reports the noNavigationApi sentinel when it starts,
// so the visit carries that cause and the strict comparison fails with it, instead of with an unexplained null.
async function neutralSite(page: Page, scripted: boolean): Promise<Visit[]> {
  const visits: Visit[] = [];
  let reported: boolean | string | null = null;
  let wake: (() => void) | undefined;
  if (scripted) {
    await page.exposeFunction('oranBodyHidden', (hidden: boolean | string) => {
      reported = hidden;
      wake?.();
    });
    await page.addInitScript((missing: string) => {
      // The installed TypeScript DOM library does not describe the Navigation API yet.
      const scope = window as unknown as {
        oranBodyHidden(hidden: boolean | string): void;
        navigation?: { addEventListener(type: 'navigate', listener: (event: { destination: { url: string } }) => void): void };
      };
      if (!('navigation' in window) || !scope.navigation) {
        scope.oranBodyHidden(missing);
        return;
      }
      scope.navigation.addEventListener('navigate', (event) => {
        if (new URL(event.destination.url).hostname === 'www.weather.gov') scope.oranBodyHidden(document.body.hidden);
      });
    }, noNavigationApi);
  }
  await page.context().route(/^https:\/\/www\.weather\.gov\//, async (route) => {
    if (scripted && reported === null) await new Promise<void>((resolve) => { wake = resolve; setTimeout(resolve, 2000); });
    visits.push({ referer: route.request().headers()['referer'], hidden: scripted ? reported : null });
    reported = null;
    wake = undefined;
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Weather</title><h1>Neutral page</h1>' });
  });
  return visits;
}

// Counts the capture listeners for keydown that window holds right now and whose code names Escape. React hydrating the Exit link is
// not enough to press Esc: the shortcut is added by an effect after hydration, and a key pressed before it is a press nobody sees.
// The wrapper sits on EventTarget, installed before any page script, and adds nothing to the product.
// It accepts any capture keydown listener that mentions Escape, which today is only QuickExit's. Tighten it (for example by function name) when
// dialogs or drawers add their own Esc handlers, or one of theirs would satisfy the wait before QuickExit is installed.
async function watchEscapeListener(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const live = new Set<unknown>();
    (window as unknown as { oranEscapeListeners(): number }).oranEscapeListeners = () => live.size;
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    const captures = (options: unknown) => options === true || (typeof options === 'object' && options !== null && (options as AddEventListenerOptions).capture === true);
    EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
      if (this === window && type === 'keydown' && captures(options) && String(listener).includes('Escape')) live.add(listener);
      return add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (this: EventTarget, type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
      if (this === window && type === 'keydown' && captures(options)) live.delete(listener);
      return remove.call(this, type, listener, options);
    };
  });
}

// Waits until the Esc shortcut is on window. Call it before any Esc press.
async function shortcutInstalled(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => (window as unknown as { oranEscapeListeners(): number }).oranEscapeListeners()), { message: 'the Esc shortcut is installed on window' }).toBeGreaterThan(0);
}

let visits: Visit[] = [];
test.beforeEach(async ({ page, javaScriptEnabled }) => {
  visits = await neutralSite(page, javaScriptEnabled);
  if (javaScriptEnabled) await watchEscapeListener(page);
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

// Clicks Exit a given way and checks that it leaves in this tab and starts nothing else: no second tab or window, and no download.
// Two checks, because neither covers every way: Chromium opens a stray tab late, after the page has left, so a check made at once can pass
// for the wrong reason; and under Playwright an Alt-click starts no download that can be seen, so only the link's own handler shows that it
// cancelled the default action.
async function clickLeaves(page: Page, context: BrowserContext, click: Parameters<Locator['click']>[0]): Promise<void> {
  const strays: string[] = [];
  context.on('page', () => strays.push('a second tab or window'));
  page.on('download', () => strays.push('a download'));
  await page.goto('/dev/components');
  const exit = exitLink(page);
  await hydrated(exit);

  // A window listener runs after React's handler, in the bubble phase, so it sees the cancel. The binding is a one-way message that
  // reaches this side even though the page is leaving.
  const prevented: boolean[] = [];
  await page.exposeFunction('oranDefaultPrevented', (value: boolean) => { prevented.push(value); });
  await page.evaluate(() => {
    const scope = window as unknown as { oranDefaultPrevented(value: boolean): void };
    for (const type of ['click', 'auxclick']) {
      window.addEventListener(type, (event) => {
        if (event.target instanceof Element && event.target.closest('a.quick-exit')) scope.oranDefaultPrevented(event.defaultPrevented);
      });
    }
  });

  await exit.click(click);
  await page.waitForURL('https://www.weather.gov/');
  expect(visits).toEqual([{ referer: undefined, hidden: true }]);
  await expect.poll(() => prevented, { message: 'the link cancelled the default action of the click' }).toEqual([true]);

  // The wait ends as soon as a tab or a download shows up, and is expected to run out.
  await Promise.race([context.waitForEvent('page', { timeout: 1000 }), page.waitForEvent('download', { timeout: 1000 })]).catch(() => undefined);
  expect(strays, 'what the click started besides the visit').toEqual([]);
  expect(context.pages()).toHaveLength(1);
}

test('a middle click on Exit leaves in this tab and opens no other', async ({ page, context }) => {
  await clickLeaves(page, context, { button: 'middle' });
});

// The link's own click handler runs whatever keys are held, so a held key cannot turn the click into a new tab, a new window or a download.
for (const modifier of ['Control', 'Shift', 'Alt'] as const) {
  test(`${modifier}-click on Exit still leaves in this tab and opens no other`, async ({ page, context }) => {
    await clickLeaves(page, context, { modifiers: [modifier] });
  });
}

const clockStart = new Date('2026-11-04T08:00:00Z');

// Time is controlled with page.clock, never with real sleeps. The listener reads performance.now(), which the clock owns.
// Installs the clock before the first visit, opens the paths in turn, waits for React, and freezes time an hour later.
// Returns the address of the last page.
async function frozenAt(page: Page, ...paths: string[]): Promise<string> {
  await page.clock.install({ time: clockStart });
  for (const path of paths) await page.goto(path);
  await hydrated(exitLink(page));
  await freezeClock(page);
  return page.url();
}

// Stops time once the shortcut is installed, so two presses are exactly as far apart as the test says, however slow the machine is.
async function freezeClock(page: Page): Promise<void> {
  await shortcutInstalled(page);
  await page.clock.pauseAt(new Date('2026-11-04T09:00:00Z'));
}

// The page is still shown, still at the same address, and the neutral site was never asked for.
async function stayed(page: Page, address: string): Promise<void> {
  expect(await page.evaluate(() => document.body.hidden), 'the page is not hidden').toBe(false);
  expect(page.url(), 'the address is unchanged').toBe(address);
  expect(visits, 'weather.gov was not requested').toEqual([]);
}

test('one Esc closes a dialog and never leaves', async ({ page }) => {
  const address = await frozenAt(page, '/dev/components');
  await page.evaluate(() => {
    const dialog = document.createElement('dialog');
    dialog.textContent = 'Synthetic dialog';
    document.querySelector('main')?.append(dialog);
    dialog.showModal();
  });
  // A closed dialog has no role in the accessibility tree, so the locator names it by tag and text.
  const dialog = page.locator('dialog', { hasText: 'Synthetic dialog' });
  await expect(dialog).toHaveJSProperty('open', true);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveJSProperty('open', false);
  await stayed(page, address);

  await page.clock.fastForward(5000);
  await stayed(page, address);
});

test('two Esc presses more than a second apart stay, and a quick third press leaves', async ({ page }) => {
  const address = await frozenAt(page, '/dev/components');
  await page.keyboard.press('Escape');
  await page.clock.fastForward(1001);
  await page.keyboard.press('Escape');
  await stayed(page, address);

  await page.keyboard.press('Escape');
  await page.waitForURL('https://www.weather.gov/');
});

test('two Esc presses within one second replace the page at once', async ({ page }) => {
  await frozenAt(page, '/sign-in', '/dev/components');
  await page.keyboard.press('Escape');
  await page.clock.fastForward(1000);
  await page.keyboard.press('Escape');
  await page.waitForURL('https://www.weather.gov/');
  expect(visits).toEqual([{ referer: undefined, hidden: true }]);

  // location.replace puts no entry in the history, so Back skips the catalog and returns to the page before it.
  await page.goBack();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test('a held Esc key is one press', async ({ page }) => {
  const address = await frozenAt(page, '/dev/components');
  await page.evaluate(() => {
    const repeats: boolean[] = [];
    (window as unknown as { repeats: boolean[] }).repeats = repeats;
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') repeats.push(event.repeat);
    });
  });
  await page.keyboard.down('Escape');
  await page.keyboard.down('Escape');
  await page.keyboard.up('Escape');
  expect(await page.evaluate(() => (window as unknown as { repeats: boolean[] }).repeats)).toEqual([false, true]);
  await stayed(page, address);
});

test('Esc twice leaves while a text field has focus', async ({ page }) => {
  await frozenAt(page, '/dev/components');
  const field = page.getByRole('textbox', { name: 'Resource name', exact: true });
  await field.fill('Synthetic text');
  await expect(field).toBeFocused();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.waitForURL('https://www.weather.gov/');
});

test('the shortcut is off where Exit is hidden', async ({ page }) => {
  const address = await frozenAt(page, '/sign-in');
  await expect(exitLink(page)).toBeHidden();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await stayed(page, address);
});

// Order matters in this file: the directory test below publishes the only Safety listing of a run, and it needs a fresh database. This test
// runs first, so no Safety or Housing & shelter listing exists yet and a Food-only profile has nothing to show Exit for.
test('Exit follows the saved Safety and Housing & shelter needs', async ({ page }) => {
  const noSafetyListing = 'no Safety or Housing & shelter listing exists yet (this test runs before the directory test, on a fresh database)';
  await page.clock.install({ time: clockStart });
  const exit = exitLink(page);
  await enterAs(page, 'My profile');
  await saveNeeds(page, ['Food']);
  await expect(exit, noSafetyListing).toBeHidden();

  // Safety results: Exit shows, and nothing in the title or the address names the category (§5.6). No crisis card appears (ADR-0007 §2).
  await saveNeeds(page, ['Safety']);
  await expect(exit).toBeVisible();
  await expect(page).toHaveTitle('ORAN');
  expect(new URL(page.url()).search).toBe('');
  expect(page.url()).not.toMatch(/safety|housing|seguridad|vivienda/i);
  await expect(page.getByRole('main').getByRole('heading', { name: 'Get help now' })).toHaveCount(0);

  // Client-side navigation keeps the layout, so the link and the shortcut stay mounted. Both must go quiet on a page that is not a result.
  await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'Organization', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('You do not have access to this workspace.');
  await expect(exit).toBeHidden();
  await expect(page).toHaveURL(/\/organization$/);
  const address = page.url();
  await freezeClock(page);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await stayed(page, address);
  await page.clock.resume();

  await page.goto('/profile');
  await expect(exit).toBeVisible();
  await saveNeeds(page, ['Food']);
  await expect(exit, noSafetyListing).toBeHidden();
  await saveNeeds(page, ['Housing & shelter']);
  await expect(exit).toBeVisible();
  await page.getByRole('button', { name: 'Delete my saved preferences', exact: true }).click();
  await expect(exit).toBeHidden();
});

// Publishes a Safety listing the way workflow.spec.ts publishes its first listing: an admin adds it, with a phone call as the source,
// and records the verification that makes it public. It ticks Safety and any other categories given. Returns the listing's name.
async function publishSafetyListing(page: Page, alsoIn: readonly string[] = []): Promise<string> {
  const name = 'Synthetic safety listing ' + randomUUID();
  await enterAs(page, 'Admin');
  await expect(page.getByRole('heading', { name: 'Add resource', exact: true })).toBeVisible();
  await page.getByLabel('Resource name', { exact: true }).fill(name);
  await page.getByLabel('Organization name', { exact: true }).fill('Synthetic browser organization');
  await page.getByLabel('Service ZIP code', { exact: true }).fill('98101');
  await page.getByLabel('Website', { exact: true }).fill('https://example.org');
  const resourceForm = page.locator('form').filter({ has: page.getByLabel('Resource name', { exact: true }) });
  for (const category of ['Safety', ...alsoIn]) await resourceForm.getByRole('checkbox', { name: category, exact: true }).check();
  await page.getByLabel('Description', { exact: true }).fill('Synthetic browser test listing, not a real assistance service.');
  await page.getByLabel('Who may qualify', { exact: true }).fill('Contact the provider about requirements');
  await page.getByLabel('How to get help', { exact: true }).fill('Contact the provider before visiting');
  await page.getByRole('radio', { name: 'A phone call', exact: true }).check();
  await page.getByLabel('Source and permission note', { exact: true }).fill('Synthetic browser fixture for testing only');
  await page.getByRole('button', { name: 'Add resource', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved. This resource needs' })).toBeVisible();

  const task = page.locator('article')
    .filter({ has: page.getByRole('heading', { name, level: 3, exact: true }) })
    .filter({ has: page.getByRole('button', { name: 'Record verification', exact: true }) });
  await task.getByLabel('Method', { exact: true }).selectOption({ label: 'Phone call' });
  await task.getByLabel('Evidence and source reference').fill('Synthetic evidence from a phone call used only in browser testing');
  await task.getByLabel('Fields checked').fill('name, description, published eligibility and intake');
  await task.getByRole('button', { name: 'Record verification', exact: true }).click();
  await expect(task).toHaveCount(0);
  return name;
}

// Keep this test after the Profile test above. It needs an empty directory, and it publishes the run's only Safety listing, which would
// make the Profile test's Food-only steps show Exit.
test('Exit shows on the directory once it lists a Safety listing, and on Profile results that include it', async ({ page }) => {
  const exit = exitLink(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(exit, 'the directory lists no Safety or Housing & shelter listing yet (this test needs a fresh database)').toBeHidden();

  // The listing is in Food as well, so a person who saved only Food is shown it. Exit must follow the listing the results show, not only the saved needs.
  const name = await publishSafetyListing(page, ['Food']);
  await page.goto('/');
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(exit).toBeVisible();
  await expect(page).toHaveTitle('ORAN');
  expect(page.url()).toBe('http://127.0.0.1:3100/');
  await expect(page.getByRole('main').getByRole('heading', { name: 'Get help now' })).toHaveCount(0);
  await accessible(page);

  // The results half of the Profile scope: the saved need is Food, and the listing shown is also a Safety listing.
  await enterAs(page, 'My profile');
  await saveNeeds(page, ['Food']);
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(exit).toBeVisible();
  await page.getByRole('button', { name: 'Delete my saved preferences', exact: true }).click();
  await expect(exit).toBeHidden();
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
