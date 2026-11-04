import { PGlite } from '@electric-sql/pglite';
import { postgis } from '@electric-sql/pglite-postgis';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
// Port 0 picks a free port; the browser launcher passes a fixed one so browser tests can read what a save recorded.
export async function localDatabase(path?: string, port = 0) {
 const db = await PGlite.create(path, { extensions: { postgis } });
 const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: 10 });
 await server.start();
 return { url: 'postgresql://postgres:postgres@' + server.getServerConn() + '/postgres', close: async () => { await server.stop(); await db.close(); } };
}
