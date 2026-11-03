import type { Kysely, Selectable } from 'kysely';
import { database, type DB } from '@/modules/platform';
export type Membership = Selectable<DB['membership']>;
export type Actor = { user_id: string; display_name: string; memberships: Membership[] };
export async function actorFor(userId: string, db: Kysely<DB> = database()): Promise<Actor> {
 const account = await db.selectFrom('account').select(['user_id','display_name']).where('user_id','=',userId).executeTakeFirst();
 if (!account) throw new Error('Access denied');
 const memberships = await db.selectFrom('membership').selectAll().where('user_id','=',userId).orderBy('id').execute();
 return { ...account, memberships };
}
export async function ensureAccount(userId: string, displayName: string, db: Kysely<DB> = database()) {
 await db.insertInto('account').values({ user_id: userId, display_name: displayName }).onConflict(oc => oc.column('user_id').doNothing()).execute();
}
export function approvedMemberships(actor: Actor, role: 'admin' | 'organization' | 'community') {
 return actor.memberships.filter(m => m.role === role && m.approved);
}
export function isAdmin(actor: Actor) { return approvedMemberships(actor,'admin').length > 0; }
export function organizationIds(actor: Actor) {
 return approvedMemberships(actor,'organization').flatMap(m => m.organization_id ? [m.organization_id] : []);
}
// Every organization the actor belongs to or has asked to join; independence checks use this, privileges use organizationIds.
export function affiliatedOrganizationIds(actor: Actor): string[] {
 return actor.memberships.flatMap(m => m.role === 'organization' && m.organization_id ? [m.organization_id] : []);
}
export function verifierScope(actor: Actor): { postal_code: string; category_scope: string[] } | null {
 const m = approvedMemberships(actor,'community').find(x => x.postal_code);
 return m ? { postal_code: m.postal_code!, category_scope: m.category_scope } : null;
}
export function communityPending(actor: Actor) {
 return actor.memberships.some(m => m.role === 'community' && !m.approved);
}
export function canCreate(actor: Actor) {
 return isAdmin(actor) || organizationIds(actor).length > 0 || verifierScope(actor) !== null;
}
