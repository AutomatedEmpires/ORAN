import type { Metadata } from 'next';
import Link from 'next/link';
import { ClerkProvider } from '@clerk/nextjs';
import { messages, changeLanguage } from '@/server/language';
import { LocaleProvider } from '@/ui/locale';
import '@fontsource/figtree/latin-400.css';
import '@fontsource/figtree/latin-600.css';
import '@fontsource/figtree/latin-700.css';
import '@fontsource/figtree/latin-800.css';
import './globals.css';
export const metadata: Metadata = { title:'ORAN', description:'By the people. For the people.' };
export default async function RootLayout({ children }: Readonly<{children:React.ReactNode}>) {
 const {locale,text:t}=await messages();
 const local=process.env.ORAN_LOCAL_DEV==='1';
 const body=<LocaleProvider locale={locale}>
  <a className="skip" href="#main">{t.skip}</a>
  <header><Link className="brand" href="/">ORAN<span>{t.brand}</span></Link>
   <nav aria-label={t.navigation}><Link href="/">{t.find}</Link><Link href="/profile">{t.profile}</Link><Link href="/organization">{t.organization}</Link><Link href="/community">{t.community}</Link><Link href="/admin">{t.admin}</Link></nav>
   <form action={changeLanguage}><label htmlFor="locale">{t.language}</label><select id="locale" name="locale" defaultValue={locale}><option value="en">English</option><option value="es">Español</option></select><button>{t.apply}</button></form>
  </header>{local?<aside className="notice local-notice">{t.localNotice} <Link href="/sign-in">{t.switchIdentity}</Link><form action="/api/dev-session" method="post"><input type="hidden" name="identity" value="sign-out"/><button className="secondary">{t.signOut}</button></form></aside>:null}<main id="main">{children}</main><footer><strong>{t.tagline}</strong><p>{t.crisis}</p></footer>
 </LocaleProvider>;
 return <html lang={locale}><body>{!local && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?<ClerkProvider>{body}</ClerkProvider>:body}</body></html>;
}
