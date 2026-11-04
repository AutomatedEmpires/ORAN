import Link from 'next/link';
import { messages } from '@/server/language';
import { verificationAction } from '@/server/actions';
import { ActionForm } from './forms';
import { wallClock } from './listing-format';
import { formatPhone,weekDays,type ListingLocation,type ListingParts,type ServiceAreaValue } from '@/modules/catalog';
type Resource=ListingParts&{id:string;name:string;description:string;url?:string|null;eligibility_description:string;application_process:string;checked_at?:Date|null;next_review_due?:Date|null;check_method?:string|null;fields_checked?:string|null};
// The published service area as the card's tag.
function areaLabel(area:ServiceAreaValue,nationwide:string){
 switch(area.kind){case 'zip':return area.postal_codes.join(', ');case 'city':case 'county':return `${area.name}, ${area.state}`;case 'state':return area.state;case 'nationwide':return nationwide;}
}
// Phones, locations and hours as the public may see them. A confidential location is only ever "Call for location": its address, coordinates and name are not in the data this receives. `level` is the heading level of "Hours": 3 under a card's h2 title, 4 under a task's h3 title.
export async function ListingDetails({parts,level=3}:{parts:ListingParts;level?:3|4}){
 const {text:t,locale}=await messages(),{phones,locations,hours}=parts,when=wallClock(locale);
 const Hours=level===3?'h3':'h4',Exceptions=level===3?'h4':'h5';
 const place=(l:ListingLocation)=>{
  if(l.confidential)return t.callForLocation;
  if(l.access==='remote')return t.accessRemote;
  if(l.access==='phone')return t.accessPhone;
  const a=l.address;
  return [l.name,a&&`${[a.address_1,a.address_2,a.city].filter(Boolean).join(', ')}, ${a.state_province} ${a.postal_code}`].filter(Boolean).join(' · ');
 };
 return <>
  {/* The link dials the extension too (RFC 3966). */}
  {phones.map((p,i)=><p key={i}><a href={'tel:'+p.number+(p.extension!==null?';ext='+p.extension:'')}>{formatPhone(p.number)}</a>{p.extension!==null?' '+t.phoneExtension.replace('{n}',String(p.extension)):null}</p>)}
  {locations.map(l=><p key={l.id}>{place(l)}</p>)}
  <Hours>{t.hours}</Hours>
  {!hours?<p>{t.hoursUnknown}</p>:hours.kind==='always_open'?<p>{t.alwaysOpen}</p>:hours.kind==='by_appointment'?<p>{t.byAppointment}</p>:<>
   <dl>{weekDays.map(day=><div key={day}><dt>{t.days[day]}</dt><dd>{when.day(hours.weekly.filter(r=>r.day===day),t.closed)}</dd></div>)}</dl>
   <p className="small">{t.timesIn.replace('{zone}',t.timeZones[hours.time_zone])}</p>
   {hours.exceptions.length?<><Exceptions>{t.exceptionsHeading}</Exceptions><ul>{hours.exceptions.map((e,i)=><li key={i}>{when.range(e.from,e.to)}: {when.interval(e.opens_at,e.closes_at,t.closed)}{e.note?' · '+e.note:null}</li>)}</ul></>:null}
  </>}
 </>;
}
export async function ResourceCards({resources,editable=false}:{resources:Resource[];editable?:boolean}){
 const {text:t,locale}=await messages();
 return <div className="grid">{resources.map(r=><article className="card" key={r.id}>{r.service_area?<span className="tag">{areaLabel(r.service_area,t.areaNationwide)}</span>:null}<h2>{r.name}</h2><p>{r.description}</p><ListingDetails parts={r}/><h3>{t.eligibility}</h3><p>{r.eligibility_description}</p><h3>{t.intake}</h3><p>{r.application_process}</p><p className="small">{t.unknown}</p>{r.checked_at?<p className="small">{t.detailsChecked}: {r.checked_at.toLocaleDateString(locale)} · {t.due}: {r.next_review_due?.toLocaleDateString(locale)}</p>:<p className="small">{t.awaiting}</p>}{r.check_method?<p className="small">{t.method}: {r.check_method==='phone'?t.phone:r.check_method==='website'?t.webCheck:t.inPerson}. {t.fields}: {r.fields_checked}</p>:null}{r.url?<p><a href={r.url} rel="noreferrer">{t.contact}</a></p>:null}{editable?<Link href={'/resources/'+r.id+'/edit'}>{t.edit}</Link>:null}</article>)}</div>;
}
export async function VerificationForms({items}:{items:(Resource&{revision_id:string})[]}){
 const {text:t}=await messages();
 return <div className="stack">{items.map(r=><article key={r.id} className="card"><h3>{r.name}</h3><p>{r.description}</p><p>{t.eligibility}: {r.eligibility_description}</p><p>{t.intake}: {r.application_process}</p>{r.url?<a href={r.url} rel="noreferrer">{t.contact}</a>:null}<ListingDetails parts={r} level={4}/>{/* The form has its own heading, so it does not read as part of the hours. */}<h4>{t.verify}</h4><ActionForm action={verificationAction} label={t.verify}><input type="hidden" name="id" value={r.id}/><input type="hidden" name="revision_id" value={r.revision_id}/><label htmlFor={r.id+'method'}>{t.method}</label><select id={r.id+'method'} name="method"><option value="phone">{t.phone}</option><option value="website">{t.webCheck}</option><option value="in_person">{t.inPerson}</option></select><label htmlFor={r.id+'evidence'}>{t.evidence}</label><textarea id={r.id+'evidence'} name="evidence" required minLength={10} maxLength={2000}/><label htmlFor={r.id+'fields'}>{t.fields}</label><input id={r.id+'fields'} name="fields_checked" required minLength={5} maxLength={500}/></ActionForm></article>)}</div>;
}
