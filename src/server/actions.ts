'use server';
import { revalidatePath } from 'next/cache';
import { acceptResource,addCategory,verifyResource } from '@/modules/catalog';
import { approveContributor } from '@/modules/community';
import { saveProfile,deleteProfile } from '@/modules/profiles';
import { requireActor } from '@/server/session';
import { messages } from '@/server/language';
export type ActionState={message:string;ok?:boolean};
const values=(form:FormData,names:string[])=>Object.fromEntries(names.map(n=>[n,String(form.get(n)??'')]));
function refresh(){for(const path of ['/','/admin','/organization','/community','/profile'])revalidatePath(path);}
export async function resourceAction(_:ActionState,form:FormData):Promise<ActionState>{
 const actor=await requireActor(),{text:t}=await messages();
 try {await acceptResource(actor.user_id,{...values(form,['name','description','organization_name','postal_code','eligibility_description','application_process','url','source_note']),categories:form.getAll('categories').map(String)},String(form.get('id')??'')||undefined);refresh();return {message:t.saved,ok:true};}
 catch{return {message:t.invalid};}
}
export async function addCategoryAction(_:ActionState,form:FormData):Promise<ActionState>{
 const actor=await requireActor(),{text:t}=await messages();
 try {await addCategory(actor.user_id,values(form,['code','label_en','label_es']));refresh();return {message:t.categoryAdded,ok:true};}
 catch(error){return {message:error instanceof Error&&error.message==='Category already exists'?t.categoryExists:t.invalid};}
}
export async function verificationAction(_:ActionState,form:FormData):Promise<ActionState>{
 const actor=await requireActor(),{text:t}=await messages();
 try {await verifyResource(actor.user_id,String(form.get('id')),values(form,['revision_id','method','evidence','fields_checked']));refresh();return {message:t.verified,ok:true};}
 catch{return {message:t.invalid};}
}
export async function approvalAction(_:ActionState,form:FormData):Promise<ActionState>{
 const actor=await requireActor(),{text:t}=await messages();
 try {await approveContributor(actor.user_id,String(form.get('user_id')),String(form.get('postal_code')),form.getAll('categories').map(String));refresh();return {message:t.dataSaved,ok:true};}
 catch{return {message:t.invalid};}
}
export async function profileAction(_:ActionState,form:FormData):Promise<ActionState>{
 const actor=await requireActor(),{text:t}=await messages();
 try {await saveProfile(actor.user_id,{postal_code:String(form.get('postal_code')),needs:form.getAll('needs').map(String),consent:form.get('consent')==='on'});refresh();return {message:t.profileSaved,ok:true};}
 catch{return {message:t.invalid};}
}
export async function eraseProfileAction(){
 const actor=await requireActor();await deleteProfile(actor.user_id);refresh();
}
