import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
export default defineConfig({
 testDir:'tests/browser', fullyParallel:false, workers:1, timeout:60000,
 use:{baseURL:'http://127.0.0.1:3100',headless:true,launchOptions:process.platform==='win32'&&existsSync(edge)?{executablePath:edge}:{},trace:'retain-on-failure'},
 webServer:{command:'node --import tsx scripts/dev.ts --test',url:'http://127.0.0.1:3100/api/health',reuseExistingServer:false,timeout:120000},
});
