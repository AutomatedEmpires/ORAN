### Task 3: Exit on Safety and Housing & shelter results

**Files:**
- Modify: `src/app/page.tsx`, `src/app/profile/page.tsx` (the root `<section>` only)
- Modify: `tests/browser/support.ts`, `tests/browser/safety.spec.ts`

**Interfaces:**
- Consumes: `showsQuickExit` and `quickExitScope` (Task 1); `enterAs`.
- Produces:
  - **A page convention:** a seeker page spreads `quickExitScope(...)` on its root element.
    - A page about one listing passes that listing's `categories`. That covers slice 5's report page and the future Detail page.
    - Staff workspaces add no scope, because §5.6 covers seeker results only.
  - **`/`:** `<section {...quickExitScope(showsQuickExit(...resources.map((r) => r.categories)))}>`.
  - **`/profile`:** `<section {...quickExitScope(showsQuickExit(profile?.needs ?? [], ...resources.map((r) => r.categories)))}>`. The saved needs are the filter of its results.
  - **`saveNeeds(page: Page, labels: readonly string[]): Promise<void>`** in `tests/browser/support.ts`. On `/profile`, in English, it:
    - fills "Service ZIP code" with `98101`;
    - sets each category checkbox in the form with button "Save" to checked exactly when its name is in `labels`;
    - checks "I agree to store these preferences for personalized matching.";
    - clicks "Save" and waits for the `POST` response to `/profile`;
    - then expects button "Delete my saved preferences" to be visible.

- [ ] **Step 1: Write the failing tests** in `tests/browser/safety.spec.ts`.
  - `test('Exit follows the saved Safety and Housing & shelter needs')`:
    1. Run `enterAs(page, 'My profile')` and `saveNeeds(page, ['Food'])`. Exit is hidden.
    2. Run `saveNeeds(page, ['Safety'])`. Then:
       - Exit is visible, and `page` has `toHaveTitle('ORAN')`;
       - `new URL(page.url()).search` is `''`, and `page.url()` does not match `/safety|housing|seguridad|vivienda/i`;
       - `page.getByRole('main').getByRole('heading', { name: 'Get help now' })` has count 0, because no crisis card appears on results (ADR-0007 §2).
    3. **Client-side navigation:** click link "Organization" in navigation "Main navigation".
       - The main alert reads `You do not have access to this workspace.`, and Exit is hidden.
       - Press `Escape` twice: the URL still ends in `/organization`, and `visits` is empty.
    4. `goto('/profile')`: Exit is visible. Then `saveNeeds(page, ['Food'])`: Exit is hidden.
    5. Run `saveNeeds(page, ['Housing & shelter'])`. Exit is visible.
    6. Click "Delete my saved preferences". Exit is hidden.
  - `test('Exit shows on the directory once it lists a Safety listing')`:
    1. On `/`, Exit is hidden. Only this test publishes a Safety or Housing & shelter listing in a run.
    2. Run `publishSafetyListing(page)`, a helper local to the spec that returns the listing's name.
       - It copies the listing creation and verification steps of the first test in `main`'s `workflow.spec.ts`, as they are when this task starts.
       - It uses the name `'Synthetic safety listing ' + crypto.randomUUID()`, the resource form's checkbox "Safety" instead of "Food", and the source "A phone call".
       - On `/admin`, the admin records the verification. In the article that holds a level-3 heading with the name and the button "Record verification", choose Method "Phone call", fill "Evidence and source reference" and "Fields checked" with synthetic text, and click "Record verification". Expect that article to be gone.
       - If `main` already publishes on save (slice 3: the status reads "Saved and published."), fill main's required fields and skip the verification.
    3. On `/`:
       - the heading with the name is visible, and so is Exit;
       - the title is `ORAN`, and `page.url()` is exactly `http://127.0.0.1:3100/`;
       - main has no heading "Get help now";
       - `accessible(page)` passes.
- [ ] **Step 2: Run** `gate test:e2e tests/browser/safety.spec.ts`. Expected: FAIL. Exit stays hidden on `/profile` after Safety is saved.
- [ ] **Step 3: Implement** the two scope spreads and `saveNeeds`.
- [ ] **Step 4: Run** `gate test:e2e tests/browser/safety.spec.ts tests/browser/workflow.spec.ts` (the workflow still passes with a Safety listing published), then `run typecheck` and `run lint`. Expected: all PASS.
- [ ] **Step 5: Commit**

```powershell
git add src/app/page.tsx src/app/profile/page.tsx tests/browser/support.ts tests/browser/safety.spec.ts
git commit -m "feat: show quick exit on Safety and Housing & shelter results" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

