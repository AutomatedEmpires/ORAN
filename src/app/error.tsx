'use client';
import { useMessages } from '@/ui/locale';
export default function ErrorPage({reset}:{reset:()=>void}) { const t=useMessages();return <section role="alert"><h1>{t.error}</h1><p>{t.retryHelp}</p><button onClick={reset}>{t.retry}</button></section>; }
