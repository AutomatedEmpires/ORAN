import type { Metadata } from 'next';
import Link from 'next/link';
import { messages, changeLanguage } from '@/server/language';
import { LocaleProvider } from '@/ui/locale';
import './globals.css';
export const metadata: Metadata = { title:'ORAN', description:'By the people. For the people.' };
export default async function RootLayout({ children }: Readonly<{children:React.ReactNode}>) {
 const {locale,text:t}=await messages();
 return <html lang={locale}><body><LocaleProvider locale={locale}>
  <a className="skip" href="#main">{t.skip}</a>
  <header><Link className="brand" href="/">ORAN<span>{t.brand}</span></Link>
   <nav aria-label={t.navigation}><Link href="/">{t.find}</Link><Link href="/profile">{t.profile}</Link><Link href="/organization">{t.organization}</Link><Link href="/community">{t.community}</Link><Link href="/admin">{t.admin}</Link></nav>
   <form action={changeLanguage}><label htmlFor="locale">{t.language}</label><select id="locale" name="locale" defaultValue={locale}><option value="en">English</option><option value="es">Español</option></select><button>{t.apply}</button></form>
  </header><main id="main">{children}</main><footer><strong>{t.tagline}</strong><p>{t.crisis}</p></footer>
 </LocaleProvider></body></html>;
}
