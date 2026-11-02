import { notFound } from 'next/navigation';
import { requireActor } from '@/server/session';
import { messages } from '@/server/language';
import { ownedResource } from '@/modules/catalog';
import { ResourceForm } from '@/ui/forms';
export default async function Edit({params}:{params:Promise<{id:string}>}){
 const actor=await requireActor(),{text:t}=await messages();
 if(actor.role!=='admin'&&actor.role!=='organization') return <p role="alert">{t.denied}</p>;
 const {id}=await params,resource=await ownedResource(actor.user_id,id);if(!resource)notFound();
 return <section><h1>{t.edit}</h1><ResourceForm resource={resource}/></section>;
}
