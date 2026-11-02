import { requireActor } from '@/server/session';
import { messages } from '@/server/language';
import { ownedResources,organizationFor } from '@/modules/catalog';
import { ResourceForm } from '@/ui/forms';
import { ResourceCards } from '@/ui/resources';
export default async function Organization(){
 const actor=await requireActor(),{text:t}=await messages();if(actor.role!=='organization'&&actor.role!=='admin') return <p role="alert">{t.denied}</p>;
 const name=actor.role==='organization'?(await organizationFor(actor.user_id)).name:'';
 return <section><p className="eyebrow">{t.organization}</p><h1>{t.yourResources}</h1><p>{t.organizationIntro}</p><ResourceCards resources={await ownedResources(actor.user_id)} editable/><h2>{t.create}</h2><ResourceForm resource={{organization_name:name}} lockOrganizationName={actor.role==='organization'}/></section>;
}
