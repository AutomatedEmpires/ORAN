import { describe,it,expect } from 'vitest';
import { config,issueToken,readToken } from '../src/modules/platform/index';
import { explainMatch } from '../src/modules/matching/index';
describe('environment and session boundaries',()=>{
 it('rejects local identities in production and non-loopback local databases',()=>{
  expect(()=>config({ORAN_ENV:'production',ORAN_LOCAL_DEV:'1'})).toThrow('development-only');
  expect(()=>config({ORAN_LOCAL_DEV:'1',DATABASE_URL:'postgresql://u:p@example.com/db'})).toThrow('loopback');
 });
 it('requires explicit remote environment identity and never falls back',()=>{
  expect(()=>config({ORAN_ENV:'preview'})).toThrow('DATABASE_URL');
  expect(()=>config({DATABASE_URL:'postgresql://u:p@example.com/db',ORAN_DATABASE_HOST:'other.example'})).toThrow('does not match');
 });
 it('rejects forged and expired local sessions',()=>{
  const token=issueToken('dev-admin','secret',1000);
  expect(readToken(token,'secret',1001)).toBe('dev-admin');
  expect(readToken(token+'forged','secret',1001)).toBeNull();
  expect(readToken(token,'other',1001)).toBeNull();
  expect(readToken(token,'secret',3601000)).toBeNull();
 });
});
describe('grounded matching',()=>{
 it('does not match outside stated coverage or need',()=>{
  expect(explainMatch({postal_code:'98102',category:'food'},{postal_code:'98101',needs:['food']})).toBeNull();
  expect(explainMatch({postal_code:'98101',category:'health'},{postal_code:'98101',needs:['food']})).toBeNull();
 });
 it('explains evidence and keeps qualification/capacity unknown',()=>{
  const match=explainMatch({postal_code:'98101',category:'food'},{postal_code:'98101',needs:['food']});
  expect(match?.reasons).toHaveLength(2);
  expect(match?.unknowns.join(' ')).toContain('not been determined');
  expect(match?.unknowns.join(' ')).toContain('capacity is unknown');
 });
});
