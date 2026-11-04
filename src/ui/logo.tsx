// The ORAN mark (DESIGN_SYSTEM §5.1): a rounded tile with a half-sun above a horizon and three rays.
// It is decorative; the link that holds it carries the name. Colors come from CSS (.logo-*), never from here.
export function LogoMark(): React.JSX.Element {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <rect className="logo-tile" width="28" height="28" rx="8" />
      <path className="logo-sun" d="M8 18a6 6 0 0 1 12 0z" />
      <path className="logo-rays" d="M14 10V8M8.3 12.3l-1.4-1.4M19.7 12.3l1.4-1.4" fill="none" strokeWidth="1.5" strokeLinecap="round" />
      <path className="logo-horizon" d="M6 18h16" fill="none" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
