import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Client } from 'pg';
export async function migrate(url: string) {
 const parsed = new URL(url), local = ['127.0.0.1','localhost','[::1]'].includes(parsed.hostname);
 for (const name of ['sslmode','sslcert','sslkey','sslrootcert']) parsed.searchParams.delete(name);
 const client = new Client({ connectionString: parsed.toString(), ssl: local ? false : {rejectUnauthorized:true} });
 await client.connect();
 try {
  await client.query('CREATE SCHEMA IF NOT EXISTS oran_meta');
  await client.query('CREATE TABLE IF NOT EXISTS oran_meta.migration (name text PRIMARY KEY, hash text NOT NULL)');
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(729194)");
  for (const name of (await readdir('supabase/migrations')).filter(n => n.endsWith('.sql')).sort()) {
   const text = await readFile('supabase/migrations/' + name, 'utf8');
   const hash = createHash('sha256').update(text).digest('hex');
   const row = await client.query<{hash: string}>('SELECT hash FROM oran_meta.migration WHERE name=$1',[name]);
   if (row.rows[0]) { if (row.rows[0].hash !== hash) throw new Error('Applied migration changed: ' + name); continue; }
   await client.query(text);
   await client.query('INSERT INTO oran_meta.migration VALUES ($1,$2)',[name,hash]);
  }
  await client.query('COMMIT');
 } catch (error) { await client.query('ROLLBACK'); throw error; } finally { await client.end(); }
}
