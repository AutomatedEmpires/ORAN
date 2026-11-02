import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata = { title: 'ORAN', description: 'By the people. For the people.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <a className="skip" href="#main">Skip to content</a>
    <header><Link className="brand" href="/">ORAN<span>Open Resource Access Network</span></Link>
      <nav aria-label="Main navigation"><Link href="/">Find support</Link><Link href="/profile">My profile</Link><Link href="/organization">Organization</Link><Link href="/community">Community</Link><Link href="/admin">Admin</Link></nav>
    </header>
    <main id="main">{children}</main>
    <footer><strong>By the people. For the people.</strong><p>If you are in immediate danger, call 911. For crisis support, call or text 988. For local assistance, call 211.</p></footer>
  </body></html>;
}
