import { requireActor } from '@/server/session';
import { messages } from '@/server/language';
import { communityPending,isAdmin,verifierScope } from '@/modules/identity';
import { listCategories,verificationQueue } from '@/modules/catalog';
import { VerificationForms } from '@/ui/resources';
import { ResourceForm } from '@/ui/forms';
export default async function Community(){
 const actor=await requireActor(),{text:t,locale}=await messages(),scope=verifierScope(actor),admin=isAdmin(actor),pending=communityPending(actor);
 if(!scope&&!admin&&!pending) return <p role="alert">{t.denied}</p>;
 if(!scope&&!admin) return <section><h1>{t.community}</h1><p className="notice">{t.scopePending}</p></section>;
 const [queue,all]=await Promise.all([verificationQueue(actor.user_id),listCategories(locale)]),categories=all.filter(c=>scope?.category_scope.includes(c.code));
 return <section><p className="eyebrow">{t.community}</p><h1>{t.queue}</h1><p>{t.communityIntro}</p>{scope?<p className="small">{t.scope}: {scope.postal_code} · {categories.map(c=>c.label).join(', ')}</p>:null}{queue.length?<VerificationForms items={queue}/>:<p>{t.noWork}</p>}{scope?<><h2>{t.create}</h2><ResourceForm categories={categories} resource={{postal_code:scope.postal_code,categories:categories.slice(0,1).map(c=>c.code)}}/></>:null}</section>;
}
