import { requireActor } from '@/server/session';
import { messages } from '@/server/language';
import { listCategories,verificationQueue } from '@/modules/catalog';
import { VerificationForms } from '@/ui/resources';
import { ResourceForm } from '@/ui/forms';
export default async function Community(){
 const actor=await requireActor(),{text:t,locale}=await messages();if(actor.role!=='community'&&actor.role!=='admin') return <p role="alert">{t.denied}</p>;
 if(!actor.approved) return <section><h1>{t.community}</h1><p className="notice">{t.scopePending}</p></section>;
 const [queue,all]=await Promise.all([verificationQueue(actor.user_id),listCategories(locale)]),categories=all.filter(c=>actor.category_scope.includes(c.code));
 return <section><p className="eyebrow">{t.community}</p><h1>{t.queue}</h1><p>{t.communityIntro}</p><p className="small">{t.scope}: {actor.postal_code} · {categories.map(c=>c.label).join(', ')}</p>{queue.length?<VerificationForms items={queue}/>:<p>{t.noWork}</p>}<h2>{t.create}</h2><ResourceForm categories={categories} resource={{postal_code:actor.postal_code??'',categories:categories.slice(0,1).map(c=>c.code)}}/></section>;
}
