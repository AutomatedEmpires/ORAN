'use client';
import { useActionState, useEffect, useId, useRef, useState, useTransition } from 'react';
import { Button } from './button';
import { useMessages } from './locale';
import { resourceAction,profileAction,addCategoryAction,type ActionState } from '@/server/actions';
import type { Category } from '@/modules/catalog';
type Action=(state:ActionState,form:FormData)=>Promise<ActionState>;
export function ActionForm({action,children,label,onReset}:{action:Action;children:React.ReactNode;label:string;onReset?:()=>void}){
 const [state,submit,acting]=useActionState(action,{message:''}),[sending,startTransition]=useTransition(),t=useMessages(),ref=useRef<HTMLFormElement>(null),busy=acting||sending;
 // React 19 resets an uncontrolled form as soon as its action returns, which would wipe a rejected submission. So the form sends itself: a rejection keeps what was typed, and only a save resets the form. `action` stays for forms posted without JavaScript.
 useEffect(()=>{if(state.ok)ref.current?.reset();},[state]);
 // The status region is always in the page so that a screen reader announces what is put in it; the busy Button keeps its label and aria-busy is not reliably spoken.
 return <form ref={ref} action={submit} onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget,(e.nativeEvent as SubmitEvent).submitter);startTransition(()=>submit(data));}} onReset={onReset}>{children}<Button busy={busy}>{label}</Button><div role="status">{busy?<p>{t.pending}</p>:state.message?<p className={state.ok?'':'error'}>{state.message}</p>:null}</div></form>;
}
type Resource={id?:string;name?:string;description?:string;organization_name?:string;categories?:string[];postal_code?:string;eligibility_description?:string;application_process?:string;url?:string|null};
export function CategoryChecks({categories,name,selected=[],required=false}:{categories:Category[];name:string;selected?:readonly string[];required?:boolean}){
 const t=useMessages();
 const hint=useId();
 return <fieldset aria-describedby={required?hint:undefined}><legend>{t.categories}</legend>{required?<p id={hint}>{t.chooseAtLeastOne}</p>:null}{categories.map(c=><label key={c.code}><input type="checkbox" name={name} value={c.code} defaultChecked={selected.includes(c.code)}/>{c.label}</label>)}</fieldset>;
}
type Source='url'|'phone_call'|'organization';
export function ResourceForm({resource={},lockOrganizationName=false,categories,organizations=[],defaultSource}:{resource?:Resource;lockOrganizationName?:boolean;categories:Category[];organizations?:{id:string;name:string}[];defaultSource?:Source}){
 const t=useMessages(),prefix=useId(),[organizationId,setOrganizationId]=useState(organizations[0]?.id??''),choose=organizations.length>1&&!resource.id;
 // Offer only the sources the server accepts: only staff of the listing's organization may name the organization itself, and only a website source takes an address.
 const [source,setSource]=useState<Source|undefined>(defaultSource),sources=[['url',t.sourceWebsite],['phone_call',t.sourcePhoneCall],...(defaultSource==='organization'?[['organization',t.sourceOrganization] as const]:[])] as const;
 const textareas=[['description',t.description,10,3000],['eligibility_description',t.eligibility,3,2000],['application_process',t.intake,3,2000],['source_note',t.source,10,2000]] as const;
 const textarea=([name,label,min,max]:(typeof textareas)[number])=><div key={name}><label htmlFor={prefix+name}>{label}</label><textarea id={prefix+name} name={name} required minLength={min} maxLength={max} defaultValue={name==='source_note'?'':resource[name]??''}/></div>;
 const fields=[['name',t.name,3,150],['organization_name',t.organizationName,2,150],['postal_code',t.zip,5,5],['url',t.website,0,500]] as const;
 return <ActionForm action={resourceAction} label={resource.id?t.save:t.create} onReset={()=>setSource(defaultSource)}>
  <input type="hidden" name="id" value={resource.id??''}/>
  {fields.map(([name,label,min,max])=>name==='organization_name'&&choose?<div key={name}><label htmlFor={prefix+'organization_id'}>{t.chooseOrganization}</label><select id={prefix+'organization_id'} name="organization_id" value={organizationId} onChange={e=>setOrganizationId(e.target.value)}>{organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select><input type="hidden" name="organization_name" value={organizations.find(o=>o.id===organizationId)?.name??''}/></div>:<div key={name}><label htmlFor={prefix+name}>{label}</label><input id={prefix+name} name={name} defaultValue={resource[name]??''} readOnly={name==='organization_name'&&(lockOrganizationName||Boolean(resource.id))} required={name!=='url'} type={name==='url'?'url':'text'} minLength={min} maxLength={max} pattern={name==='postal_code'?'[0-9]{5}':undefined}/></div>)}
  <CategoryChecks categories={categories} name="categories" selected={resource.categories} required/>
  {textareas.slice(0,3).map(textarea)}
  <fieldset><legend>{t.sourceType}</legend>{sources.map(([value,text],i)=><label key={value}><input type="radio" name="source_type" value={value} required={i===0} checked={source===value} onChange={()=>setSource(value)}/>{text}</label>)}</fieldset>
  {source==='url'?<div><label htmlFor={prefix+'source_url'}>{t.sourceUrl}</label><input id={prefix+'source_url'} name="source_url" type="url" maxLength={500} required/></div>:null}
  {textarea(textareas[3])}
 </ActionForm>;
}
export function ProfileForm({profile,categories}:{profile?:{postal_code:string;needs:string[]};categories:Category[]}){
 const t=useMessages();
 return <ActionForm action={profileAction} label={t.save}><label htmlFor="profile-zip">{t.zip}</label><input id="profile-zip" name="postal_code" required pattern="[0-9]{5}" defaultValue={profile?.postal_code??''}/>
  <CategoryChecks categories={categories} name="needs" selected={profile?.needs} required/>
  <label><input type="checkbox" name="consent" required/>{t.consent}</label>
 </ActionForm>;
}
export function AddCategoryForm(){
 const t=useMessages(),prefix=useId(),hint=prefix+'hint';
 return <ActionForm action={addCategoryAction} label={t.addCategory}>{([['code',t.categoryCode,2,40],['label_en',t.labelEnglish,2,60],['label_es',t.labelSpanish,2,60]] as const).map(([name,label,min,max])=><div key={name}><label htmlFor={prefix+name}>{label}</label><input id={prefix+name} name={name} required minLength={min} maxLength={max} pattern={name==='code'?'[a-z][a-z0-9_]{1,39}':undefined} aria-describedby={name==='code'?hint:undefined}/>{name==='code'?<p id={hint}>{t.categoryCodeHint}</p>:null}</div>)}</ActionForm>;
}
