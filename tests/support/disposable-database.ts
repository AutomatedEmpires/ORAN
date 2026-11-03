import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { localDatabase } from '../../scripts/local-database';
export async function disposableDatabase() {
 const base = process.env.DATABASE_URL;
 if (!base) return localDatabase();
 if (process.env.ORAN_ENV !== 'test' || process.env.ORAN_DATABASE_HOST !== new URL(base).hostname) throw new Error('Integration database must explicitly identify as test');
 const name = 'oran_test_' + randomUUID().replaceAll('-', ''), admin = new Client({ connectionString: base });
 await admin.connect();
 try { await admin.query('CREATE DATABASE "' + name + '"'); } finally { await admin.end(); }
 const isolated = new URL(base); isolated.pathname = '/' + name;
 return { url: isolated.toString(), close: async () => { const c = new Client({ connectionString: base }); await c.connect(); try { await c.query('DROP DATABASE IF EXISTS "' + name + '" WITH (FORCE)'); } finally { await c.end(); } } };
}
