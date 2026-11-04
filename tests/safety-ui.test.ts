import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import ErrorPage from '@/app/error';
import en from '@/ui/en.json';
import es from '@/ui/es.json';
import { OutageState } from '@/ui/get-help-now';
import { QuickExit } from '@/ui/quick-exit';
import { quickExitCategories, quickExitScope, quickExitUrl, quickExitWindowMs, showsQuickExit } from '@/ui/safety';

describe('quick exit scope', () => {
  it('shows quick exit only for Safety and Housing & shelter codes', () => {
    expect(showsQuickExit()).toBe(false);
    expect(showsQuickExit([], ['food', 'health'])).toBe(false);
    expect(showsQuickExit(['food'], ['health', 'safety'])).toBe(true);
    expect(showsQuickExit(['housing_shelter'])).toBe(true);
    expect(showsQuickExit(['Safety', 'housing'])).toBe(false); // codes, never labels or the legacy code
    expect(quickExitScope(true)).toEqual({ 'data-quick-exit': '' });
    expect(quickExitScope(false)).toEqual({});
  });

  it('holds the approved destination, window and categories', () => {
    expect(quickExitUrl).toBe('https://www.weather.gov');
    expect(quickExitWindowMs).toBe(1000);
    expect(quickExitCategories).toEqual(['safety', 'housing_shelter']);
  });
});

describe('QuickExit markup', () => {
  const markup = renderToStaticMarkup(createElement(QuickExit, { label: en.exit, name: en.quickExitName }));

  it('is a plain link to the neutral site that works before any script runs', () => {
    expect(markup).toMatch(/^<a /);
    expect(markup).toContain('class="quick-exit"');
    expect(markup).toContain('href="https://www.weather.gov"');
    expect(markup).toContain('rel="noreferrer"');
    expect(markup).toContain('aria-label="Quick exit to a neutral website"');
    expect(markup).toMatch(/<\/svg>Exit<\/a>$/);
  });

  it('draws the exit icon as a decorative inline SVG', () => {
    const svg = /<svg [^>]*>/.exec(markup)?.[0] ?? '';
    for (const attribute of ['width="18"', 'height="18"', 'viewBox="0 0 24 24"', 'fill="none"', 'stroke="currentColor"', 'stroke-width="1.8"', 'stroke-linecap="round"', 'stroke-linejoin="round"', 'aria-hidden="true"', 'focusable="false"']) {
      expect(svg, attribute).toContain(attribute);
    }
    for (const path of ['M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4', 'M14 8l4 4-4 4', 'M18 12H9']) expect(markup, path).toContain('d="' + path + '"');
  });

  it('is named in English and Spanish, and the visible word is part of the name', () => {
    for (const text of [en, es]) {
      const rendered = renderToStaticMarkup(createElement(QuickExit, { label: text.exit, name: text.quickExitName }));
      expect(rendered).toContain('aria-label="' + text.quickExitName + '"');
      expect(text.quickExitName.toLowerCase()).toContain(text.exit.toLowerCase());
    }
    expect(en.exit).toBe('Exit');
    expect(en.quickExitName).toBe('Quick exit to a neutral website');
    expect(es.exit).toBe('Salir');
    expect(es.quickExitName).toBe('Salir rápido a un sitio web neutral');
  });
});

describe('language catalogs', () => {
  it('keep identical key sets in English and Spanish', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });
});

describe('Get help now', () => {
  const keys = ['988', '911', 'dv', '211'] as const;

  it('gives every help number English and Spanish text', () => {
    for (const text of [en, es]) {
      expect(text.call).toContain('{phone}');
      for (const key of keys) expect(text.helpLines[key], key).toContain('{phone}');
    }
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(es.helpLines).sort()).toEqual(Object.keys(en.helpLines).sort());
    expect('crisis' in en).toBe(false);
    expect('crisis' in es).toBe(false);
  });

  it('renders the outage state with the crisis numbers in order', () => {
    const html = renderToStaticMarkup(createElement(OutageState, { text: en }));
    expect(html).toContain('role="status"');
    expect(html).toContain(en.unavailable);
    expect(html).toContain('Suicide &amp; Crisis Lifeline: call or text 988');
    expect(html).toContain('>Call 1-800-799-7233<');
    const order = ['href="tel:988"', 'href="tel:911"', 'href="tel:+18007997233"', 'href="tel:211"'].map((link) => html.indexOf(link));
    expect(order.every((index) => index >= 0), 'every call link is present').toBe(true);
    expect(order, 'the links are in the §5.6 order').toEqual([...order].sort((a, b) => a - b));
    expect(html).not.toContain('{phone}');
    expect(html).not.toContain('<details');

    const spanish = renderToStaticMarkup(createElement(OutageState, { text: es }));
    expect(spanish).toContain('Obtén ayuda ahora');
    expect(spanish).toContain('>Llamar al 988<');
  });

  it('keeps the crisis numbers outside the error alert', () => {
    const html = renderToStaticMarkup(createElement(ErrorPage, { reset() {} }));
    expect(html).toContain('role="alert"');
    expect(html).toContain('Try again');
    expect(html).toContain('href="tel:988"');
    expect(html.indexOf('</section>')).toBeGreaterThanOrEqual(0);
    expect(html.indexOf('</section>')).toBeLessThan(html.indexOf('Get help now'));
  });
});
