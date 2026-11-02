import { requireActor } from '@/server/session';
import { messages } from '@/server/language';
import { verificationQueue } from '@/modules/catalog';
import { VerificationForms } from '@/ui/resources';
import { ResourceForm } from '@/ui/forms';
export default async function Community(){
 const actor=await requireActor(),{text:t}=await messages();if(actor.role!=='community'&&actor.role!=='admin') return <p role="alert">{t.denied}</p>;
 if(!actor.approved) return <section><h1>{t.community}</h1><p className="notice">{t.scopePending}</p></section>;
 const queue=await verificationQueue(actor.user_id);
 return <section><p className="eyebrow">{t.community}</p><h1>{t.queue}</h1><p>{t.communityIntro}</p><p className="small">{t.scope}: {actor.postal_code} · {actor.category_scope.join(', ')}</p>{queue.length?<VerificationForms items={queue}/>:<p>{t.noWork}</p>}<h2>{t.create}</h2><ResourceForm resource={{postal_code:actor.postal_code??'',category:actor.category_scope[0]??'food'}}/></section>;
}
