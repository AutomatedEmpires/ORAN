import { expect } from '@playwright/test';
import { enterAs, focusByKeyboard, ring, saveNeeds, test } from './support';

// DESIGN_SYSTEM §5.4: screens outside forms.tsx use the Button primitive, so the class contract is the primitive's.

test('the profile delete is a destructive Button', async ({ page }) => {
  await enterAs(page, 'My profile');
  await saveNeeds(page, ['Food']);
  const remove = page.getByRole('button', { name: 'Delete my saved preferences', exact: true });

  await expect(remove).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(remove).toHaveCSS('color', 'rgb(180, 35, 24)');
  await expect(remove).toHaveCSS('font-weight', '700');
  expect((await remove.boundingBox())?.height, 'delete height').toBeGreaterThanOrEqual(44);
  // A Button never takes the native attribute, and a live one carries neither state.
  await expect(remove).not.toHaveAttribute('disabled');
  await expect(remove).not.toHaveAttribute('aria-disabled');

  await remove.hover();
  await expect(remove).toHaveCSS('background-color', 'rgb(253, 236, 234)');

  await focusByKeyboard(page, remove);
  expect(await ring(remove), 'focus ring').toEqual({ style: 'solid', width: '3px', color: 'rgb(23, 89, 107)', offset: '2px' });

  // The delete still posts its form: the saved profile is gone and the form is empty.
  await remove.click();
  await expect(remove).toHaveCount(0);
  await expect(page.getByLabel('Service ZIP code', { exact: true })).toHaveValue('');
});

test('sign-in identities use the Button primitive', async ({ page }) => {
  await page.goto('/sign-in');
  for (const identity of ['My profile', 'Organization', 'Community', 'Admin']) {
    await expect(page.getByRole('button', { name: 'Enter as ' + identity, exact: true })).toHaveAttribute('class', 'button');
  }
  await page.getByRole('button', { name: 'Enter as My profile', exact: true }).click();
  await expect(page).toHaveURL(/\/profile/);
});
