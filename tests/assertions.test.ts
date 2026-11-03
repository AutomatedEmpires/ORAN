import { describe,it,expect } from 'vitest';
import { changedFields,fieldKey,type JsonValue } from '../src/modules/catalog/index';
const f=(field_path:string,value:unknown)=>({entity_type:'service' as const,entity_id:'s1',field_path,value:value as never});
describe('changed field detection',()=>{
 it('treats a missing value and null as equal',()=>{
  expect(changedFields(new Map(),[f('url',null)])).toEqual([]);
 });
 it('ignores object key order but not array order',()=>{
  const current=new Map<string,JsonValue>([[fieldKey(f('hours',null)),{kind:'weekly',time_zone:'America/Chicago'}],[fieldKey(f('categories',null)),['food','health']]]);
  expect(changedFields(current,[f('hours',{time_zone:'America/Chicago',kind:'weekly'})])).toEqual([]);
  expect(changedFields(current,[f('categories',['health','food'])])).toHaveLength(1);
 });
 it('returns only fields whose value differs',()=>{
  const current=new Map<string,JsonValue>([[fieldKey(f('name',null)),'A'],[fieldKey(f('description',null)),'B']]);
  expect(changedFields(current,[f('name','A'),f('description','C')])).toEqual([f('description','C')]);
 });
});
