import { NextResponse } from 'next/server';
import { config,sameOrigin,issueToken } from '@/modules/platform';
// Authorization policy: local-launcher identity only; loopback and exact origin.
export async function POST(request:Request) {
 if(process.env.ORAN_LOCAL_DEV!=='1') return new Response('Not found',{status:404});
 try {
  const cfg=config();sameOrigin(request);
  const form=await request.formData(), identity=String(form.get('identity'));
  const choices:Record<string,string>={'dev-admin':'/admin','dev-org':'/organization','dev-community':'/community','dev-user':'/profile'};
  if(identity==='sign-out') {
   const response=NextResponse.redirect(new URL('/',cfg.origin),303);
   response.cookies.delete('oran-session');return response;
  }
  if(!Object.hasOwn(choices,identity) || !process.env.ORAN_SESSION_SECRET) return new Response('Invalid identity',{status:400});
  const response=NextResponse.redirect(new URL(choices[identity],cfg.origin),303);
  response.cookies.set('oran-session',issueToken(identity,process.env.ORAN_SESSION_SECRET),{httpOnly:true,sameSite:'strict',path:'/',maxAge:3600});
  response.headers.set('Cache-Control','no-store');
  return response;
 } catch { return new Response('Request rejected',{status:403}); }
}
