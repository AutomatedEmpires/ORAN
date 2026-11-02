import { createHmac, timingSafeEqual } from 'node:crypto';
function signature(payload:string, secret:string) { return createHmac('sha256',secret).update(payload).digest('base64url'); }
export function issueToken(sub:string, secret:string, now=Date.now()) {
 const payload=Buffer.from(JSON.stringify({sub,exp:now+3600000})).toString('base64url');
 return payload+'.'+signature(payload,secret);
}
export function readToken(token:string, secret:string, now=Date.now()):string|null {
 try {
  const [payload,sig,...rest]=token.split('.');
  if (!payload || !sig || rest.length) return null;
  const expected=Buffer.from(signature(payload,secret)), supplied=Buffer.from(sig);
  if (expected.length!==supplied.length || !timingSafeEqual(expected,supplied)) return null;
  const claims=JSON.parse(Buffer.from(payload,'base64url').toString());
  return typeof claims.sub==='string' && typeof claims.exp==='number' && claims.exp>now ? claims.sub : null;
 } catch { return null; }
}
