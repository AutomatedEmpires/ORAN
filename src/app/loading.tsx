'use client';
import { useMessages } from '@/ui/locale';
export default function Loading() { return <p role="status">{useMessages().loading}</p>; }
