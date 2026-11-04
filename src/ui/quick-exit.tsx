'use client';
import { useEffect, useRef } from 'react';
import { quickExitUrl, quickExitWindowMs } from './safety';

// Hides the page before the request starts, so nothing of ORAN stays on screen while a slow network answers.
// replace() puts no entry in the history. The Referrer-Policy header (same-origin, next.config.ts) keeps ORAN out of the request.
function leave(): void {
  document.body.hidden = true;
  window.location.replace(quickExitUrl);
}

// A plain link to the neutral site without JavaScript. With it, a click leaves in this tab whatever keys are held, and so does a
// middle click (which would open a background tab). A right click still opens the browser's own menu.
// Pressing Esc twice within a second leaves too, wherever the link is shown (DESIGN_SYSTEM §5.6, ADR-0007 §3).
export function QuickExit({ label, name }: { label: string; name: string }): React.JSX.Element {
  const link = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    let last = -Infinity;
    // Capture on window sees every Esc, even one that a dialog stops. Nothing here stops or cancels the key, so a single Esc still
    // closes dialogs and clears fields. A held key repeats keydown, and a composing IME uses Esc to cancel its own text; neither counts.
    // performance.now() is used because event.timeStamp is not under the test clock.
    function onKey(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || event.repeat || event.isComposing) return;
      // The top bar is in every page's layout and CSS hides the link off Safety pages, so a rendered link is the live signal.
      if (!link.current?.getClientRects().length) return;
      const now = performance.now();
      if (now - last <= quickExitWindowMs) leave();
      else last = now;
    }
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, []);

  return (
    <a
      ref={link}
      className="quick-exit"
      href={quickExitUrl}
      rel="noreferrer"
      aria-label={name}
      onClick={(event) => {
        event.preventDefault();
        leave();
      }}
      onAuxClick={(event) => {
        if (event.button !== 1) return;
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
