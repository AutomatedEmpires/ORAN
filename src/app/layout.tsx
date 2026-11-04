import type { Metadata } from 'next';
import Link from 'next/link';
import { ClerkProvider } from '@clerk/nextjs';
import { messages, changeLanguage } from '@/server/language';
import { LocaleProvider } from '@/ui/locale';
import { LogoMark } from '@/ui/logo';
import { DomainNav } from '@/ui/nav';
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
  <header><Link className="brand" href="/"><LogoMark/><span className="brand-name">ORAN</span>{' '}<span className="visually-hidden">{t.brand}</span></Link>
   <form className="language" action={changeLanguage}><label htmlFor="locale">{t.language}</label><select id="locale" name="locale" defaultValue={locale}><option value="en">English</option><option value="es">Español</option></select><button className="secondary button-compact">{t.apply}</button></form>
   <DomainNav label={t.navigation} items={[{href:'/',label:t.find},{href:'/profile',label:t.profile},{href:'/organization',label:t.organization},{href:'/community',label:t.community},{href:'/admin',label:t.admin}]}/>
  </header>{local?<aside className="notice local-notice">{t.localNotice} <Link href="/sign-in">{t.switchIdentity}</Link><form action="/api/dev-session" method="post"><input type="hidden" name="identity" value="sign-out"/><button className="secondary button-compact">{t.signOut}</button></form></aside>:null}<main id="main">{children}</main><footer><strong>{t.tagline}</strong><p>{t.crisis}</p></footer>
 </LocaleProvider>;
 return <html lang={locale}><body>{!local && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?<ClerkProvider>{body}</ClerkProvider>:body}</body></html>;
}
