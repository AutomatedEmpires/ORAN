'use client';
import { useActionState, useId } from 'react';
import { useMessages } from './locale';
import { resourceAction,profileAction,type ActionState } from '@/server/actions';
type Action=(state:ActionState,form:FormData)=>Promise<ActionState>;
export function ActionForm({action,children,label}:{action:Action;children:React.ReactNode;label:string}){
 const [state,submit,pending]=useActionState(action,{message:''}),t=useMessages();
 return <form action={submit}>{children}<button disabled={pending}>{pending?t.pending:label}</button>{state.message?<p role="status" className={state.ok?'':'error'}>{state.message}</p>:null}</form>;
}
const categories=['food','housing','health','work','legal','other'] as const;
type Resource={id?:string;name?:string;description?:string;organization_name?:string;category?:string;postal_code?:string;eligibility_description?:string;application_process?:string;url?:string|null};
export function ResourceForm({resource={},lockOrganizationName=false}:{resource?:Resource;lockOrganizationName?:boolean}){
 const t=useMessages(),prefix=useId();
 const fields=[['name',t.name,3,150],['organization_name',t.organizationName,2,150],['postal_code',t.zip,5,5],['url',t.website,0,500]] as const;
 return <ActionForm action={resourceAction} label={resource.id?t.save:t.create}>
  <input type="hidden" name="id" value={resource.id??''}/>
  {fields.map(([name,label,min,max])=><div key={name}><label htmlFor={prefix+name}>{label}</label><input id={prefix+name} name={name} defaultValue={resource[name]??''} readOnly={name==='organization_name'&&(lockOrganizationName||Boolean(resource.id))} required={name!=='url'} type={name==='url'?'url':'text'} minLength={min} maxLength={max} pattern={name==='postal_code'?'[0-9]{5}':undefined}/></div>)}
  <label htmlFor={prefix+'category'}>{t.category}</label><select id={prefix+'category'} name="category" defaultValue={resource.category??'food'}>{categories.map(c=><option key={c} value={c}>{t[c]}</option>)}</select>
  {([['description',t.description,10,3000],['eligibility_description',t.eligibility,3,2000],['application_process',t.intake,3,2000],['source_note',t.source,10,2000]] as const).map(([name,label,min,max])=><div key={name}><label htmlFor={prefix+name}>{label}</label><textarea id={prefix+name} name={name} required minLength={min} maxLength={max} defaultValue={name==='source_note'?'':resource[name]??''}/></div>)}
 </ActionForm>;
}
export function ProfileForm({profile}:{profile?:{postal_code:string;needs:string[]}}){
 const t=useMessages();
 return <ActionForm action={profileAction} label={t.save}><label htmlFor="profile-zip">{t.zip}</label><input id="profile-zip" name="postal_code" required pattern="[0-9]{5}" defaultValue={profile?.postal_code??''}/>
  <fieldset><legend>{t.category}</legend>{categories.map(c=><label key={c}><input type="checkbox" name="needs" value={c} defaultChecked={profile?.needs.includes(c)}/>{t[c]}</label>)}</fieldset>
  <label><input type="checkbox" name="consent" required/>{t.consent}</label>
 </ActionForm>;
}
