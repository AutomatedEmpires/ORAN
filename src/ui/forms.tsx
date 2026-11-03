'use client';
import { useActionState, useId } from 'react';
import { useMessages } from './locale';
import { resourceAction,profileAction,addCategoryAction,type ActionState } from '@/server/actions';
import type { Category } from '@/modules/catalog';
type Action=(state:ActionState,form:FormData)=>Promise<ActionState>;
export function ActionForm({action,children,label}:{action:Action;children:React.ReactNode;label:string}){
 const [state,submit,pending]=useActionState(action,{message:''}),t=useMessages();
 return <form action={submit}>{children}<button disabled={pending}>{pending?t.pending:label}</button>{state.message?<p role="status" className={state.ok?'':'error'}>{state.message}</p>:null}</form>;
}
type Resource={id?:string;name?:string;description?:string;organization_name?:string;categories?:string[];postal_code?:string;eligibility_description?:string;application_process?:string;url?:string|null};
export function CategoryChecks({categories,name,selected=[]}:{categories:Category[];name:string;selected?:readonly string[]}){
 const t=useMessages();
 return <fieldset><legend>{t.categories}</legend>{categories.map(c=><label key={c.code}><input type="checkbox" name={name} value={c.code} defaultChecked={selected.includes(c.code)}/>{c.label}</label>)}</fieldset>;
}
export function ResourceForm({resource={},lockOrganizationName=false,categories}:{resource?:Resource;lockOrganizationName?:boolean;categories:Category[]}){
 const t=useMessages(),prefix=useId();
 const fields=[['name',t.name,3,150],['organization_name',t.organizationName,2,150],['postal_code',t.zip,5,5],['url',t.website,0,500]] as const;
 return <ActionForm action={resourceAction} label={resource.id?t.save:t.create}>
  <input type="hidden" name="id" value={resource.id??''}/>
  {fields.map(([name,label,min,max])=><div key={name}><label htmlFor={prefix+name}>{label}</label><input id={prefix+name} name={name} defaultValue={resource[name]??''} readOnly={name==='organization_name'&&(lockOrganizationName||Boolean(resource.id))} required={name!=='url'} type={name==='url'?'url':'text'} minLength={min} maxLength={max} pattern={name==='postal_code'?'[0-9]{5}':undefined}/></div>)}
  <CategoryChecks categories={categories} name="categories" selected={resource.categories}/>
  {([['description',t.description,10,3000],['eligibility_description',t.eligibility,3,2000],['application_process',t.intake,3,2000],['source_note',t.source,10,2000]] as const).map(([name,label,min,max])=><div key={name}><label htmlFor={prefix+name}>{label}</label><textarea id={prefix+name} name={name} required minLength={min} maxLength={max} defaultValue={name==='source_note'?'':resource[name]??''}/></div>)}
 </ActionForm>;
}
export function ProfileForm({profile,categories}:{profile?:{postal_code:string;needs:string[]};categories:Category[]}){
 const t=useMessages();
 return <ActionForm action={profileAction} label={t.save}><label htmlFor="profile-zip">{t.zip}</label><input id="profile-zip" name="postal_code" required pattern="[0-9]{5}" defaultValue={profile?.postal_code??''}/>
  <CategoryChecks categories={categories} name="needs" selected={profile?.needs}/>
  <label><input type="checkbox" name="consent" required/>{t.consent}</label>
 </ActionForm>;
}
export function AddCategoryForm(){
 const t=useMessages(),prefix=useId();
 return <ActionForm action={addCategoryAction} label={t.addCategory}>{([['code',t.categoryCode,2,40],['label_en',t.labelEnglish,2,60],['label_es',t.labelSpanish,2,60]] as const).map(([name,label,min,max])=><div key={name}><label htmlFor={prefix+name}>{label}</label><input id={prefix+name} name={name} required minLength={min} maxLength={max} pattern={name==='code'?'[a-z][a-z0-9_]{1,39}':undefined}/></div>)}</ActionForm>;
}
