import { spawn } from 'node:child_process';
import { localDatabase } from './local-database';
import { migrate } from './database';
const local = process.env.DATABASE_URL ? null : await localDatabase();
const url = local?.url ?? process.env.DATABASE_URL!;
try {
 if (local) await migrate(url);
 const args = ['node_modules/kysely-codegen/dist/cli/bin.js','--dialect','postgres','--default-schema','oran','--include-pattern','oran.*','--out-file','src/modules/platform/db.generated.ts','--url',url];
 if (process.argv.includes('--verify')) args.push('--verify');
 const code = await new Promise<number|null>(resolve => spawn(process.execPath,args,{stdio:'inherit'}).on('exit',resolve));
 if (code !== 0) process.exitCode = 1;
} finally { await local?.close(); }
