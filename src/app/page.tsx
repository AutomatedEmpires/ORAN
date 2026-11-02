import { messages } from '@/server/language';
export default async function Home() { const {text:t}=await messages(); return <section className="hero"><p className="eyebrow">{t.eyebrow}</p><h1>{t.headline}</h1><p className="lede">{t.lede}</p><div className="notice">{t.scaffold}</div></section>; }
