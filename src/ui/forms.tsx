'use client';
import { Fragment, useActionState, useEffect, useId, useRef, useState, useTransition } from 'react';
import { Button } from './button';
import { useMessages } from './locale';
import { resourceAction,profileAction,addCategoryAction,type ActionState } from '@/server/actions';
import type { Category,EditableResource,ListingOptions } from '@/modules/catalog';
type Action=(state:ActionState,form:FormData)=>Promise<ActionState>;
export function ActionForm({action,children,label,onReset}:{action:Action;children:React.ReactNode;label:string;onReset?:()=>void}){
 const [state,submit,acting]=useActionState(action,{message:''}),[sending,startTransition]=useTransition(),t=useMessages(),ref=useRef<HTMLFormElement>(null),busy=acting||sending;
 // React 19 resets an uncontrolled form as soon as its action returns, which would wipe a rejected submission. So the form sends itself: a rejection keeps what was typed, and only a save resets the form. `action` stays for forms posted without JavaScript.
 useEffect(()=>{if(state.ok)ref.current?.reset();},[state]);
 // The status region is always in the page so that a screen reader announces what is put in it; the busy Button keeps its label and aria-busy is not reliably spoken.
 return <form ref={ref} action={submit} onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget,(e.nativeEvent as SubmitEvent).submitter);startTransition(()=>submit(data));}} onReset={onReset}>{children}<Button busy={busy}>{label}</Button><div role="status">{busy?<p>{t.pending}</p>:state.message?<p className={state.ok?'':'error'}>{state.message}</p>:null}</div></form>;
}
type Resource=Partial<EditableResource>;
type Location=EditableResource['locations'][number];
type Privacy='private'|'public';
export function CategoryChecks({categories,name,selected=[],required=false,onToggle}:{categories:Category[];name:string;selected?:readonly string[];required?:boolean;onToggle?:(code:string,checked:boolean)=>void}){
 const t=useMessages();
 const hint=useId();
 return <fieldset aria-describedby={required?hint:undefined}><legend>{t.categories}</legend>{required?<p id={hint}>{t.chooseAtLeastOne}</p>:null}{categories.map(c=><label key={c.code}><input type="checkbox" name={name} value={c.code} defaultChecked={selected.includes(c.code)} onChange={onToggle&&(e=>onToggle(c.code,e.target.checked))}/>{c.label}</label>)}</fieldset>;
}
// The listing parts. Every section is rendered on every form and prefilled exactly as stored, because the server reads an empty section as "none" (listingFromForm): an edit of one field then asserts nothing new for the others.
// Repeated rows are numbered so a screen reader can tell them apart. The browser limits are the server's partLimits, passed in `options`.
type Limits=ListingOptions['limits'];
const nth=(text:string,n:number)=>text.replace('{n}',String(n));
function Field({id,label,...input}:{id:string;label:string}&React.ComponentProps<'input'>){return <div><label htmlFor={id}>{label}</label><input id={id} {...input}/></div>;}
// A select is keyed by its stored value. React applies a select's default only when it mounts, so after a save refreshes the page in place, the form's reset would otherwise bring back the value from when the page opened, and the next save would post it.
function StateSelect({id,label,name,value,states}:{id:string;label:string;name:string;value:string;states:readonly string[]}){const t=useMessages();return <div><label htmlFor={id}>{label}</label><select key={value} id={id} name={name} defaultValue={value}><option value="">{t.chooseState}</option>{states.map(s=><option key={s} value={s}>{s}</option>)}</select></div>;}
function Radios({name,checked,choices}:{name:string;checked:string;choices:readonly (readonly [string,string])[]}){return choices.map(([value,text])=><label key={value}><input type="radio" name={name} value={value} defaultChecked={checked===value}/>{text}</label>);}
function AreaFieldset({area,options}:{area?:Resource['service_area'];options:ListingOptions}){
 const t=useMessages(),id=useId();
 return <fieldset><legend>{t.serviceArea}</legend>
  <Radios name="area_kind" checked={area?.kind??'zip'} choices={[['zip',t.areaZip],['city',t.areaCity],['county',t.areaCounty],['state',t.areaState],['nationwide',t.areaNationwide]]}/>
  <Field id={id+'zips'} label={t.zipCodes} name="area_postal_codes" defaultValue={area?.kind==='zip'?area.postal_codes.join(', '):''} aria-describedby={id+'hint'}/>
  <p id={id+'hint'}>{t.zipCodesHint}</p>
  <Field id={id+'name'} label={t.areaName} name="area_name" maxLength={options.limits.areaName.max} defaultValue={area?.kind==='city'||area?.kind==='county'?area.name:''}/>
  <StateSelect id={id+'state'} label={t.state} name="area_state" value={area&&'state' in area?area.state:''} states={options.states}/>
 </fieldset>;
}
function PhoneFieldset({phones=[],limits}:{phones?:Resource['phones'];limits:Limits}){
 const t=useMessages(),id=useId();
 // One row per saved phone, and an empty row for a new one while there is room; an empty row is not a phone. The extension pattern allows partLimits.extension, 1 to 99999.
 return <fieldset><legend>{t.phones}</legend>{[...phones,...(phones.length<limits.phones.max?[{number:'',extension:null}]:[])].map((phone,i)=><fieldset key={i}><legend>{nth(t.phoneN,i+1)}</legend>
  <Field id={`${id}${i}number`} label={t.phoneNumber} name="phone_number" type="tel" defaultValue={phone.number}/>
  <Field id={`${id}${i}extension`} label={t.phoneExtensionLabel} name="phone_extension" inputMode="numeric" pattern="0*[1-9][0-9]{0,4}" defaultValue={phone.extension??''}/>
 </fieldset>)}</fieldset>;
}
const noRule={opens_at:'',closes_at:''},noException={from:'',to:'',opens_at:null,closes_at:null,note:''};
function HoursFieldset({hours,options,kind,onKind}:{hours?:Resource['hours'];options:ListingOptions;kind:string;onKind:(kind:string)=>void}){
 const t=useMessages(),id=useId(),weekly=hours?.kind==='weekly'?hours:null,exceptions=weekly?.exceptions??[],zone=weekly?.time_zone??'';
 // Typing a weekly time or an exception date while "Not known yet" is chosen switches to weekly hours, so what was typed is saved, or named in an error, and never dropped (S2-28). Clearing a field does not switch.
 const typed=(e:React.FormEvent)=>{if(kind==='unknown'&&(e.target as HTMLInputElement).value!=='')onKind('weekly');};
 const time=(key:string,label:string,name:string,value:string|null,hint?:string)=><Field key={key} id={id+key} label={label} name={name} type="time" defaultValue={value??''} aria-describedby={hint}/>;
 return <fieldset><legend>{t.hours}</legend>
  {([['unknown',t.hoursUnknownOption],['weekly',t.hoursWeekly],['always_open',t.alwaysOpen],['by_appointment',t.byAppointment]] as const).map(([value,text])=><label key={value}><input type="radio" name="hours_kind" value={value} checked={kind===value} onChange={()=>onKind(value)}/>{text}</label>)}
  {/* Keyed by the stored zone, as StateSelect is. */}
  <div><label htmlFor={id+'zone'}>{t.timeZone}</label><select key={zone} id={id+'zone'} name="hours_time_zone" defaultValue={zone}><option value="">{t.chooseTimeZone}</option>{options.timeZones.map(zone=><option key={zone} value={zone}>{t.timeZones[zone]}</option>)}</select></div>
  <p id={id+'closed'}>{t.closedHint}</p>
  {options.days.map(day=>{
   // One row per stored rule, so a day with two time ranges (a lunch break) keeps both, each in its own numbered group; a day without one gets an empty row.
   const rules=weekly?.weekly.filter(rule=>rule.day===day)??[],rows=rules.length?rules:[noRule];
   return <fieldset key={day} aria-describedby={id+'closed'} onInput={typed}><legend>{t.days[day]}</legend>{rows.map((rule,i)=>{
    const times=<>{time(`${day}${i}opens`,t.opens,`hours_${day}_opens`,rule.opens_at)}{time(`${day}${i}closes`,t.closes,`hours_${day}_closes`,rule.closes_at)}</>;
    return rows.length>1?<fieldset key={i}><legend>{nth(t.rangeN,i+1)}</legend>{times}</fieldset>:<Fragment key={i}>{times}</Fragment>;
   })}</fieldset>;
  })}
  {[...exceptions,...(exceptions.length<options.limits.exceptions.max?[noException]:[])].map((exception,i)=>{
   const key=`exception${i}`;
   return <fieldset key={key}><legend>{nth(t.exceptionN,i+1)}</legend>
    <Field id={id+key+'from'} label={t.dateFrom} name="exception_from" type="date" defaultValue={exception.from} onInput={typed}/>
    {/* A one-day exception leaves To empty, as it was typed: the parser reads an empty To as From, so moving the day means changing From only. */}
    <Field id={id+key+'to'} label={t.dateTo} name="exception_to" type="date" defaultValue={exception.to===exception.from?'':exception.to} onInput={typed}/>
    {time(key+'opens',t.opens,'exception_opens',exception.opens_at,id+key+'hint')}{time(key+'closes',t.closes,'exception_closes',exception.closes_at,id+key+'hint')}
    <p id={id+key+'hint'}>{t.exceptionHint}</p>
    <Field id={id+key+'note'} label={t.note} name="exception_note" defaultValue={exception.note} maxLength={options.limits.note.max}/>
   </fieldset>;
  })}
 </fieldset>;
}
function LocationFieldset({slot,location,options,privacy,onPrivacy}:{slot:number;location?:Location;options:ListingOptions;privacy?:Privacy;onPrivacy:(choice:Privacy)=>void}){
 const t=useMessages(),id=useId(),name=(field:string)=>`location_${slot}_${field}`,address=location?.address,{limits}=options;
 const text=(field:string,label:string,value:string|null|undefined,maxLength?:number)=><Field id={id+field} label={label} name={name(field)} defaultValue={value??''} maxLength={maxLength}/>;
 const coordinate=(field:'latitude'|'longitude',label:string)=><Field id={id+field} label={label} name={name(field)} type="number" step="any" min={limits[field].min} max={limits[field].max} defaultValue={location?.coordinates?.[field]??''} aria-describedby={id+'coordinates'}/>;
 return <fieldset><legend>{nth(t.locationN,slot+1)}</legend>
  <input type="hidden" name={name('id')} value={location?.id??''}/>
  <Radios name={name('access')} checked={location?.access??'none'} choices={[['physical',t.accessPhysical],['remote',t.accessRemote],['phone',t.accessPhone],...(location?[]:[['none',t.noLocation] as const])]}/>
  {/* Removing unlinks the location from this listing. Its stored address is kept and never shown; whether to scrub it is founder decision F8. */}
  {location?<label><input type="checkbox" name={name('remove')}/>{t.removeLocation}</label>:null}
  {text('name',t.locationName,location?.name,limits.locationName.max)}{text('address_1',t.address1,address?.address_1,limits.address1.max)}{text('address_2',t.address2,address?.address_2,limits.address2.max)}{text('city',t.city,address?.city,limits.city.max)}
  <StateSelect id={id+'state'} label={t.state} name={name('state')} value={address?.state_province??''} states={options.states}/>
  {text('postal_code',t.addressZip,address?.postal_code)}{coordinate('latitude',t.latitude)}{coordinate('longitude',t.longitude)}
  <p id={id+'coordinates'}>{t.coordinatesHint}</p>
  <fieldset><legend>{t.addressPrivacy}</legend>{([['private',t.confidential],['public',t.addressPublic]] as const).map(([value,text])=><label key={value}><input type="radio" name={name('confidential')} value={value} checked={privacy===value} onChange={()=>onPrivacy(value)}/>{text}</label>)}</fieldset>
 </fieldset>;
}
type Source='url'|'phone_call'|'organization';
export function ResourceForm({resource={},lockOrganizationName=false,categories,organizations=[],defaultSource,options}:{resource?:Resource;lockOrganizationName?:boolean;categories:Category[];organizations?:{id:string;name:string}[];defaultSource?:Source;options:ListingOptions}){
 const t=useMessages(),prefix=useId(),[organizationId,setOrganizationId]=useState(organizations[0]?.id??''),choose=organizations.length>1&&!resource.id;
 // Offer only the sources the server accepts: only staff of the listing's organization may name the organization itself, and only a website source takes an address.
 const [source,setSource]=useState<Source|undefined>(defaultSource),sources=[['url',t.sourceWebsite],['phone_call',t.sourcePhoneCall],...(defaultSource==='organization'?[['organization',t.sourceOrganization] as const]:[])] as const;
 // Safety makes a physical location private by default (ADR-0006 §1). A location's privacy radio shows, in this order:
 // - the person's choice;
 // - for a saved physical location: "private" when Safety was checked during this edit (S2-26), and otherwise its stored value, so an unchanged edit asserts nothing and a Safety listing keeps an address staff chose to show;
 // - for any other slot: "private" while Safety is checked;
 // - otherwise nothing. The form then sends no choice and the server decides (S2-24), so a form sent without JavaScript is safe too.
 const startsSafety=Boolean(resource.categories?.includes('safety')),[safety,setSafety]=useState(startsSafety),[chosen,setChosen]=useState<Partial<Record<number,Privacy>>>({}),added=safety&&!startsSafety;
 const startsHours=resource.hours?.kind??'unknown',[hoursKind,setHoursKind]=useState<string>(startsHours);
 const privacy=(slot:number,location?:Location):Privacy|undefined=>chosen[slot]??(location?.access==='physical'?(added||location.confidential?'private':'public'):safety?'private':undefined);
 // A full listing offers no empty location slot.
 const saved=resource.locations??[],slots=[...saved,...(saved.length<options.limits.locations.max?[undefined]:[])];
 const textareas=[['description',t.description,10,3000],['eligibility_description',t.eligibility,3,2000],['application_process',t.intake,3,2000],['source_note',t.source,10,2000]] as const;
 const textarea=([name,label,min,max]:(typeof textareas)[number])=><div key={name}><label htmlFor={prefix+name}>{label}</label><textarea id={prefix+name} name={name} required minLength={min} maxLength={max} defaultValue={name==='source_note'?'':resource[name]??''}/></div>;
 const fields=[['name',t.name,3,150],['organization_name',t.organizationName,2,150],['url',t.website,0,500]] as const;
 return <ActionForm action={resourceAction} label={resource.id?t.save:t.create} onReset={()=>{setSource(defaultSource);setSafety(startsSafety);setChosen({});setHoursKind(startsHours);}}>
  <input type="hidden" name="id" value={resource.id??''}/>
  {fields.map(([name,label,min,max])=>name==='organization_name'&&choose?<div key={name}><label htmlFor={prefix+'organization_id'}>{t.chooseOrganization}</label><select id={prefix+'organization_id'} name="organization_id" value={organizationId} onChange={e=>setOrganizationId(e.target.value)}>{organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select><input type="hidden" name="organization_name" value={organizations.find(o=>o.id===organizationId)?.name??''}/></div>:<div key={name}><label htmlFor={prefix+name}>{label}</label><input id={prefix+name} name={name} defaultValue={resource[name]??''} readOnly={name==='organization_name'&&(lockOrganizationName||Boolean(resource.id))} required={name!=='url'} type={name==='url'?'url':'text'} minLength={min} maxLength={max}/></div>)}
  <CategoryChecks categories={categories} name="categories" selected={resource.categories} required onToggle={(code,checked)=>{if(code==='safety')setSafety(checked);}}/>
  {textareas.slice(0,3).map(textarea)}
  <AreaFieldset area={resource.service_area} options={options}/>
  <PhoneFieldset phones={resource.phones} limits={options.limits}/>
  <HoursFieldset hours={resource.hours} options={options} kind={hoursKind} onKind={setHoursKind}/>
  {slots.map((location,slot)=><LocationFieldset key={location?.id??'new'} slot={slot} location={location} options={options} privacy={privacy(slot,location)} onPrivacy={choice=>setChosen(current=>({...current,[slot]:choice}))}/>)}
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
