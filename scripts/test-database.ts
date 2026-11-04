// Where the browser launcher (dev.ts --test) serves its in-memory database: loopback only, on a fixed port so browser tests can read what a save recorded. Kept apart from local-database.ts so a browser test can import it without loading PGlite.
export const testDatabasePort = 3101;
export const testDatabaseUrl = `postgresql://postgres:postgres@127.0.0.1:${testDatabasePort}/postgres`;
