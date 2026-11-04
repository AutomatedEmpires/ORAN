import { SignIn } from '@clerk/nextjs';
import { messages } from '@/server/language';
import { Button } from '@/ui/button';
export const dynamic='force-dynamic';
export default async function SignInPage() {
 const {text:t}=await messages();
 if(process.env.ORAN_LOCAL_DEV==='1' && process.env.NODE_ENV!=='production' && !process.env.VERCEL) return <section><p className="eyebrow">{t.development}</p><h1>{t.signIn}</h1><p className="notice">{t.localNotice}</p><div className="grid">{[['dev-user',t.profile],['dev-org',t.organization],['dev-community',t.community],['dev-admin',t.admin]].map(([id,label])=><form className="card" action="/api/dev-session" method="post" key={id}><input type="hidden" name="identity" value={id}/><h2>{label}</h2><Button>{t.enter} {label}</Button></form>)}</div></section>;
 if(!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <section><h1>{t.signIn}</h1><p className="notice">{t.identityUnavailable}</p></section>;
 return <section><h1>{t.signIn}</h1><SignIn routing="hash" /></section>;
}
