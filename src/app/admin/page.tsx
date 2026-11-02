import { requireActor } from '@/server/session';
import { messages } from '@/server/language';
import { members } from '@/modules/community';
import { categories,ownedResources,verificationQueue } from '@/modules/catalog';
import { approvalAction } from '@/server/actions';
import { ActionForm,ResourceForm } from '@/ui/forms';
import { ResourceCards,VerificationForms } from '@/ui/resources';
export default async function Admin(){
 const actor=await requireActor(),{text:t}=await messages();if(actor.role!=='admin') return <p role="alert">{t.denied}</p>;
 const [resources,contributors,queue]=await Promise.all([ownedResources(actor.user_id),members(actor.user_id),verificationQueue(actor.user_id)]);
 return <section><p className="eyebrow">{t.admin}</p><h1>{t.create}</h1><ResourceForm/><h2>{t.yourResources}</h2><ResourceCards resources={resources} editable/><h2>{t.contributors}</h2><div className="grid">{contributors.map(c=><article className="card" key={c.user_id}><h3>{c.display_name}</h3><ActionForm action={approvalAction} label={t.approve}><input type="hidden" name="user_id" value={c.user_id}/><label htmlFor={c.user_id+'zip'}>{t.scope}</label><input id={c.user_id+'zip'} name="postal_code" pattern="[0-9]{5}" defaultValue={c.postal_code??''} required/><fieldset><legend>{t.category}</legend>{categories.map(cat=><label key={cat}><input type="checkbox" name="categories" value={cat} defaultChecked={c.category_scope.includes(cat)}/>{t[cat]}</label>)}</fieldset></ActionForm></article>)}</div><h2>{t.queue}</h2>{queue.length?<VerificationForms items={queue}/>:<p>{t.noWork}</p>}</section>;
}
