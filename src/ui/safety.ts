// No directive: server pages and the client control both import this module.
// Quick exit, DESIGN_SYSTEM §5.6 and ADR-0007 §3. Esc twice within the window leaves; the link leaves with one click.
export const quickExitUrl = 'https://www.weather.gov';
export const quickExitWindowMs = 1000;
// Category codes, never labels. Domestic violence resources fall under safety.
export const quickExitCategories: readonly string[] = ['safety', 'housing_shelter'];

// True when any of the lists holds one of the codes above.
export function showsQuickExit(...categoryLists: readonly (readonly string[])[]): boolean {
  return categoryLists.some((codes) => codes.some((code) => quickExitCategories.includes(code)));
}

// Spread onto a page's root element. The layout's top bar shows Exit while the page holds this marker (see globals.css).
export function quickExitScope(show: boolean): { 'data-quick-exit'?: '' } {
  return show ? { 'data-quick-exit': '' } : {};
}
