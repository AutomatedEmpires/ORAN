### Task 2: Self-hosted Figtree

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (through `add`)
- Modify: `src/app/layout.tsx` (four imports directly above `import './globals.css'`)
- Modify: `src/app/globals.css` (in `body`, change only `font-family` to `var(--font-family-base)`)
- Modify: `docs/ARCHITECTURE.md`
- Modify: `tests/browser/support.ts`, `tests/browser/design-system.spec.ts`

**Interfaces:**
- Consumes: `--font-family-base` (Task 1).
- Produces:
  - `enterAs(page: Page, identity: 'Admin' | 'Organization' | 'Community' | 'My profile'): Promise<void>`. Goes to `/sign-in`, clicks the button named exactly `Enter as ${identity}`, then waits until the URL no longer contains `/sign-in`.
  - In ARCHITECTURE.md:
    - a dependency row: `| @fontsource/figtree | Self-hosted Figtree (SIL OFL 1.1): Latin files for weights 400, 600, 700 and 800, bundled at build; no runtime third-party font requests |`;
    - in place of "System fonts avoid build-time font downloads.": "Figtree is self-hosted from the pinned @fontsource/figtree package (Latin, four weights, font-display: swap), so neither the build nor the browser contacts a font service."

- [ ] **Step 1: Write the failing tests:**
  - `test('seeker pages load self-hosted Figtree and never contact Google Fonts')`:
    - record every `page.on('request')` URL for the whole test;
    - visit `/` and `/sign-in`, then call `enterAs(page, 'My profile')`, which lands on `/profile`;
    - on each page, `await page.evaluate(() => document.fonts.ready)`, then read `[...document.fonts].filter(f => f.family.replace(/["']/g, '') === 'Figtree')`;
    - their sorted `weight`s equal `['400','600','700','800']`, every `display` is `'swap'` and every `style` is `'normal'`; the `'400'` face's `status` is `'loaded'`;
    - `getComputedStyle(document.body).fontFamily` matches `/^["']?Figtree["']?,/`;
    - no recorded URL matches `/fonts\.(googleapis|gstatic)\.com/`;
    - every URL whose path ends in `.woff2` or `.woff` has the origin `http://127.0.0.1:3100`, and at least one `.woff2` was requested.
  - `test('text renders in the fallback stack when font files fail')`:
    - `page.route(/\.woff2?(\?.*)?$/, route => route.abort())`, then `page.goto('/')`;
    - `getByRole('heading', { level: 1 })` is visible;
    - the body's font-family still matches the pattern above;
    - no request went to a Google host.
- [ ] **Step 2: Run** `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run.ps1 test:e2e tests/browser/design-system.spec.ts`. Expected: FAIL; no Figtree faces.
- [ ] **Step 3: Install and wire the font.**
  - Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run.ps1 add @fontsource/figtree@5.3.0`. `.npmrc` has `save-exact`, so `dependencies` gains `"@fontsource/figtree": "5.3.0"`.
  - Add `import '@fontsource/figtree/latin-400.css';` and the same for 600, 700 and 800 to `layout.tsx`.
  - Change `body`'s font-family and edit ARCHITECTURE.md as above.
- [ ] **Step 4: Run** the spec, then `build`. Expected: PASS; the build emits the four woff2 files under `.next/static/media`.
- [ ] **Step 5: Commit**

```powershell
git add package.json pnpm-lock.yaml src/app/layout.tsx src/app/globals.css docs/ARCHITECTURE.md tests/browser/support.ts tests/browser/design-system.spec.ts
git commit -m "feat: self-host Figtree in four Latin weights" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

