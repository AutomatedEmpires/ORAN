### Task 5: Button adoptions outside forms.tsx

**Files:**
- Modify: `src/app/profile/page.tsx` (the delete button), `src/app/error.tsx` (Retry), `src/app/sign-in/page.tsx` (the "Enter as …" buttons)
- Modify: `tests/safety-ui.test.ts`
- Create: `tests/browser/buttons.spec.ts`

**Interfaces:**
- Consumes: `Button` from `@/ui/button` (PR B); `saveNeeds` (Task 3).
- Produces:
  - profile: `<form action={eraseProfileAction}><Button variant="destructive">{t.deleteProfile}</Button></form>`;
  - `error.tsx`: `<Button type="button" onClick={reset}>{t.retry}</Button>`;
  - sign-in: `<Button>{t.enter} {label}</Button>`.
  - `ActionForm`'s native `<button disabled>` stays. Slice 2c adopts `<Button busy={pending}>` and the always-present status region (DS-15, DS-16).

- [ ] **Step 1: Write the failing tests.**
  - In `tests/safety-ui.test.ts`, extend "keeps the crisis numbers outside the error alert": the markup matches `/<button[^>]*type="button"[^>]*>Try again<\/button>/` and `/<button[^>]*class="button"[^>]*>Try again/`.
  - In `tests/browser/buttons.spec.ts`:
    - `test('the profile delete is a destructive Button')`. Run `enterAs(page, 'My profile')` and `saveNeeds(page, ['Food'])`. Button "Delete my saved preferences":
      - has background `rgba(0, 0, 0, 0)`, color `rgb(180, 35, 24)`, weight `700` and a height of at least 44px;
      - has no `disabled` and no `aria-disabled`;
      - after `hover()`, has background `rgb(253, 236, 234)`;
      - after `focusByKeyboard`, shows the Blend ring;
      - after a click, has count 0, and "Service ZIP code" has the value `''`.
    - `test('sign-in identities use the Button primitive')`:
      - on `/sign-in`, each button `Enter as My profile`, `Enter as Organization`, `Enter as Community` and `Enter as Admin` has `toHaveAttribute('class', 'button')`;
      - clicking "Enter as My profile" gives `toHaveURL(/\/profile/)`.
- [ ] **Step 2: Run** `gate test tests/safety-ui.test.ts`, then `gate test:e2e tests/browser/buttons.spec.ts`. Expected: FAIL. The delete button's background is `rgb(226, 238, 240)` (the `.secondary` class), and the sign-in buttons have no class.
- [ ] **Step 3: Implement** the three swaps.
- [ ] **Step 4: Run the full gate:** `run typecheck`, `run lint`, `gate test`, `gate build` and `gate test:e2e`. Expected: all PASS, with zero serious or critical axe violations.
  - Then save before-and-after screenshots for the PR from one temporary, uncommitted Playwright spec in a single gated run (DS-9). Save them under the scratchpad's `design-shots-c/` folder. Cover:
    - `/profile` with Safety saved and the row open;
    - `/` with the footer open;
    - the catalog's Safety section;
    - at 360px and at 1280px, in English and Spanish.
- [ ] **Step 5: Commit**

```powershell
git add src/app/profile/page.tsx src/app/error.tsx src/app/sign-in/page.tsx tests/safety-ui.test.ts tests/browser/buttons.spec.ts
git commit -m "feat: use the Button primitive for delete, retry and sign-in" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Rebase, push and open the PR.** Under DS-8, the controller may run this step after the final review.
  - Rebase on `main` and rerun the full gate.
  - Push, and open the PR "feat: Get help now, quick exit and Button adoptions (design PR C)". The description covers:
    - the findings above;
    - the placement rule and why Exit sits in the top bar;
    - the judgment calls marked ⚑;
    - that the Spanish strings are drafts;
    - the DESIGN_SYSTEM edits;
    - that `ActionForm` moved to slice 2c (DS-16);
    - the screenshots;
    - the deferred list below.

---

## Deferred

- **Slice 2c:** `ActionForm` uses `<Button busy={pending}>` and keeps `t.pending` in an always-present `role="status"` region (DS-15, DS-16).
- **SideNav and ChatHistoryDrawer:** each gets its "Get help now" row, and the footer disclosure is removed in the same PR.
- **Chat:**
  - QuickExit in the chat TopBar and in the desktop chat header;
  - the inline crisis card inside replies when someone shows signs of immediate danger.
- **Seeker shell:** the sticky TopBar with `scroll-padding`, which keeps Exit on screen on long lists.
- **Offline screen** (no service worker yet): it shows the inline card.
- **Slice 5 and Detail:** the report page and the future Detail page spread `quickExitScope(showsQuickExit(listing.categories))`. Seek's filters keep categories out of URLs and titles by default.
- **Icon library decision (§11):** the hand-drawn exit and life-buoy icons may be replaced then.

## Judgment calls

⚑ marks the calls that need the founder's attention.

1. ⚑ **Placement:** Exit shows on any seeker page that lists a Safety or Housing & shelter listing, or that filters by those needs. The unfiltered Home list therefore shows it whenever such a listing is published (ADR-0005 says "at minimum"). It narrows once Seek has category filters.
2. **Top bar, not the top of the results:** Exit sits in the top bar (§5.1, §5.6), one predictable place. The `data-quick-exit` marker and the CSS `:has()` rule keep it server-rendered, working without JavaScript and correct after client navigation. Browsers without `:has()` show it everywhere (fail-open).
3. ⚑ **Interim footer disclosure:** "Get help now" in the footer departs from ADR-0007's "menu only" until the SideNav and drawer exist. Profile needs sign-in, so without it anonymous visitors would have no help at all. It is recorded in DS §5.6 (C21).
4. ⚑ **Drafted copy:** the panel copy (four lines plus "Call {phone}") is drafted here, because DS §11 left it open, and recorded in DS §7. The Spanish strings need native-speaker review.
5. **Number order:** the numbers follow §5.6's order (988, 911, the hotline, 211). Each is plain text plus a `tel:` call button.
6. **Spanish name:** "Salir rápido a un sitio web neutral" keeps the visible word "Salir" in the accessible name (WCAG 2.5.3).
7. **Shortcut scope:** the shortcut is live only where Exit is rendered (§5.6's minimum), so a stray double Esc on other pages never loses input.
8. **What counts as a press:** a held Esc (auto-repeat) and an Esc consumed by IME composition are not presses. Esc inside a field still counts.
9. **Hiding at once:** Exit hides the page body before `location.replace`, so ORAN content never lingers on a slow network.
10. **No-JavaScript fallback:** without JavaScript or before hydration, Exit is a plain link with `rel="noreferrer"`. It reaches weather.gov but adds a history entry.
11. **No URL or title fix:** today no page puts a category in a URL or title. The tests pin that.
12. **Error page as outage screen:** `error.tsx` is treated as an outage screen, because people see it when the database is down. It gets the inline card, outside its alert. not-found does not.
13. **Call buttons on the card:** inside the tint card, the secondary call buttons use the white surface so their edges show. This is recorded in DS §5.6.
14. **Two disclosures on Profile:** Profile shows two "Get help now" disclosures, its row and the footer's. That is accepted to keep one consistent footer.
15. ⚑ **Not sticky yet:** the top bar is not sticky yet (the seeker shell is deferred). On long lists, phone users must scroll up to reach Exit; keyboards have Esc.
16. **Staff pages:** staff workspaces show no Exit, because §5.6 covers seeker results only.
17. **forms.tsx (DS-16):** this PR does not touch `forms.tsx`. No seam is needed, because the marker sits on the page's root section, not in a form.
18. **Class contract kept:** the `.secondary` and `button:disabled` styles stay, because the slice 4 and 5 plans still use that class contract.
19. **One PR:** one PR of about 200 authored lines, with no C1/C2 split.
