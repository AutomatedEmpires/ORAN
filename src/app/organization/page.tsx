import { requireActor } from '@/server/session';
import { messages } from '@/server/language';
import { isAdmin } from '@/modules/identity';
import { listCategories,listingOptions,ownedResources,organizationsFor } from '@/modules/catalog';
import { ResourceForm } from '@/ui/forms';
import { ResourceCards } from '@/ui/resources';
export default async function Organization(){
 const actor=await requireActor(),{text:t,locale}=await messages(),organizations=await organizationsFor(actor.user_id);
 if(!isAdmin(actor)&&!organizations.length) return <p role="alert">{t.denied}</p>;
 return <section><p className="eyebrow">{t.organization}</p><h1>{t.yourResources}</h1><p>{t.organizationIntro}</p><ResourceCards resources={await ownedResources(actor.user_id)} editable/><h2>{t.create}</h2><ResourceForm categories={await listCategories(locale)} resource={{organization_name:organizations.length===1?organizations[0].name:''}} lockOrganizationName={organizations.length===1} organizations={organizations} defaultSource={organizations.length?'organization':undefined} options={listingOptions}/></section>;
}
