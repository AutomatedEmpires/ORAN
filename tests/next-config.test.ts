import { afterEach,describe,expect,it,vi } from 'vitest';
async function nextConfig(testRun:string){vi.resetModules();vi.stubEnv('ORAN_TEST_RUN',testRun);return (await import('../next.config')).default;}
afterEach(()=>{vi.unstubAllEnvs();});
describe('Next.js dev configuration',()=>{
 it('compiles browser test runs without the saved Turbopack dev cache',async()=>{
  const config=await nextConfig('1');
  expect(config.distDir).toBe('.next-test');
  expect(config.experimental?.turbopackFileSystemCacheForDev).toBe(false);
 });
 it('keeps the saved dev cache for normal development',async()=>{
  const config=await nextConfig('0');
  expect(config.distDir).toBe('.next');
  expect(config.experimental?.turbopackFileSystemCacheForDev).toBe(true);
 });
});
