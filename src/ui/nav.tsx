'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavItem = { href: string; label: string };

// The domain navigation. It renders on the server too, so the current page is marked without JavaScript.
export function DomainNav({ label, items }: { label: string; items: readonly NavItem[] }): React.JSX.Element {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      {items.map((item) => {
        const current = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link key={item.href} href={item.href} aria-current={current ? 'page' : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
