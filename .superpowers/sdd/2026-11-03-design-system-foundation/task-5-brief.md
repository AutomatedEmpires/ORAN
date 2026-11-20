### Task 5: Guarded `/dev/components` route with tokens and base-style samples

**Files:**
- Create: `src/app/dev/guard.ts`
- Create: `src/app/dev/components/page.tsx`
- Modify: `src/app/globals.css` (`.catalog-swatch` and the swatch list layout)
- Modify: `docs/ARCHITECTURE.md` ("Identity and route contract")
- Create: `tests/browser/component-catalog.spec.ts`

**Interfaces:**
- Consumes: `config` from `@/modules/platform`; Task 1 to Task 3 styles; the support helpers.
- Produces:
  - `catalogAllowed(env: Record<string, string | undefined>, host: string | null): boolean`. True only when every one of these holds; any exception returns false:
    - `env.ORAN_LOCAL_DEV === '1'`;
    - `env.NODE_ENV !== 'production'`;
    - `!env.VERCEL`;
    - `config(env)` returns without throwing, with `local === true` and `stage === 'development'`;
    - `new URL('http://' + host).hostname` is `127.0.0.1`, `localhost` or `[::1]`.
  - The page:
    - its first line is `// Authorization policy: local-launcher development only (catalogAllowed); otherwise not found. No identity, profile or catalog data.`;
    - it exports `dynamic = 'force-dynamic'` and `metadata: Metadata = { title: 'Component catalog', robots: { index: false, follow: false } }`;
    - it starts with `if (!catalogAllowed(process.env, (await headers()).get('host'))) notFound();`.
  - Content, inside `<section lang="en" aria-labelledby="catalog-title">`:
    - an h1 "Component catalog" and `p.small` "Development only. This page is not available in production or preview.";
    - these h2 sections, in order:
      1. **"Color tokens":** a `<ul>` labelled by its heading, with one `<li>` per §3.1 color in table order. Each item holds an `aria-hidden` `span.catalog-swatch` with `style={{ background: \`var(${name})\` }}`, and the name in `<code>`.
      2. **"Typography":** one `<p>` per size step reading `Size {step}: {size}/{line height}` (for example, "Size xl: 24px/30px"), styled with `var(--font-size-{step})` and `var(--line-height-{step})`. Then one `<p>` per weight, reading `Weight {name}`.
      3. **"Form controls":** a `<form action="/dev/components">` (GET) with:
         - textbox "Resource name";
         - textbox "ZIP code", described by `p.small` "Five digits";
         - textbox "Website" with `aria-invalid="true"` and the default value `example`, described by `p.error` "Enter a full web address that starts with https://";
         - a read-only textbox "Organization name" with the value "Synthetic organization";
         - select "Method" (Phone call, Website review, In person);
         - textarea "Evidence";
         - a fieldset with the legend "Support categories", the hint `p` "Choose at least one." and checkboxes "Food", "Health" and "Work";
         - checkbox "I agree to store these preferences".
      4. **"Surfaces":**
         - a `.hero` with `p.eyebrow` "Eyebrow" and a `p.lede`;
         - a `.grid` with two `article.card`s, each labelled by its h3:
           - h3 "Synthetic food pantry", with `.tag` "98101", a paragraph, `p.small` "Checked by an ORAN contributor" and link "Visit website" (`https://example.org`, `rel="noreferrer"`);
           - an h3 of `'Synthetic' + 'resource'.repeat(15)` with no spaces, and a `p` holding `'https://example.org/' + 'a-very-long-path-segment-'.repeat(6)`;
         - a `.stack` with one `p.notice` and one `p.notice` with `role="status"`;
         - one `p.error`.
  - `.catalog-swatch`: inline-block, a `--space-7` square, `1px solid var(--color-border)`, `--radius-badge`. The list is a grid with gap `--space-3`.
  - The ARCHITECTURE sentence: "GET /dev/components renders the design-system component catalog only in local launcher mode: config() accepts ORAN_LOCAL_DEV=1 (development stage, loopback database), NODE_ENV is not production, VERCEL is unset and the Host is loopback; otherwise it renders the not-found page. It reads no identity, profile or catalog data, is marked noindex and is not linked from navigation."

- [ ] **Step 1: Write the failing tests** in `tests/browser/component-catalog.spec.ts`:
  - `test('catalog guard admits only the local launcher on loopback')` (no page). Import `catalogAllowed` from `../../src/app/dev/guard`.

```ts
const local = { ORAN_LOCAL_DEV: '1', ORAN_ENV: 'development', NODE_ENV: 'development', DATABASE_URL: 'postgresql://oran@127.0.0.1:5432/oran' };
for (const host of ['127.0.0.1:3100', 'localhost:3000', '[::1]:3100']) expect(catalogAllowed(local, host)).toBe(true);
for (const env of [{ ...local, NODE_ENV: 'production' }, { ...local, VERCEL: '1' }, { ...local, ORAN_ENV: 'preview' },
  { ...local, ORAN_ENV: 'production' }, { ...local, ORAN_ENV: 'test' }, { ...local, ORAN_LOCAL_DEV: undefined },
  { ...local, ORAN_LOCAL_DEV: '0' }, { ...local, DATABASE_URL: 'postgresql://u:p@db.example.com/oran' }])
  expect(catalogAllowed(env, '127.0.0.1:3100')).toBe(false);
for (const host of ['oran.example', 'oran.example:3100', '127.0.0.1.evil.example', 'localhost.evil.example', '', null])
  expect(catalogAllowed(local, host)).toBe(false);
```

  - `test('catalog renders tokens and base styles accessibly at every width')`:
    - `page.goto('/dev/components')` returns status 200;
    - heading level 1 is "Component catalog", and level-2 headings "Color tokens", "Typography", "Form controls" and "Surfaces" exist;
    - the item texts of list "Color tokens" equal the keys of `documentedColors()`, in order;
    - textbox "Website" has `aria-invalid="true"`, `toHaveAccessibleDescription('Enter a full web address that starts with https://')` and border-top-color `rgb(180, 35, 24)`;
    - textbox "ZIP code" has the accessible description "Five digits";
    - the read-only "Organization name" has background `rgb(242, 244, 245)`;
    - the text "Size xl: 24px/30px" has font-size `24px` and line-height `30px`;
    - `accessible(page)` passes at 360×800 and 1280×800;
    - `fitsWidth(page)` is true at 320×800, which covers the long unbroken card.
  - `test('cards keep visible boundaries under forced colors')`: article "Synthetic food pantry" has box-shadow other than `none`, and border-top-style `solid` with width `1px`, both normally and under `emulateMedia({ forcedColors: 'active' })`.
  - `test('the catalog is not linked from the app')`: on `/` and `/sign-in`, `getByRole('link', { name: /catalog/i })` has count 0, and navigation "Main navigation" still has exactly five links.
- [ ] **Step 2: Run** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run.ps1 test:e2e tests/browser/component-catalog.spec.ts`. Expected: FAIL; the guard module is missing and the route returns 404.
- [ ] **Step 3: Implement** the guard, the page, the swatch rules and the ARCHITECTURE sentence. The page imports only `next/headers`, `next/navigation`, the guard and `@/ui/*`.
- [ ] **Step 4: Run** the spec, then `typecheck` and `lint`. Expected: all PASS.
- [ ] **Step 5: Commit**

```powershell
git add src/app/dev/guard.ts src/app/dev/components/page.tsx src/app/globals.css docs/ARCHITECTURE.md tests/browser/component-catalog.spec.ts
git commit -m "feat: add a local-only component catalog route" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

