import { ButtonControl } from './button-control';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive' | 'destructive-confirm';
export type ButtonSize = 'default' | 'large' | 'compact';

// Primary and the default size are the base look and add no class of their own. Links that look like buttons use this too.
// This module has no 'use client' on purpose: a server component may call buttonClassName(), which a client module's
// exports do not allow. Only the click guard needs the browser, and it lives in button-control.tsx.
//
// For callers of Button:
// - A server component may pass only serializable props. `onClick` and `ref` type-check there but fail at runtime.
// - `type` defaults to submit, as for a native button. Pass type="button" for an action that does not submit.
// - While disabled or busy, only `onClick` is guarded. Other handlers, and click handlers on a parent element, still run;
//   a native disabled button would suppress its click entirely.
// - A busy Button keeps its label, and aria-busy is not reliably spoken. A caller that needs a spoken cue renders the
//   pending text in a `role="status"` region that is always in the page (empty when idle).
export function buttonClassName(variant: ButtonVariant = 'primary', size: ButtonSize = 'default'): string {
  return ['button', variant === 'primary' ? '' : 'button-' + variant, size === 'default' ? '' : 'button-' + size].filter(Boolean).join(' ');
}

export type ButtonProps = Omit<React.ComponentPropsWithRef<'button'>, 'className' | 'disabled' | 'aria-disabled' | 'aria-busy'> & { variant?: ButtonVariant; size?: ButtonSize; disabled?: boolean; busy?: boolean };

export function Button({ variant, size, ...props }: ButtonProps): React.JSX.Element {
  return <ButtonControl {...props} className={buttonClassName(variant, size)} />;
}
