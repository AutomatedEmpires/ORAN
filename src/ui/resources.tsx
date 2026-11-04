import Link from 'next/link';
import { messages } from '@/server/language';
import { verificationAction } from '@/server/actions';
import { ActionForm } from './forms';
import { formatPhone,weekDays,type ListingLocation,type ListingParts,type ServiceAreaValue } from '@/modules/catalog';
type Resource=ListingParts&{id:string;name:string;description:string;url?:string|null;eligibility_description:string;application_process:string;checked_at?:Date|null;next_review_due?:Date|null;check_method?:string|null;fields_checked?:string|null};
// The published service area as the card's tag.
function areaLabel(area:ServiceAreaValue,nationwide:string){
 switch(area.kind){case 'zip':return area.postal_codes.join(', ');case 'city':case 'county':return `${area.name}, ${area.state}`;case 'state':return area.state;case 'nationwide':return nationwide;}
}
// Phones, locations and hours as the public may see them. A confidential location is only ever "Call for location": its address, coordinates and name are not in the data this receives. Times and dates are stored as typed, so they are formatted in UTC and the server's time zone never shifts them.
export async function ListingDetails({parts}:{parts:ListingParts}){
 const {text:t,locale}=await messages(),{phones,locations,hours}=parts;
 const clock=new Intl.DateTimeFormat(locale,{hour:'numeric',minute:'2-digit',timeZone:'UTC'}),calendar=new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeZone:'UTC'});
 const at=(time:string)=>{const [h,m]=time.split(':').map(Number);return clock.format(Date.UTC(2000,0,1,h,m));};
 const on=(date:string)=>{const [y,m,d]=date.split('-').map(Number);return calendar.format(Date.UTC(y,m-1,d));};
 const times=(opens:string|null,closes:string|null)=>opens&&closes?`${at(opens)} – ${at(closes)}`:t.closed;
 const place=(l:ListingLocation)=>{
  if(l.confidential)return t.callForLocation;
  if(l.access==='remote')return t.accessRemote;
  if(l.access==='phone')return t.accessPhone;
  const a=l.address;
  return [l.name,a&&`${[a.address_1,a.address_2,a.city].filter(Boolean).join(', ')}, ${a.state_province} ${a.postal_code}`].filter(Boolean).join(' · ');
 };
 return <>
  {phones.map((p,i)=><p key={i}><a href={'tel:'+p.number}>{formatPhone(p.number)}</a>{p.extension!==null?' '+t.phoneExtension.replace('{n}',String(p.extension)):null}</p>)}
  {locations.map(l=><p key={l.id}>{place(l)}</p>)}
  <h3>{t.hours}</h3>
  {!hours?<p>{t.hoursUnknown}</p>:hours.kind==='always_open'?<p>{t.alwaysOpen}</p>:hours.kind==='by_appointment'?<p>{t.byAppointment}</p>:<>
   <dl>{weekDays.map(day=>{const rows=hours.weekly.filter(r=>r.day===day);return <div key={day}><dt>{t.days[day]}</dt><dd>{rows.length?rows.map(r=>times(r.opens_at,r.closes_at)).join(', '):t.closed}</dd></div>;})}</dl>
   <p className="small">{t.timesIn.replace('{zone}',t.timeZones[hours.time_zone])}</p>
   {hours.exceptions.length?<><h4>{t.exceptionsHeading}</h4><ul>{hours.exceptions.map((e,i)=><li key={i}>{e.to===e.from?on(e.from):`${on(e.from)} – ${on(e.to)}`}: {times(e.opens_at,e.closes_at)}{e.note?' · '+e.note:null}</li>)}</ul></>:null}
  </>}
 </>;
}
export async function ResourceCards({resources,editable=false}:{resources:Resource[];editable?:boolean}){
 const {text:t,locale}=await messages();
 return <div className="grid">{resources.map(r=><article className="card" key={r.id}>{r.service_area?<span className="tag">{areaLabel(r.service_area,t.areaNationwide)}</span>:null}<h2>{r.name}</h2><p>{r.description}</p><ListingDetails parts={r}/><h3>{t.eligibility}</h3><p>{r.eligibility_description}</p><h3>{t.intake}</h3><p>{r.application_process}</p><p className="small">{t.unknown}</p>{r.checked_at?<p className="small">{t.detailsChecked}: {r.checked_at.toLocaleDateString(locale)} · {t.due}: {r.next_review_due?.toLocaleDateString(locale)}</p>:<p className="small">{t.awaiting}</p>}{r.check_method?<p className="small">{t.method}: {r.check_method==='phone'?t.phone:r.check_method==='website'?t.webCheck:t.inPerson}. {t.fields}: {r.fields_checked}</p>:null}{r.url?<p><a href={r.url} rel="noreferrer">{t.contact}</a></p>:null}{editable?<Link href={'/resources/'+r.id+'/edit'}>{t.edit}</Link>:null}</article>)}</div>;
}
export async function VerificationForms({items}:{items:(Resource&{revision_id:string})[]}){
 const {text:t}=await messages();
 return <div className="stack">{items.map(r=><article key={r.id} className="card"><h3>{r.name}</h3><p>{r.description}</p><ListingDetails parts={r}/><p>{t.eligibility}: {r.eligibility_description}</p><p>{t.intake}: {r.application_process}</p>{r.url?<a href={r.url} rel="noreferrer">{t.contact}</a>:null}<ActionForm action={verificationAction} label={t.verify}><input type="hidden" name="id" value={r.id}/><input type="hidden" name="revision_id" value={r.revision_id}/><label htmlFor={r.id+'method'}>{t.method}</label><select id={r.id+'method'} name="method"><option value="phone">{t.phone}</option><option value="website">{t.webCheck}</option><option value="in_person">{t.inPerson}</option></select><label htmlFor={r.id+'evidence'}>{t.evidence}</label><textarea id={r.id+'evidence'} name="evidence" required minLength={10} maxLength={2000}/><label htmlFor={r.id+'fields'}>{t.fields}</label><input id={r.id+'fields'} name="fields_checked" required minLength={5} maxLength={500}/></ActionForm></article>)}</div>;
}
