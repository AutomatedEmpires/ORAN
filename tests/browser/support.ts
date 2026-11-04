import { readFileSync } from 'node:fs';
import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Every spec runs against a hydrated page with Playwright's own `test`. Blocking the dev server's /_next/ socket used to
// keep a Turbopack reload loop away (vercel/next.js#100251), but it also stopped React from hydrating, so those specs
// tested a page that never became interactive. PR #15 fixed the loop at its cause: test runs compile without the saved
// dev cache (next.config.ts).
export { test };

// The text of docs/DESIGN_SYSTEM.md from "## <title>" to the next "## " heading.
// The path is relative to the working directory, which is the repository root for Playwright.
export function designSystemSection(title: string): string {
  const lines = readFileSync('docs/DESIGN_SYSTEM.md', 'utf8').split(/\r?\n/);
  const start = lines.indexOf('## ' + title);
  if (start === -1) throw new Error('DESIGN_SYSTEM.md has no "## ' + title + '" section.');
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
}

// The §3.1 color rows, in table order: token name to documented value.
export function documentedColors(): Map<string, string> {
  const colors = new Map<string, string>();
  for (const line of designSystemSection('3. Tokens').split(/\r?\n/)) {
    const row = /^\| `(--color-[a-z-]+)` \| `([^`]+)` \|/.exec(line);
    if (row) colors.set(row[1], row[2]);
  }
  return colors;
}

// Every custom property the approved document names anywhere in §3.
export function documentedTokenNames(): Set<string> {
  return new Set([...designSystemSection('3. Tokens').matchAll(/`(--[a-z0-9-]+)/g)].map((match) => match[1]));
}

// Signs in through the local identity chooser and waits until the redirect has left /sign-in.
export async function enterAs(page: Page, identity: 'Admin' | 'Organization' | 'Community' | 'My profile'): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Enter as ' + identity, exact: true }).click();
  await page.waitForURL((url) => !url.href.includes('/sign-in'));
}

export async function readTokens(page: Page, names: Iterable<string>): Promise<Map<string, string>> {
  const list = [...names];
  const values = await page.evaluate(
    (tokenNames) => tokenNames.map((name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()),
    list,
  );
  return new Map(list.map((name, index) => [name, values[index]]));
}

export function normalized(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '').replace(/"/g, "'");
}

// Next's CSS pipeline re-serializes some approved values without changing them: rgba(28, 39, 51, 0.45) becomes
// #1c273373 and 120ms becomes .12s. This resolves values the way the browser computes the given property, or to ''
// when the browser rejects the value, so the served and the approved spelling can be compared as the same value.
export async function resolveAs(page: Page, property: 'color' | 'boxShadow' | 'transitionDuration', values: string[]): Promise<string[]> {
  return page.evaluate(
    ([name, list]) => {
      const probe = document.createElement('div');
      document.body.append(probe);
      const resolved = list.map((value) => {
        probe.style[name] = value;
        const computed = probe.style[name] ? getComputedStyle(probe)[name] : '';
        probe.style[name] = '';
        return computed;
      });
      probe.remove();
      return resolved;
    },
    [property, values] as ['color' | 'boxShadow' | 'transitionDuration', string[]],
  );
}

// Next's CSS pipeline serializes #FFFFFF as #fff, so the three-digit form is expanded before it is read.
function luminance(color: string): number {
  const hex = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.exec(color.trim());
  if (!hex) throw new Error('Expected a #RRGGBB color, got "' + color + '".');
  const digits = hex[1].length === 3 ? [...hex[1]].map((digit) => digit + digit).join('') : hex[1];
  const [red, green, blue] = [0, 2, 4].map((offset) => {
    const channel = parseInt(digits.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

// The unrounded WCAG 2.x contrast ratio of two #RRGGBB colors.
export function contrast(foreground: string, background: string): number {
  const [first, second] = [luminance(foreground), luminance(background)];
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

// Fails on any serious or critical WCAG 2.0 A/AA or 2.1 AA violation, as workflow.spec.ts does.
export async function accessible(page: Page): Promise<void> {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')).toEqual([]);
}

// True when the page does not scroll sideways (WCAG 1.4.10 reflow).
export async function fitsWidth(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

// Moves focus the way a keyboard user does, so :focus-visible matches: focus the target, step away, and step back.
export async function focusByKeyboard(page: Page, target: Locator): Promise<void> {
  await target.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(target).toBeFocused();
}

// The computed focus ring of an element.
export async function ring(target: Locator): Promise<{ style: string; width: string; color: string; offset: string }> {
  return target.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { style: computed.outlineStyle, width: computed.outlineWidth, color: computed.outlineColor, offset: computed.outlineOffset };
  });
}
