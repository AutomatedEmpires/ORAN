// Authorization policy: local-launcher development only (catalogAllowed); otherwise not found. No identity, profile or catalog data.
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Button, buttonClassName } from '@/ui/button';
import { quickExitScope } from '@/ui/safety';
import { catalogAllowed } from '../guard';

export const dynamic = 'force-dynamic';
const metadata: Metadata = { title: 'Component catalog', robots: { index: false, follow: false } };

// The one place that asks the guard, for this request's environment and host. The page and its metadata both use it.
async function allowed(): Promise<boolean> {
  return catalogAllowed(process.env, (await headers()).get('host'));
}

// Metadata is still rendered when the page then calls notFound(), so the title and robots tag are given only to an
// allowed request. A denied request gets the not-found page and none of the catalog's content or metadata. Its status is
// still 200 (the root loading.tsx streams first), which shows that the route exists; the deferred fix is a 404 for /dev/*
// in src/proxy.ts.
export async function generateMetadata(): Promise<Metadata> {
  return (await allowed()) ? metadata : {};
}

// The §3.1 colors of docs/DESIGN_SYSTEM.md, in table order. The browser spec compares this list with the document.
const colors = [
  '--color-bg', '--color-surface', '--color-surface-user', '--color-surface-neutral', '--color-scrim', '--color-text',
  '--color-text-secondary', '--color-primary', '--color-primary-hover', '--color-primary-tint', '--color-primary-tint-strong',
  '--color-on-primary', '--color-accent', '--color-on-accent', '--color-accent-tint', '--color-text-personal',
  '--color-status-open', '--color-danger', '--color-danger-tint', '--color-border', '--color-border-subtle',
  '--color-border-input', '--color-control-off',
];

const sizes = [['xs', '12px', '16px'], ['sm', '14px', '20px'], ['md', '16px', '24px'], ['lg', '18px', '24px'], ['xl', '24px', '30px']] as const;
const weights = ['regular', 'semibold', 'bold', 'heavy'] as const;
const buttons = [['Primary', 'primary'], ['Secondary', 'secondary'], ['Quiet', 'quiet'], ['Destructive', 'destructive'], ['Destructive confirm', 'destructive-confirm']] as const;

export default async function ComponentCatalog() {
  if (!(await allowed())) notFound();
  return <section lang="en" aria-labelledby="catalog-title">
    <h1 id="catalog-title">Component catalog</h1>
    <p className="small">Development only. This page is not available in production or preview.</p>

    <h2 id="catalog-colors">Color tokens</h2>
    <ul className="catalog-swatches" role="list" aria-labelledby="catalog-colors">
      {colors.map((name) => <li key={name}><span className="catalog-swatch" aria-hidden="true" style={{ background: `var(${name})` }} /><code>{name}</code></li>)}
    </ul>

    <h2>Typography</h2>
    {sizes.map(([step, size, lineHeight]) => <p key={step} style={{ fontSize: `var(--font-size-${step})`, lineHeight: `var(--line-height-${step})` }}>{`Size ${step}: ${size}/${lineHeight}`}</p>)}
    {weights.map((name) => <p key={name} style={{ fontWeight: `var(--font-weight-${name})` }}>{`Weight ${name}`}</p>)}

    <section id="buttons" aria-labelledby="catalog-buttons">
      <h2 id="catalog-buttons">Buttons</h2>
      <form action="/dev/components">
        <input type="hidden" name="submitted" value="1" />
        {buttons.map(([label, variant]) => <section key={variant} aria-labelledby={`catalog-buttons-${variant}`}>
          <h3 id={`catalog-buttons-${variant}`}>{label}</h3>
          <div className="catalog-row">
            <Button variant={variant}>{label}</Button>
            <Button variant={variant} size="large">{label + ' large'}</Button>
            <Button variant={variant} size="compact">{label + ' compact'}</Button>
            <Button variant={variant} disabled>{label + ' disabled'}</Button>
            <Button variant={variant} busy>{label + ' busy'}</Button>
          </div>
        </section>)}
        <div className="catalog-row"><a className={buttonClassName('secondary')} href="#buttons">Secondary link</a></div>
      </form>
    </section>

    <h2>Form controls</h2>
    <form action="/dev/components">
      <label htmlFor="catalog-name">Resource name</label>
      <input id="catalog-name" name="name" />
      <label htmlFor="catalog-zip">ZIP code</label>
      <input id="catalog-zip" name="zip" inputMode="numeric" autoComplete="postal-code" aria-describedby="catalog-zip-hint" />
      <p id="catalog-zip-hint" className="small">Five digits</p>
      <label htmlFor="catalog-website">Website</label>
      <input id="catalog-website" name="website" aria-invalid="true" aria-describedby="catalog-website-error" defaultValue="example" />
      <p id="catalog-website-error" className="error">Enter a full web address that starts with https://</p>
      <label htmlFor="catalog-organization">Organization name</label>
      <input id="catalog-organization" name="organization" readOnly defaultValue="Synthetic organization" />
      <label htmlFor="catalog-method">Method</label>
      <select id="catalog-method" name="method">
        <option value="phone">Phone call</option>
        <option value="website">Website review</option>
        <option value="in_person">In person</option>
      </select>
      <label htmlFor="catalog-evidence">Evidence</label>
      <textarea id="catalog-evidence" name="evidence" />
      <fieldset aria-describedby="catalog-categories-hint">
        <legend>Support categories</legend>
        <p id="catalog-categories-hint">Choose at least one.</p>
        <label><input type="checkbox" name="categories" value="food" />Food</label>
        <label><input type="checkbox" name="categories" value="health" />Health</label>
        <label><input type="checkbox" name="categories" value="work" />Work</label>
      </fieldset>
      <label><input type="checkbox" name="consent" value="yes" />I agree to store these preferences</label>
    </form>

    <h2>Surfaces</h2>
    <div className="hero">
      <p className="eyebrow">Eyebrow</p>
      <p className="lede">A lede introduces a page in one or two plain sentences.</p>
    </div>
    <div className="grid">
      <article className="card" aria-labelledby="catalog-card-short">
        <span className="tag">98101</span>
        <h3 id="catalog-card-short">Synthetic food pantry</h3>
        <p>Sample listing text that shows how a card holds a short description.</p>
        <p className="small">Checked by an ORAN contributor</p>
        <p><a href="https://example.org" rel="noreferrer">Visit website</a></p>
      </article>
      <article className="card" aria-labelledby="catalog-card-long">
        <h3 id="catalog-card-long">{'Synthetic' + 'resource'.repeat(15)}</h3>
        <p>{'https://example.org/' + 'a-very-long-path-segment-'.repeat(6)}</p>
      </article>
    </div>
    <div className="stack">
      <p className="notice">A notice sits in the page flow without announcing itself.</p>
      <p className="notice" role="status">A status notice is announced politely when it appears.</p>
    </div>
    <p className="error">An error states what went wrong and what to do next.</p>

    <section aria-labelledby="catalog-safety" {...quickExitScope(true)}>
      <h2 id="catalog-safety">Safety</h2>
      <p className="small">This section marks the page as Safety results, so the top bar shows Exit and pressing Esc twice leaves for the neutral site.</p>
    </section>
  </section>;
}
