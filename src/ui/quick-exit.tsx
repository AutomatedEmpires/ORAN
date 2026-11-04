'use client';
import { quickExitUrl } from './safety';

// Hides the page before the request starts, so nothing of ORAN stays on screen while a slow network answers.
// replace() puts no entry in the history. The Referrer-Policy header (same-origin, next.config.ts) keeps ORAN out of the request.
function leave(): void {
  document.body.hidden = true;
  window.location.replace(quickExitUrl);
}

// A plain link to the neutral site without JavaScript; with it, every click leaves in this tab, modifier keys included.
export function QuickExit({ label, name }: { label: string; name: string }): React.JSX.Element {
  return (
    <a
      className="quick-exit"
      href={quickExitUrl}
      rel="noreferrer"
      aria-label={name}
      onClick={(event) => {
        event.preventDefault();
        leave();
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
        <path d="M14 8l4 4-4 4" />
        <path d="M18 12H9" />
      </svg>
      {label}
    </a>
  );
}
