### Task 4: Get help now

**Files:**
- Create: `src/ui/get-help-now.tsx`
- Modify:
  - `src/app/layout.tsx` (footer), `src/app/profile/page.tsx` (the row), `src/app/page.tsx` (outage), `src/app/error.tsx` (the card);
  - `src/app/globals.css`, `src/ui/en.json`, `src/ui/es.json`, `src/app/dev/components/page.tsx`;
  - `docs/DESIGN_SYSTEM.md`, `docs/ARCHITECTURE.md`, `README.md`;
  - `tests/safety-ui.test.ts`, `tests/browser/safety.spec.ts`.

**Interfaces:**
- Consumes: `buttonClassName` from `./button` (PR B); `saveNeeds` (Task 3); the catalog "Safety" section (Task 1).
- Produces:

```ts
// src/ui/get-help-now.tsx: no directive, because server pages and the client error page both render it
import type en from './en.json';
export type Messages = typeof en; // or slice 3's Messages, if main has it
export type HelpNumber = { key: '988' | '911' | 'dv' | '211'; phone: string; tel: string };
export const helpNumbers: readonly HelpNumber[] = [ // §5.6 order
  { key: '988', phone: '988', tel: 'tel:988' },
  { key: '911', phone: '911', tel: 'tel:911' },
  { key: 'dv', phone: '1-800-799-7233', tel: 'tel:+18007997233' },
  { key: '211', phone: '211', tel: 'tel:211' },
];
export function GetHelpNow({ text, variant = 'disclosure' }: { text: Messages; variant?: 'disclosure' | 'row' | 'inline' }): React.JSX.Element;
export function OutageState({ text }: { text: Messages }): React.JSX.Element;
```

  - **Lines, in every variant:** `<ul className="help-lines">`, with one `<li>` per number holding:
    - `<span>{text.helpLines[key].replace('{phone}', phone)}</span>`, which keeps the number as selectable plain text;
    - `<a className={buttonClassName('secondary')} href={tel}>{text.call.replace('{phone}', phone)}</a>`, the 44px call button.
  - **`disclosure` and `row`:**
    - markup: `<details className={'get-help' + (variant === 'row' ? ' get-help-row' : '')}><summary><span>{icon}{text.getHelpNow}</span></summary>{lines}</details>`;
    - closed by default; the native marker shows the state, and nothing animates.
  - **`inline`:** `<div className="get-help-inline"><h2>{icon}{text.getHelpNow}</h2>{lines}</div>`.
  - **`OutageState`:** `<><p className="notice" role="status">{text.unavailable}</p><GetHelpNow text={text} variant="inline"/></>`.
  - **Life-buoy icon:** hand-drawn, with the same SVG attributes as the exit icon: `<circle cx="12" cy="12" r="9"/>`, `<circle cx="12" cy="12" r="4"/>` and the path `M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6`.
- **Placements:**
  - **Footer:** `<footer><strong>{t.tagline}</strong><GetHelpNow text={t}/></footer>`, which replaces `<p>{t.crisis}</p>`.
  - **Profile:** `<GetHelpNow text={t} variant="row"/>`, placed between `<ProfileForm …/>` and the delete form. §4 puts the "Get help now" row before "Delete".
  - **`/`:** when `!available`, render `<OutageState text={t}/>` instead of the `t.unavailable` notice.
  - **`error.tsx`:** return `<><section role="alert">…unchanged…</section><GetHelpNow text={t} variant="inline"/></>`, so the alert announces only the error.
  - **Catalog "Safety" section:** add `<GetHelpNow text={en} variant="row"/>` and `<GetHelpNow text={en} variant="inline"/>`, with `import en from '@/ui/en.json'`, because the section is `lang="en"`.
- **Strings:** delete `crisis` from both catalogs.

| key | en | es (draft) |
|---|---|---|
| `getHelpNow` | Get help now | Obtén ayuda ahora |
| `call` | Call {phone} | Llamar al {phone} |
| `helpLines.988` | Suicide & Crisis Lifeline: call or text {phone} | Línea de Prevención del Suicidio y Crisis: llama o envía un mensaje de texto al {phone} |
| `helpLines.911` | In immediate danger: call {phone} | En peligro inmediato: llama al {phone} |
| `helpLines.dv` | National Domestic Violence Hotline: {phone} | Línea Nacional sobre la Violencia Doméstica: {phone} |
| `helpLines.211` | Local help with food, housing and bills: {phone} | Ayuda local con alimentos, vivienda y facturas: {phone} |

- **Rules:**

| Selector | Style |
|---|---|
| `.get-help` | margin-block `--space-4` |
| `.get-help summary` | `min-block-size: var(--size-target)`, `--color-primary`, bold, `cursor: pointer`. It keeps `display: list-item`, so the native marker shows open and closed |
| `.get-help summary > span` | inline-flex, centered, gap `--space-2`, `min-block-size: var(--size-target)`, `vertical-align: middle` |
| `.get-help-row` | `--color-surface`, `1px solid transparent` border, `--radius-card`, `--shadow-1`, padding-inline `--space-4` (the §5.4 ListRow) |
| `.help-lines` | grid, gap `--space-3`, margin 0, padding 0, no list style; inside `.get-help`, padding-block-end `--space-4` |
| `.help-lines li` | flex, wrap, centered, `justify-content: space-between`, gap `--space-2` `--space-3` |
| `.get-help-inline` | margin-block `--space-4`, padding `--space-3` `--space-4`, `1px solid transparent` border, `--radius-card`, `--color-primary-tint` background, `--color-text` |
| `.get-help-inline h2` | flex, centered, gap `--space-2`, margin-block `0` `--space-3` |
| `.get-help-inline .button-secondary:not(:hover, :active)` | `--color-surface` background, because a tint button on the tint card would have no edge |

- **Docs:**
  - **DESIGN_SYSTEM §5.6 GetHelpNow:**
    - after the "Where" bullets, add: "**Interim:** until the SideNav and ChatHistoryDrawer exist, a collapsed "Get help now" disclosure ends the footer of every page, so help stays in one place (§9, WCAG 3.2.6). It moves into those menus when they ship.";
    - append to the Panel bullet: "Each line gives the number as text and a "Call {phone}" secondary button (`tel:`).";
    - append to the Inline bullet: "Inside the card the call buttons use `--color-surface`, so their edges show against the tint."
  - **DESIGN_SYSTEM §7:** after "Features", add the row `| GetHelpNow panel | "Suicide & Crisis Lifeline: call or text {phone}"; "In immediate danger: call {phone}"; "National Domestic Violence Hotline: {phone}"; "Local help with food, housing and bills: {phone}"; "Call {phone}" | This document |`.
  - **DESIGN_SYSTEM §10:** add the bullet "QuickExit renders in every TopBar and shows only while the page holds an element with `data-quick-exit` (CSS `:has()`; browsers without it show it everywhere). Seeker pages add it with `quickExitScope(showsQuickExit(…))` from `src/ui/safety.ts`."
  - **DESIGN_SYSTEM §11:** remove "the GetHelpNow panel;" from the "Copy:" bullet.
  - **ARCHITECTURE.md**, at the end of the "Browser tests also check …" sentence, add: "Browser tests also check quick exit (one Esc never leaves; two within one second replace the page with https://www.weather.gov, intercepted and never contacted; it shows only on Safety and Housing & shelter results) and that the footer, Profile and outage and error screens list 988, 911, the domestic violence hotline and 211."
  - **README.md** "Implemented:" append "; quick exit with an Esc-twice shortcut on Safety and Housing & shelter results; "Get help now" on Profile, in the footer and on outage and error screens".

- [ ] **Step 1: Write the failing tests.**
  - In `tests/safety-ui.test.ts`:
    - `it('gives every help number English and Spanish text')`. For `en` and `es`:
      - `text.call` and each of `text.helpLines['988' | '911' | 'dv' | '211']` contain `{phone}`;
      - `Object.keys(es).sort()` equals `Object.keys(en).sort()`, and the same holds for `helpLines`;
      - `'crisis' in en` is false.
    - `it('renders the outage state with the crisis numbers in order')`. `html = renderToStaticMarkup(createElement(OutageState, { text: en }))`:
      - it contains `role="status"`, `en.unavailable`, `Suicide &amp; Crisis Lifeline: call or text 988` and `>Call 1-800-799-7233<`;
      - the indexes of `href="tel:988"`, `href="tel:911"`, `href="tel:+18007997233"` and `href="tel:211"` increase in that order;
      - it contains neither `{phone}` nor `<details`.
      - With `es`, it contains `Obtén ayuda ahora` and `>Llamar al 988<`.
    - `it('keeps the crisis numbers outside the error alert')`. `html = renderToStaticMarkup(createElement(ErrorPage, { reset() {} }))`, with `ErrorPage` from `@/app/error`:
      - it contains `role="alert"`, `Try again` and `href="tel:988"`;
      - `html.indexOf('</section>') < html.indexOf('Get help now')`.
  - In `tests/browser/safety.spec.ts`:
    - `test('every page ends with a closed Get help now in the footer')`. Check `/`, `/sign-in` and `/no-such-page`, then `/profile` after `enterAs(page, 'My profile')`. On each:
      - with `footer = page.getByRole('contentinfo')`, `footer.locator('summary', { hasText: 'Get help now' })` is visible and at least 44px tall;
      - `footer.locator('details')` has no `open` attribute;
      - `footer.getByRole('link', { name: 'Call 988', exact: true })` is hidden;
      - `page.getByText('If you are in immediate danger')` has count 0;
      - the banner has no text "Get help now".
    - `test('the footer panel lists the four numbers as text and call buttons')`, on `/sign-in` at 1280×800:
      - after `focusByKeyboard` on the summary, it shows the Blend ring; press `Enter`, and the details are `open`;
      - the footer's links have the names `['Call 988', 'Call 911', 'Call 1-800-799-7233', 'Call 211']` and the `href`s `['tel:988', 'tel:911', 'tel:+18007997233', 'tel:211']`, in order;
      - each link is at least 44px tall, with background `rgb(226, 238, 240)`;
      - the texts of `footer.locator('li > span')` contain `988`, `911`, `1-800-799-7233` and `211`, in order, and their `user-select` is not `none`;
      - `details.evaluate((d) => d.getAnimations({ subtree: true }).length)` is 0;
      - `accessible(page)` passes; press `Enter` again, and the details are closed.
    - `test('Profile has a Get help now row before Delete')`:
      - run `enterAs(page, 'My profile')` and `saveNeeds(page, ['Food'])`;
      - the row is `page.getByRole('main').locator('details', { has: page.locator('summary', { hasText: 'Get help now' }) })`, with background `rgb(255, 255, 255)`;
      - its summary's box lies below button "Save" and above button "Delete my saved preferences" (§4);
      - click the summary: its four call links are visible, and `accessible(page)` passes;
      - click "Delete my saved preferences".
    - `test('the outage card keeps visible edges and stays still')`, on `/dev/components`:
      - the card is the parent of `page.getByRole('main').getByRole('heading', { name: 'Get help now', level: 2 })`, with background `rgb(226, 238, 240)` and border-radius `14px`;
      - its call links have background `rgb(255, 255, 255)` and color `rgb(23, 89, 107)`, and are at least 44px tall;
      - under `forcedColors: 'active'`, the card's border-top-style is `solid` and its border-top-width is `1px`;
      - under `reducedMotion: 'reduce'`, the links' `transitionDuration` matches `/^0s(, 0s)*$/`;
      - with the catalog row open, `accessible(page)` passes.
    - `test('Exit and Get help now reflow at 320px in English and Spanish')`:
      - run `enterAs(page, 'My profile')` and `saveNeeds(page, ['Safety'])`;
      - at 320×800, open the main row and the footer disclosure. `fitsWidth` is true, Exit is in the viewport, and each main-row call link's `x + width` is at most 320;
      - select `es` and click "Apply", then `goto('/profile')`, and repeat the checks with `Obtén ayuda ahora`, `Llamar al 1-800-799-7233` and Exit named `Salir rápido a un sitio web neutral`;
      - finally, click "Borrar mis preferencias guardadas".
- [ ] **Step 2: Run** `gate test tests/safety-ui.test.ts`, then `gate test:e2e tests/browser/safety.spec.ts`. Expected: FAIL, because `get-help-now` is missing and the footer still shows the sentence.
- [ ] **Step 3: Implement** the component, the four placements, the catalog samples, the strings, the rules and the docs.
- [ ] **Step 4: Run** `gate test tests/safety-ui.test.ts` and `gate test:e2e tests/browser/safety.spec.ts tests/browser/component-catalog.spec.ts tests/browser/design-system.spec.ts`, then `run typecheck` and `run lint`. Expected: all PASS.
- [ ] **Step 5: Commit**

```powershell
git add src/ui/get-help-now.tsx src/app/layout.tsx src/app/profile/page.tsx src/app/page.tsx src/app/error.tsx src/app/globals.css src/ui/en.json src/ui/es.json src/app/dev/components/page.tsx docs/DESIGN_SYSTEM.md docs/ARCHITECTURE.md README.md tests/safety-ui.test.ts tests/browser/safety.spec.ts
git commit -m "feat: offer Get help now on Profile, in the footer and on outage screens" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

