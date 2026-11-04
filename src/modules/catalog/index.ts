import { randomUUID } from 'node:crypto';
import { sql,type Kysely,type ExpressionBuilder } from 'kysely';
import { z } from 'zod';
import { database, lockCatalog, type DB } from '@/modules/platform';
import { actorFor, affiliatedOrganizationIds, canCreate, isAdmin, organizationIds, verifierScope } from '@/modules/identity';
import { acceptedValues, changedFields, fieldKey, recordRevision, type FieldValue, type JsonValue, type Origin } from './assertions';
import { applyFields, idList } from './apply';
import { hoursValue, locationInput, phoneValue, serviceAreaValue } from './parts';
import { listingParts, type ListingParts } from './projection';
export { fieldKey, changedFields } from './assertions';
export type { JsonValue, EntityType, Origin, Source, FieldValue } from './assertions';
export { usStates, usTimeZones, weekDays, listingOptions, partPatterns, partLimits, partMessages, normalizePhone, formatPhone, phoneValue, hoursValue, serviceAreaValue, addressValue, locationInput, areaRows } from './parts';
export type { UsTimeZone, WeekDay, LocationAccess, ListingOptions, PhoneValue, HoursValue, ServiceAreaValue, AddressValue, LocationValue } from './parts';
// listingParts stays inside the module: its editor audience is unauthorized, so editableResource is the only exported read that returns a confidential location's private fields (D5, S2-19).
export type { ListingLocation, ListingParts } from './projection';
export type Category = { code: string; label: string };
export async function listCategories(locale:'en'|'es', db:Kysely<DB> = database()):Promise<Category[]> {
 const rows = await db.selectFrom('taxonomy_term as t').innerJoin('category_display as d','d.term_id','t.id').select(['t.code','d.label_en','d.label_es']).orderBy('d.sort_order').execute();
 return rows.map(r=>({code:r.code,label:locale==='es'?r.label_es:r.label_en}));
}
export async function assertCategoryCodes(codes:readonly string[], db:Kysely<DB>):Promise<string[]> {
 const unique = [...new Set(codes)];
 const found = unique.length ? await db.selectFrom('taxonomy_term as t').innerJoin('category_display as d','d.term_id','t.id').select('t.code').where('t.code','in',unique).execute() : [];
 if (found.length !== unique.length) throw new Error('Unknown category');
 return unique;
}
const categoryTaxonomyId='7f3c2a10-0c5e-4d8e-9a51-0a0000000001';
export const categoryCodeList=z.array(z.string().regex(/^[a-z][a-z0-9_]{1,39}$/)).min(1).max(50);
const categoryInput=z.object({code:z.string().regex(/^[a-z][a-z0-9_]{1,39}$/,'Use lower-case letters, digits and underscores'),label_en:z.string().trim().min(2).max(60),label_es:z.string().trim().min(2).max(60)}).strict();
export async function addCategory(adminId:string, raw:unknown):Promise<string> {
 const input = categoryInput.parse(raw);
 return database().transaction().execute(async trx=>{
  await lockCatalog(trx);
  if (!isAdmin(await actorFor(adminId,trx))) throw new Error('Access denied');
  if (await trx.selectFrom('taxonomy_term').select('id').where('taxonomy_id','=',categoryTaxonomyId).where('code','=',input.code).executeTakeFirst()) throw new Error('Category already exists');
  const id = randomUUID();
  const last = await trx.selectFrom('category_display').select(sql<number>`COALESCE(MAX(sort_order),0)`.as('max')).executeTakeFirstOrThrow();
  await trx.insertInto('taxonomy_term').values({id,taxonomy_id:categoryTaxonomyId,code:input.code,name:input.label_en}).execute();
  await trx.insertInto('category_display').values({term_id:id,sort_order:Number(last.max)+1,label_en:input.label_en,label_es:input.label_es}).execute();
  await trx.insertInto('audit_event').values({id:randomUUID(),actor_id:adminId,action:'category.added',subject:input.code,detail:JSON.stringify({label_en:input.label_en,label_es:input.label_es})}).execute();
  return input.code;
 });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBuilder = ExpressionBuilder<any,any>;
// A service has at least one category attribute whose code is in `codes`.
function categoryAttributes(eb:AnyBuilder, codes:readonly string[]) {
 return eb.selectFrom('attribute as at').innerJoin('taxonomy_term as tt','tt.id','at.taxonomy_term_id').innerJoin('category_display as cd','cd.term_id','tt.id').where('at.link_entity','=','service').where('at.link_type','=','category').where('tt.code','in',codes.length?codes:['__none__']);
}
function hasCategory(eb:AnyBuilder, serviceRef:string, codes:readonly string[]) {
 return eb.exists(categoryAttributes(eb,codes).select('at.id').whereRef('at.link_id','=',serviceRef));
}
export async function serviceHasCategory(db:Kysely<DB>, serviceId:string, codes:readonly string[]) {
 return !!(await categoryAttributes(db as never,codes).select('at.id').where('at.link_id','=',serviceId).executeTakeFirst());
}
// The service-area rows that cover a ZIP code: a ZIP area for that code and, for discovery, a nationwide area. City, county and state areas match no ZIP yet (D4).
function areasCovering(eb:AnyBuilder, postalCode:string, scope:'discovery'|'verifier') {
 return eb.selectFrom('service_area as a').innerJoin('service_area_kind as k','k.service_area_id','a.id').where(e=>{const zip=e.and([e('k.kind','=','zip'),e('a.extent','=',postalCode)]);return scope==='verifier'?zip:e.or([zip,e('k.kind','=','nationwide')]);});
}
function coversPostalCode(eb:AnyBuilder, serviceRef:string, postalCode:string, scope:'discovery'|'verifier'='discovery') {
 return eb.exists(areasCovering(eb,postalCode,scope).select('a.id').whereRef('a.service_id','=',serviceRef));
}
// A verifier's geography is one ZIP: a service is in their area when one of its ZIP areas is that ZIP (city, county, state and nationwide areas are not). The queue uses the same predicate, so it never lists work that verification would reject.
export async function serviceInVerifierArea(db:Kysely<DB>, serviceId:string, postalCode:string):Promise<boolean> {
 return !!(await areasCovering(db as never,postalCode,'verifier').select('a.id').where('a.service_id','=',serviceId).executeTakeFirst());
}
const categoryCodes = (eb:AnyBuilder) => eb.fn.coalesce(eb.selectFrom('attribute as at').innerJoin('taxonomy_term as tt','tt.id','at.taxonomy_term_id').innerJoin('category_display as cd','cd.term_id','tt.id').select(sql<string[]>`COALESCE(array_agg(tt.code ORDER BY cd.sort_order),'{}')`.as('codes')).whereRef('at.link_id','=','s.id').where('at.link_entity','=','service').where('at.link_type','=','category'),sql<string[]>`'{}'::text[]`).as('categories');
// A web address as typed, kept as is when it already starts with a lower-case http(s):// and otherwise written out in full (`Https://x`, `https:/x` and `http:x` all become `https://x/`), so the database check on source addresses always holds.
const optionalUrl = z.union([z.literal(''),z.url().max(500).refine(v=>['https:','http:'].includes(new URL(v).protocol),'Use an HTTP or HTTPS address').transform(v=>/^https?:\/\//.test(v)?v:new URL(v).href)]);
export const resourceInput = z.object({
 name:z.string().trim().min(3).max(150), description:z.string().trim().min(10).max(3000),
 organization_name:z.string().trim().min(2).max(150), organization_id:z.uuid().optional(), categories:categoryCodeList,
 service_area:serviceAreaValue,
 eligibility_description:z.string().trim().min(3).max(2000), application_process:z.string().trim().min(3).max(2000),
 url:optionalUrl, source_type:z.enum(['url','phone_call','organization']), source_url:optionalUrl, source_note:z.string().trim().min(10).max(2000),
 // Parts left out are not asserted and stay as they are; an empty list or null asserts "none" or "unknown".
 phones:z.array(phoneValue).max(10).optional(), hours:hoursValue.optional(), locations:z.array(locationInput).max(10).optional(),
}).strict().superRefine((v,ctx)=>{
 if ((v.source_type === 'url') !== (v.source_url !== '')) ctx.addIssue({code:'custom',path:['source_url'],message:'Give a source web address only for a website source'});
 const ids = (v.locations ?? []).flatMap(l=>l.id ? [l.id] : []);
 if (new Set(ids).size !== ids.length) ctx.addIssue({code:'custom',path:['locations'],message:'List each location once'});
});
type ResourceInput = z.infer<typeof resourceInput>;
// The facts a submission states. `codes` are the listing's categories in display order; `location_ids` give each submitted location its id, in entry order; `current` holds the accepted values of the listing and its locations.
function listingFields(input:ResourceInput, ids:{service_id:string;organization_id:string;new_organization:boolean;location_ids:string[]}, codes:string[], current:ReadonlyMap<string,JsonValue>):FieldValue[] {
 const service = (field_path:string, value:JsonValue):FieldValue => ({entity_type:'service',entity_id:ids.service_id,field_path,value});
 const fields:FieldValue[] = [
  service('name',input.name), service('description',input.description), service('url',input.url || null),
  service('eligibility_description',input.eligibility_description), service('application_process',input.application_process),
  service('categories',codes), service('service_area',input.service_area),
  ...(ids.new_organization ? [{entity_type:'organization' as const,entity_id:ids.organization_id,field_path:'name',value:input.organization_name}] : []),
 ];
 if (input.phones !== undefined) fields.push(service('phones',input.phones.length ? input.phones : null));
 if (input.hours !== undefined) fields.push(service('hours',input.hours));
 if (input.locations !== undefined) {
  fields.push(service('locations',ids.location_ids.length ? ids.location_ids : null));
  input.locations.forEach((loc,i)=>{
   const location = (field_path:string, value:JsonValue):FieldValue => ({entity_type:'location',entity_id:ids.location_ids[i],field_path,value});
   // Safety makes a physical location confidential unless the input says otherwise (ADR-0006 §1), and leaving the flag out never makes a private address public (S2-16). Only a physical location can be confidential.
   const currentConfidential = current.get(fieldKey({entity_type:'location',entity_id:ids.location_ids[i],field_path:'confidential'}));
   const confidential = loc.confidential ?? (loc.access === 'physical' && (currentConfidential === true || codes.includes('safety')));
   fields.push(location('access',loc.access), location('confidential',confidential), location('name',loc.name), location('address',loc.address), location('coordinates',loc.coordinates));
  });
 }
 return fields;
}
const origins = {organization:'organization',admin:'admin',community:'verifier'} as const satisfies Record<string,Origin>;
export async function acceptResource(userId:string, raw:unknown, existingId?:string) {
 const input = resourceInput.parse(raw);
 return database().transaction().execute(async trx=>{
  await lockCatalog(trx);
  const actor = await actorFor(userId,trx), admin = isAdmin(actor), orgs = organizationIds(actor), scope = verifierScope(actor);
  const valid = await assertCategoryCodes(input.categories,trx);
  // Display order, as the legacy backfill stored categories, so the same categories in another order assert nothing new.
  const codes = (await listCategories('en',trx)).map(c=>c.code).filter(c=>valid.includes(c));
  if (!canCreate(actor)) throw new Error('Access denied');
  const existing = existingId ? await trx.selectFrom('service').selectAll().where('id','=',existingId).forUpdate().executeTakeFirstOrThrow() : null;
  // The listing's organization: its current owner or the one chosen.
  let organizationId = existing?.organization_id ?? input.organization_id;
  if (organizationId && !admin && !orgs.includes(organizationId)) throw new Error('Access denied');
  if (existing && input.organization_id && input.organization_id !== existing.organization_id) throw new Error('Organization changes require a separate organization update');
  // A verifier's area is one ZIP: they file only a listing whose area is exactly that ZIP, in their categories.
  const area = input.service_area, zips = area.kind === 'zip' ? area.postal_codes : [];
  const inScope = !!scope && zips.length > 0 && zips.every(z=>z===scope.postal_code) && codes.every(c=>scope.category_scope.includes(c));
  if (!organizationId && orgs.length) {
   // Staff file under their only organization when the name matches; admins and in-scope verifiers may name a new one.
   const matches = (await trx.selectFrom('organization').select('id').where('id','in',orgs).where('name','=',input.organization_name).execute()).map(o=>o.id);
   if (orgs.length === 1 && matches.length === 1) organizationId = matches[0];
   else if (matches.length || !(admin || inScope)) throw new Error(orgs.length === 1 ? 'Organization name changes require a separate organization update' : 'Choose an organization');
  }
  // The capacity used: staff filing for their own organization act for it, even when also admins; with no organization, a verifier files only inside their area and categories.
  const capacity = organizationId && orgs.includes(organizationId) ? 'organization' : admin ? 'admin' : 'community';
  if (capacity === 'community' && !inScope) throw new Error('Access denied');
  if (input.source_type === 'organization' && capacity !== 'organization') throw new Error('Only organization staff can name the organization as the source');
  const previousState = existing ? await trx.selectFrom('listing_state').select('created_by').where('service_id','=',existing.id).executeTakeFirstOrThrow() : null;
  // A new organization is created by applying its asserted name; an existing one keeps its name.
  const newOrganization = !organizationId;
  if (organizationId) {
   const owner = await trx.selectFrom('organization').select('name').where('id','=',organizationId).executeTakeFirst();
   if (!owner) throw new Error('Unknown organization');
   if (owner.name !== input.organization_name) throw new Error('Organization name changes require a separate organization update');
  } else organizationId = randomUUID();
  const id = existing?.id ?? randomUUID(), listing = {service_id:id,organization_id:organizationId,new_service:!existing,new_organization:newOrganization};
  // Current values: the service's, then those of the locations it lists.
  const current = existing ? await acceptedValues(trx,[id]) : new Map<string,JsonValue>();
  const currentLocations = idList(current.get(fieldKey({entity_type:'service',entity_id:id,field_path:'locations'})) ?? null);
  for (const [key,value] of await acceptedValues(trx,currentLocations)) current.set(key,value);
  // A location is edited only through a listing that already lists it, and only while it belongs to the listing's organization, so no submission reaches another listing's or organization's location.
  const kept = (input.locations ?? []).flatMap(l=>l.id ? [l.id] : []);
  if (kept.some(k=>!currentLocations.includes(k))) throw new Error('Access denied');
  if (kept.length && await trx.selectFrom('location').select('id').where('id','in',kept).where('organization_id','!=',organizationId).executeTakeFirst()) throw new Error('Access denied');
  const desired = listingFields(input,{...listing,location_ids:(input.locations ?? []).map(l=>l.id ?? randomUUID())},codes,current);
  const changed = changedFields(current,desired);
  await applyFields(trx,listing,desired,changed);
  const revisionId = await recordRevision(trx,{service_id:id,actor_id:actor.user_id,origin:origins[capacity],source:{source_type:input.source_type,source_url:input.source_url || null,source_note:input.source_note},current,changed});
  await trx.insertInto('listing_state').values({service_id:id,created_by:actor.user_id,revision_id:revisionId}).onConflict(o=>o.column('service_id').doUpdateSet({revision_id:revisionId,state:'unreviewed',checked_at:null,next_review_due:null})).execute();
  // A verifier in any of the listing's ZIPs; other areas go to admins. Ownership is never independent verification: skip candidates affiliated with this organization, approved or pending.
  const verifier = zips.length ? await trx.selectFrom('membership as m').select('m.user_id').where('m.role','=','community').where('m.approved','=',true).where('m.postal_code','in',zips).where(sql<boolean>`m.category_scope && ${codes}::text[]`).where('m.user_id','!=',actor.user_id).where('m.user_id','!=',previousState?.created_by ?? actor.user_id)
   .where(eb=>eb.not(eb.exists(eb.selectFrom('membership as staff').select('staff.id').whereRef('staff.user_id','=','m.user_id').where('staff.role','=','organization').where('staff.organization_id','=',organizationId)))).orderBy('m.user_id').executeTakeFirst() : undefined;
  await trx.insertInto('work_item').values({service_id:id,assigned_to:verifier?.user_id ?? null}).onConflict(o=>o.column('service_id').doUpdateSet({assigned_to:verifier?.user_id ?? null,due_at:new Date()})).execute();
  await trx.insertInto('audit_event').values({id:randomUUID(),actor_id:actor.user_id,action:existing?'resource.updated':'resource.created',subject:id,detail:JSON.stringify({asserted_by:capacity})}).execute();
  return id;
 });
}
// Each row with its listing parts as the public may see them; editableResource is the only editor read.
async function withParts<T extends {id:string}>(rows:T[]):Promise<(T & ListingParts)[]> {
 const parts = await listingParts(database(),rows.map(r=>r.id),{kind:'public'});
 return rows.map(r=>({...r,...parts.get(r.id)!}));
}
// Public discovery, resource cards and verification tasks are public reads: a confidential location's address, coordinates and name are never selected.
export async function publicResources(filters?:{postal_code:string;needs:readonly string[]}) {
 let query = database().selectFrom('service as s').innerJoin('listing_state as l','l.service_id','s.id')
 .select(['s.id','s.name','s.description','s.url','s.eligibility_description','s.application_process','l.checked_at','l.next_review_due'])
 .select(eb=>[categoryCodes(eb),eb.selectFrom('verification_event as v').select('v.method').whereRef('v.service_id','=','s.id').orderBy('v.observed_at','desc').orderBy('v.id','desc').limit(1).as('check_method'),eb.selectFrom('verification_event as v').select('v.fields_checked').whereRef('v.service_id','=','s.id').orderBy('v.observed_at','desc').orderBy('v.id','desc').limit(1).as('fields_checked')])
 .where('s.status','=','active').where('l.state','=','checked').where('l.next_review_due','>',new Date());
 if(filters){if(!filters.needs.length)return [];query=query.where(eb=>coversPostalCode(eb,'s.id',filters.postal_code)).where(eb=>hasCategory(eb,'s.id',filters.needs));}
 return withParts(await query.orderBy('s.name').limit(100).execute());
}
// The listings a user may edit: every listing for an admin and their organizations' listings for staff. Anyone else gets 'Access denied', and an invalid id gives none.
async function editableRows(userId:string,resourceId?:string) {
 const actor = await actorFor(userId), admin = isAdmin(actor), orgs = organizationIds(actor);
 if (!admin && !orgs.length) throw new Error('Access denied');
 if(resourceId&&!z.uuid().safeParse(resourceId).success)return [];
 let query = database().selectFrom('service as s').innerJoin('listing_state as l','l.service_id','s.id').innerJoin('organization as o','o.id','s.organization_id').select(eb=>[categoryCodes(eb)]).select(['s.id','s.name','s.description','s.url','s.eligibility_description','s.application_process','l.state','l.checked_at','l.next_review_due','o.name as organization_name','s.organization_id']);
 if (!admin) query = query.where('s.organization_id','in',orgs);
 if(resourceId)query=query.where('s.id','=',resourceId);
 return query.orderBy('s.name').limit(100).execute();
}
// Editors' resource cards are public reads too; only editableResource returns a confidential location's private fields.
export async function ownedResources(userId:string,resourceId?:string) {return withParts(await editableRows(userId,resourceId));}
export async function ownedResource(userId:string,resourceId:string){return (await ownedResources(userId,resourceId))[0];}
export type EditableResource = ListingParts & { id:string; organization_id:string; organization_name:string; name:string; description:string; url:string|null; eligibility_description:string; application_process:string; categories:string[] };
// The edit view, authorized like ownedResource, and the only read that returns a confidential location's address, coordinates and name, for the listing's own organization's locations only.
export async function editableResource(userId:string,serviceId:string):Promise<EditableResource|undefined> {
 const [row] = await editableRows(userId,serviceId);
 if (!row) return undefined;
 const parts = (await listingParts(database(),[row.id],{kind:'editor',organization_id:row.organization_id})).get(row.id)!;
 return {id:row.id,organization_id:row.organization_id,organization_name:row.organization_name,name:row.name,description:row.description,url:row.url,eligibility_description:row.eligibility_description,application_process:row.application_process,categories:row.categories,...parts};
}
export async function verificationQueue(userId:string) {
 const actor = await actorFor(userId), affiliated = affiliatedOrganizationIds(actor);
 let query = database().selectFrom('work_item as w').innerJoin('service as s','s.id','w.service_id').innerJoin('listing_state as l','l.service_id','s.id').select(['s.id','s.name','s.description','s.eligibility_description','s.application_process','s.url','w.due_at','l.revision_id']).where('w.due_at','<=',new Date());
 if (!isAdmin(actor)) {
  const scope = verifierScope(actor);
  if (!scope) throw new Error('Access denied');
  query = query.where('w.assigned_to','=',actor.user_id).where(eb=>coversPostalCode(eb,'s.id',scope.postal_code,'verifier')).where(eb=>hasCategory(eb,'s.id',scope.category_scope));
 }
 // Ownership is never independent verification, for admins too: hide every affiliated organization's work.
 if (affiliated.length) query = query.where('s.organization_id','not in',affiliated);
 return withParts(await query.orderBy('w.due_at').limit(100).execute());
}
export async function verifyResource(userId:string, serviceId:string, raw:unknown) {
 const input = z.object({revision_id:z.uuid(),method:z.enum(['phone','website','in_person']),evidence:z.string().trim().min(10).max(2000),fields_checked:z.string().trim().min(5).max(500)}).parse(raw);
 await database().transaction().execute(async trx=>{
  await lockCatalog(trx);
  const actor = await actorFor(userId,trx);
  const service = await trx.selectFrom('service').select('organization_id').where('id','=',serviceId).forUpdate().executeTakeFirstOrThrow();
  const item = await trx.selectFrom('work_item as w').innerJoin('listing_state as l','l.service_id','w.service_id').select(['w.assigned_to','l.created_by','l.revision_id']).where('w.service_id','=',serviceId).forUpdate().executeTakeFirstOrThrow();
  const scope = verifierScope(actor), admin = isAdmin(actor);
  // Nobody, admins included, verifies an organization they are affiliated with; a verifier checks only assigned, in-scope work they did not create.
  const permitted = !affiliatedOrganizationIds(actor).includes(service.organization_id) && (admin || (!!scope && item.assigned_to === actor.user_id && item.created_by !== actor.user_id && await serviceInVerifierArea(trx,serviceId,scope.postal_code) && await serviceHasCategory(trx,serviceId,scope.category_scope)));
  if (!permitted) throw new Error('Access denied');
  if (item.revision_id !== input.revision_id) throw new Error('The resource changed; review the current version');
  const now = new Date(), due = new Date(now.getTime()+30*86400000);
  await trx.insertInto('verification_event').values({id:randomUUID(),service_id:serviceId,actor_id:userId,method:input.method,evidence:input.evidence,fields_checked:input.fields_checked,expires_at:due}).execute();
  await trx.updateTable('listing_state').set({state:'checked',checked_at:now,next_review_due:due}).where('service_id','=',serviceId).execute();
  await trx.updateTable('work_item').set({due_at:due}).where('service_id','=',serviceId).execute();
  await trx.insertInto('audit_event').values({id:randomUUID(),actor_id:userId,action:'resource.verified',subject:serviceId,detail:JSON.stringify({method:input.method,fields:input.fields_checked,revision_id:input.revision_id,capacity:admin?'admin':'community'})}).execute();
 });
}

export async function organizationsFor(userId:string):Promise<{id:string;name:string}[]> {
 const ids = organizationIds(await actorFor(userId));
 return ids.length ? database().selectFrom('organization').select(['id','name']).where('id','in',ids).orderBy('name').execute() : [];
}
