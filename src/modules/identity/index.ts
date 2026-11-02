import type { Kysely, Selectable } from 'kysely';
import { database, type DB } from '@/modules/platform';
export type Actor = Selectable<DB['membership']>;
export async function actorFor(userId: string, db: Kysely<DB> = database()) {
 const actor = await db.selectFrom('membership').selectAll().where('user_id','=',userId).executeTakeFirst();
 if (!actor) throw new Error('Access denied');
 return actor;
}
export function canCreate(actor: Actor) {
 return actor.role === 'admin' || actor.role === 'organization' || (actor.role === 'community' && actor.approved);
}
