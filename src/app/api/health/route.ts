import { sql } from 'kysely';
import { database } from '@/modules/platform';
// Authorization policy: public, minimal dependency health with no configuration details.
export async function GET() {
 try { await sql`select 1 from oran.membership limit 1`.execute(database());return Response.json({status:'ok'},{headers:{'Cache-Control':'no-store'}}); }
 catch { return Response.json({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}}); }
}
