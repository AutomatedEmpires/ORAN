import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

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
