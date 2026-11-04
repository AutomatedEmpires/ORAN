'use client';
import { Button } from '@/ui/button';
import { GetHelpNow } from '@/ui/get-help-now';
import { useMessages } from '@/ui/locale';
export default function ErrorPage({reset}:{reset:()=>void}) { const t=useMessages();return <><section role="alert"><h1>{t.error}</h1><p>{t.retryHelp}</p><Button type="button" onClick={reset}>{t.retry}</Button></section><GetHelpNow text={t} variant="inline"/></>; }
