import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { config,readToken } from '@/modules/platform';
import { actorFor,ensureAccount } from '@/modules/identity';
export const currentActor = cache(async()=>{
 let userId:string|null=null;
 if(process.env.ORAN_LOCAL_DEV==='1') {
  config();
  const secret=process.env.ORAN_SESSION_SECRET;
  if(!secret) throw new Error('Local session secret is missing');
  userId=readToken((await cookies()).get('oran-session')?.value ?? '',secret);
 } else if(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
  const {auth}=await import('@clerk/nextjs/server');
  userId=(await auth()).userId;
  // Having an account makes you a seeker; roles are separate memberships.
  if(userId) await ensureAccount(userId,'Member');
 }
 return userId ? actorFor(userId) : null;
});
export async function requireActor() { const actor=await currentActor();if(!actor) redirect('/sign-in');return actor; }
