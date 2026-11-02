import { migrate } from './database';
import { config } from '../src/modules/platform/index';
if (process.env.ORAN_ENV === 'production') throw new Error('Production migrations require a reviewed release procedure; bootstrap command is non-production only');
await migrate(config().url);
console.log('Non-production migrations applied.');
