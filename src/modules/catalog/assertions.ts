import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { sql, type Kysely } from 'kysely';
import type { DB } from '@/modules/platform';
// Provenance: one accepted value per field, with the submission (revision) that carried it. History is kept as superseded rows.
export type JsonValue = DB['field_assertion']['value'];
export type EntityType = 'organization' | 'service' | 'location';
export type Origin = 'organization' | 'verifier' | 'admin' | 'pipeline' | 'chat_discovery' | 'flag';
export type Source = { source_type: 'url' | 'phone_call' | 'organization'; source_url: string | null; source_note: string };
export type FieldValue = { entity_type: EntityType; entity_id: string; field_path: string; value: JsonValue };
type FieldRef = Pick<FieldValue,'entity_type'|'entity_id'|'field_path'>;
export function fieldKey(f: FieldRef): string { return `${f.entity_type}:${f.entity_id}:${f.field_path}`; }
// A missing value and null both mean "none"; objects compare by content, arrays by order.
export function changedFields(current: ReadonlyMap<string, JsonValue>, desired: readonly FieldValue[]): FieldValue[] {
 return desired.filter(f => !isDeepStrictEqual(current.get(fieldKey(f)) ?? null, f.value ?? null));
}
export async function acceptedValues(db: Kysely<DB>, entityIds: readonly string[]): Promise<Map<string, JsonValue>> {
 if (!entityIds.length) return new Map();
 const rows = await db.selectFrom('field_assertion').select(['entity_type','entity_id','field_path','value']).where('entity_id','in',entityIds).where('status','=','accepted').execute();
 return new Map(rows.map(r => [fieldKey(r as FieldRef), r.value]));
}
export async function recordRevision(trx: Kysely<DB>, r: { service_id: string; actor_id: string; origin: Origin; source: Source; current: ReadonlyMap<string, JsonValue>; changed: readonly FieldValue[] }): Promise<string> {
 const id = randomUUID(), now = sql<Date>`now()`;
 await trx.insertInto('revision').values({ id, service_id: r.service_id, actor_id: r.actor_id, origin: r.origin }).execute();
 for (const f of r.changed) {
  if (!r.current.has(fieldKey(f))) continue;
  await trx.updateTable('field_assertion').set({ status: 'superseded' }).where('entity_type','=',f.entity_type).where('entity_id','=',f.entity_id).where('field_path','=',f.field_path).where('status','=','accepted').execute();
 }
 if (r.changed.length) await trx.insertInto('field_assertion').values(r.changed.map(f => ({
  id: randomUUID(), revision_id: id, entity_type: f.entity_type, entity_id: f.entity_id, field_path: f.field_path, value: JSON.stringify(f.value),
  origin: r.origin, ...r.source, observed_at: now, status: 'accepted', decided_by: r.actor_id, decided_at: now,
 }))).execute();
 return id;
}
