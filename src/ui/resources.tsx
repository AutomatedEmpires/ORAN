import Link from 'next/link';
import { messages } from '@/server/language';
import { verificationAction } from '@/server/actions';
import { ActionForm } from './forms';
type Resource={id:string;name:string;description:string;url?:string|null;eligibility_description:string;application_process:string;postal_code:string;checked_at?:Date|null;next_review_due?:Date|null;check_method?:string|null;fields_checked?:string|null};
export async function ResourceCards({resources,editable=false}:{resources:Resource[];editable?:boolean}){
 const {text:t,locale}=await messages();
 return <div className="grid">{resources.map(r=><article className="card" key={r.id}><span className="tag">{r.postal_code}</span><h2>{r.name}</h2><p>{r.description}</p><h3>{t.eligibility}</h3><p>{r.eligibility_description}</p><h3>{t.intake}</h3><p>{r.application_process}</p><p className="small">{t.unknown}</p>{r.checked_at?<p className="small">{t.detailsChecked}: {r.checked_at.toLocaleDateString(locale)} · {t.due}: {r.next_review_due?.toLocaleDateString(locale)}</p>:<p className="small">{t.awaiting}</p>}{r.check_method?<p className="small">{t.method}: {r.check_method==='phone'?t.phone:r.check_method==='website'?t.webCheck:t.inPerson}. {t.fields}: {r.fields_checked}</p>:null}{r.url?<p><a href={r.url} rel="noreferrer">{t.contact}</a></p>:null}{editable?<Link href={'/resources/'+r.id+'/edit'}>{t.edit}</Link>:null}</article>)}</div>;
}
export async function VerificationForms({items}:{items:(Resource&{revision_id:string})[]}){
 const {text:t}=await messages();
 return <div className="stack">{items.map(r=><article key={r.id} className="card"><h3>{r.name}</h3><p>{r.description}</p><p>{t.eligibility}: {r.eligibility_description}</p><p>{t.intake}: {r.application_process}</p>{r.url?<a href={r.url} rel="noreferrer">{t.contact}</a>:null}<ActionForm action={verificationAction} label={t.verify}><input type="hidden" name="id" value={r.id}/><input type="hidden" name="revision_id" value={r.revision_id}/><label htmlFor={r.id+'method'}>{t.method}</label><select id={r.id+'method'} name="method"><option value="phone">{t.phone}</option><option value="website">{t.webCheck}</option><option value="in_person">{t.inPerson}</option></select><label htmlFor={r.id+'evidence'}>{t.evidence}</label><textarea id={r.id+'evidence'} name="evidence" required minLength={10} maxLength={2000}/><label htmlFor={r.id+'fields'}>{t.fields}</label><input id={r.id+'fields'} name="fields_checked" required minLength={5} maxLength={500}/></ActionForm></article>)}</div>;
}
