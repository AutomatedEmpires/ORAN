import Link from 'next/link';
import { messages } from '@/server/language';
export default async function NotFound() { const {text:t}=await messages();return <section><h1>{t.notFound}</h1><p>{t.moved}</p><Link href="/">{t.returnHome}</Link></section>; }
