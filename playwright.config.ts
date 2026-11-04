import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
export default defineConfig({
 testDir:'tests/browser', fullyParallel:false, workers:1, timeout:60000,
 // Each browser run starts a cold dev server (next.config.ts turns off the dev cache for test runs), so the first visit to a route
 // compiles it while the test waits. 15 seconds covers that on a loaded machine; the 60 second test timeout still bounds every test.
 expect:{timeout:15000},
 use:{baseURL:'http://127.0.0.1:3100',headless:true,launchOptions:process.platform==='win32'&&existsSync(edge)?{executablePath:edge}:{},trace:'retain-on-failure'},
 webServer:{command:'node --import tsx scripts/dev.ts --test',url:'http://127.0.0.1:3100/api/health',reuseExistingServer:false,timeout:120000},
});
