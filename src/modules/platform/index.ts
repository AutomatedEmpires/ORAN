import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import type { DB } from './db.generated';
export type { DB } from './db.generated';
export { issueToken, readToken } from './session-token';
export function config(env: Record<string,string|undefined> = process.env) {
 const stage = env.ORAN_ENV ?? 'development';
 if (!['development','test','preview','production'].includes(stage)) throw new Error('Invalid ORAN_ENV');
 const local = env.ORAN_LOCAL_DEV === '1';
 if (local && (stage !== 'development' || env.NODE_ENV === 'production' || env.VERCEL)) throw new Error('Local identity is development-only');
 if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required; no production fallback');
 const url = new URL(env.DATABASE_URL);
 if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('PostgreSQL URL required');
 const loopback = ['127.0.0.1','localhost','[::1]'].includes(url.hostname);
 if (local && !loopback) throw new Error('Local development requires loopback database');
 if (!local && env.ORAN_DATABASE_HOST !== url.hostname) throw new Error('Database host does not match this environment');
 if (!loopback) {
  for (const name of ['sslmode','sslcert','sslkey','sslrootcert']) url.searchParams.delete(name);
 }
 return { stage, local, url: url.toString(), ssl: loopback ? false as const : { rejectUnauthorized: true }, origin: env.ORAN_APP_ORIGIN ?? 'http://127.0.0.1:3000' };
}
const globalDb = globalThis as unknown as { oranDb?: Kysely<DB> };
export function database() {
 if (!globalDb.oranDb) {
  const cfg = config();
  globalDb.oranDb = new Kysely<DB>({ dialect: new PostgresDialect({ pool: new Pool({ connectionString: cfg.url, ssl: cfg.ssl, max: cfg.local ? 1 : 5, connectionTimeoutMillis: 5000 }) }) });
 }
 return globalDb.oranDb.withSchema('oran');
}
export async function closeDatabase() { await globalDb.oranDb?.destroy(); globalDb.oranDb = undefined; }
export async function lockCatalog(trx: Kysely<DB>) { await sql`SELECT pg_advisory_xact_lock(729195)`.execute(trx); }
export function sameOrigin(request: Request) {
 const cfg = config();
 if (request.headers.get('origin') !== cfg.origin) throw new Error('Invalid request origin');
 if (cfg.local && !['127.0.0.1','localhost','[::1]'].includes(new URL(request.url).hostname)) throw new Error('Local identity requires loopback');
}
