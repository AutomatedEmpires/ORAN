import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { config as environment } from '@/modules/platform';
const clerk=clerkMiddleware();
export default function proxy(request:NextRequest, event:NextFetchEvent) {
 if(process.env.ORAN_LOCAL_DEV==='1') {
  environment();
  if(!['127.0.0.1','localhost','[::1]'].includes(request.nextUrl.hostname)) return new NextResponse('Not found',{status:404});
  return NextResponse.next();
 }
 if(!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return NextResponse.next();
 return clerk(request,event);
}
export const config = { matcher:['/((?!_next|favicon.ico).*)'] };
