'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import en from '@/ui/en.json';
import es from '@/ui/es.json';
export async function messages() { const locale=(await cookies()).get('oran-language')?.value==='es'?'es':'en'; return {locale, text:locale==='es'?es:en} as const; }
export async function changeLanguage(form:FormData) { (await cookies()).set('oran-language',form.get('locale')==='es'?'es':'en',{httpOnly:true,sameSite:'lax',path:'/',secure:process.env.NODE_ENV==='production'}); redirect('/'); }
