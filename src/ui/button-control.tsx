'use client';

type ControlProps = Omit<React.ComponentPropsWithRef<'button'>, 'disabled'> & { disabled?: boolean; busy?: boolean };

// DESIGN_SYSTEM.md §5.4: a disabled or busy button stays focusable, so it never gets the native `disabled` attribute.
// It says so with aria-disabled and refuses the click instead. preventDefault also stops the submit that Enter, Space
// and a form's implicit submission each raise as a click on the button. The guard needs React, so a click before the page
// has hydrated still reaches the browser's own behavior. The label (children) is the caller's and never changes.
// This is the only client code of the Button; src/ui/button.tsx wraps it so that server components can use the class names.
export function ButtonControl({ disabled, busy, onClick, 'aria-disabled': ariaDisabled, 'aria-busy': ariaBusy, ...props }: ControlProps): React.JSX.Element {
  const inactive = Boolean(disabled || busy);
  return (
    <button
      {...props}
      aria-disabled={inactive ? true : ariaDisabled}
      aria-busy={busy ? true : ariaBusy}
      onClick={(event) => {
        if (inactive) event.preventDefault();
        else onClick?.(event);
      }}
    />
  );
}
