'use client';
import { createContext, useContext } from 'react';
import en from './en.json';
import es from './es.json';
export type Locale = 'en' | 'es';
const Context = createContext<Locale>('en');
export function LocaleProvider({ locale, children }: { locale:Locale; children:React.ReactNode }) { return <Context.Provider value={locale}>{children}</Context.Provider>; }
export function useMessages() { return useContext(Context)==='es'?es:en; }
