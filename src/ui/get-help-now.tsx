// No directive: server pages and the client error page both render this module.
import type en from './en.json';
import { buttonClassName } from './button';

export type Messages = typeof en;
export type HelpNumber = { key: '988' | '911' | 'dv' | '211'; phone: string; tel: string };

// Static crisis numbers in the DESIGN_SYSTEM §5.6 order. No classifier chooses among them.
export const helpNumbers: readonly HelpNumber[] = [
  { key: '988', phone: '988', tel: 'tel:988' },
  { key: '911', phone: '911', tel: 'tel:911' },
  { key: 'dv', phone: '1-800-799-7233', tel: 'tel:+18007997233' },
  { key: '211', phone: '211', tel: 'tel:211' },
];

// A hand-drawn life buoy, drawn like the exit icon (§10), so the app adds no icon library.
const icon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" />
    <path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6" />
  </svg>
);

// Each number is plain text a person can select and copy, next to a 44px button that calls it.
function Lines({ text }: { text: Messages }): React.JSX.Element {
  return (
    <ul className="help-lines">
      {helpNumbers.map(({ key, phone, tel }) => (
        <li key={key}>
          <span>{text.helpLines[key].replace('{phone}', phone)}</span>
          <a className={buttonClassName('secondary')} href={tel}>{text.call.replace('{phone}', phone)}</a>
        </li>
      ))}
    </ul>
  );
}

// "Get help now" (§5.6, ADR-0007 §2). The disclosure and the row are native <details>, closed until opened and still: nothing animates.
// The inline card is for the outage and error screens only (C19); it is never shown on category results or searches.
export function GetHelpNow({ text, variant = 'disclosure' }: { text: Messages; variant?: 'disclosure' | 'row' | 'inline' }): React.JSX.Element {
  if (variant === 'inline') {
    return (
      <div className="get-help-inline">
        <h2>{icon}{text.getHelpNow}</h2>
        <Lines text={text} />
      </div>
    );
  }
  return (
    <details className={'get-help' + (variant === 'row' ? ' get-help-row' : '')}>
      <summary><span>{icon}{text.getHelpNow}</span></summary>
      <Lines text={text} />
    </details>
  );
}

// An honest outage message with the numbers beside it, so a person is not left with only an error (C19, BLUEPRINT §12.5).
export function OutageState({ text }: { text: Messages }): React.JSX.Element {
  return (
    <>
      <p className="notice" role="status">{text.unavailable}</p>
      <GetHelpNow text={text} variant="inline" />
    </>
  );
}
