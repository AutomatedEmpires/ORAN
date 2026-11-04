import { ButtonControl } from './button-control';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive' | 'destructive-confirm';
export type ButtonSize = 'default' | 'large' | 'compact';

// Primary and the default size are the base look and add no class of their own. Links that look like buttons use this too.
// This module has no 'use client' on purpose: a server component may call buttonClassName(), which a client module's
// exports do not allow. Only the click guard needs the browser, and it lives in button-control.tsx.
export function buttonClassName(variant: ButtonVariant = 'primary', size: ButtonSize = 'default'): string {
  return ['button', variant === 'primary' ? '' : 'button-' + variant, size === 'default' ? '' : 'button-' + size].filter(Boolean).join(' ');
}

export type ButtonProps = Omit<React.ComponentPropsWithRef<'button'>, 'className' | 'disabled'> & { variant?: ButtonVariant; size?: ButtonSize; disabled?: boolean; busy?: boolean };

export function Button({ variant, size, ...props }: ButtonProps): React.JSX.Element {
  return <ButtonControl {...props} className={buttonClassName(variant, size)} />;
}
