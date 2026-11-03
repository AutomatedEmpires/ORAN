import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { contrast, documentedColors, documentedTokenNames, normalized, readTokens, resolveAs } from './support';

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
