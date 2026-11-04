import { notFound } from 'next/navigation';
import { requireActor } from '@/server/session';
import { messages } from '@/server/language';
import { isAdmin,organizationIds } from '@/modules/identity';
import { editableResource,listCategories,listingOptions } from '@/modules/catalog';
import { ResourceForm } from '@/ui/forms';
export default async function Edit({params}:{params:Promise<{id:string}>}){
 const actor=await requireActor(),{text:t,locale}=await messages();
 if(!isAdmin(actor)&&!organizationIds(actor).length) return <p role="alert">{t.denied}</p>;
 const {id}=await params,resource=await editableResource(actor.user_id,id);if(!resource)notFound();
 return <section><h1>{t.edit}</h1><ResourceForm categories={await listCategories(locale)} resource={resource} options={listingOptions} defaultSource={organizationIds(actor).includes(resource.organization_id)?'organization':undefined}/></section>;
}
