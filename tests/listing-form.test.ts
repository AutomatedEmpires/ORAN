import { randomUUID } from 'node:crypto';
import { describe,it,expect } from 'vitest';
import { resourceInput } from '@/modules/catalog';
import { listingFromForm } from '@/server/listing-form';
// Pure value tests: no database. The parser reads the posted form into the input resourceInput validates; resourceInput stays the authority.
const form=(entries:[string,string][])=>{const data=new FormData();for(const [name,value] of entries)data.append(name,value);return data;};
const scalars={name:'Synthetic food program',description:'Synthetic test record, not a real assistance resource.',organization_name:'Synthetic test organization',url:'https://example.org',eligibility_description:'Contact the provider about requirements',application_process:'Contact the provider',source_type:'url',source_url:'https://example.org/listing',source_note:'Synthetic test fixture, permitted for tests only'};
const scalarEntries=Object.entries(scalars) as [string,string][];
const base:[string,string][]=[...scalarEntries,['categories','food'],['area_kind','nationwide']];
const weeklyHours:[string,string][]=[['hours_kind','weekly'],['hours_time_zone','America/Los_Angeles'],['hours_MO_opens','09:00'],['hours_MO_closes','17:00']];
const typedLocation:[string,string][]=[['location_0_access','remote'],['location_0_name','Online'],['location_0_address_1','1 Hidden Way'],['location_0_address_2','Suite 2'],['location_0_city','Seattle'],['location_0_state','WA'],['location_0_postal_code','98109'],['location_0_latitude','47.6205'],['location_0_longitude','-122.3493'],['location_0_confidential','on']];
const locationId=randomUUID();
describe('listing form parsing',()=>{
 it('builds the acceptance input from a fully filled form',()=>{
  const filled=form([
   ...scalarEntries,['organization_id',''],['categories','food'],['categories','health'],
   ['area_kind','zip'],['area_postal_codes','98101, 98102'],['area_name',''],['area_state',''],
   ['phone_number','(206) 555-0100'],['phone_extension','12'],['phone_number','988'],['phone_extension',''],
   ['hours_kind','weekly'],['hours_time_zone','America/Los_Angeles'],
   ['hours_MO_opens','09:00'],['hours_MO_closes','17:00'],['hours_TU_opens',''],['hours_TU_closes',''],['hours_FR_opens','19:00'],['hours_FR_closes','07:00'],
   ['exception_from','2026-12-25'],['exception_to',''],['exception_opens',''],['exception_closes',''],['exception_note','Holiday'],
   ['location_0_id',locationId],['location_0_access','physical'],['location_0_name',''],['location_0_address_1','1 Hidden Way'],['location_0_address_2',''],['location_0_city','Seattle'],['location_0_state','WA'],['location_0_postal_code','98109'],['location_0_latitude','47.6205'],['location_0_longitude','-122.3493'],['location_0_confidential','on'],
   ['location_1_id',''],['location_1_access','none'],['location_1_name',''],['location_1_address_1',''],
  ]);
  const input=listingFromForm(filled);
  expect(input).toEqual({
   ...scalars,categories:['food','health'],
   service_area:{kind:'zip',postal_codes:['98101','98102']},
   phones:[{number:'(206) 555-0100',extension:12},{number:'988',extension:null}],
   hours:{kind:'weekly',time_zone:'America/Los_Angeles',weekly:[{day:'MO',opens_at:'09:00',closes_at:'17:00'},{day:'FR',opens_at:'19:00',closes_at:'07:00'}],exceptions:[{from:'2026-12-25',to:'2026-12-25',opens_at:null,closes_at:null,note:'Holiday'}]},
   locations:[{id:locationId,access:'physical',confidential:true,name:'',address:{address_1:'1 Hidden Way',address_2:'',city:'Seattle',state_province:'WA',postal_code:'98109'},coordinates:{latitude:47.6205,longitude:-122.3493}}],
  });
  // The validated value is what the catalog stores: normalized phones, an overnight rule kept as typed, blank text as null.
  expect(resourceInput.parse(input)).toMatchObject({
   phones:[{number:'+12065550100',extension:12},{number:'988',extension:null}],
   hours:{kind:'weekly',weekly:[{day:'MO'},{day:'FR',opens_at:'19:00',closes_at:'07:00'}]},
   locations:[{id:locationId,access:'physical',confidential:true,name:null,address:{address_2:null},coordinates:{latitude:47.6205,longitude:-122.3493}}],
  });
 });
 it('skips blank phone and exception rows and removed locations',()=>{
  const phones=listingFromForm(form([...base,['phone_number',''],['phone_extension',''],['phone_number','988'],['phone_extension','']]));
  expect(phones.phones).toEqual([{number:'988',extension:null}]);
  const hours=listingFromForm(form([...base,...weeklyHours,['exception_from',''],['exception_to',''],['exception_opens',''],['exception_closes',''],['exception_note','']]));
  expect(hours.hours).toMatchObject({kind:'weekly',exceptions:[]});
  const removed=listingFromForm(form([...base,['location_0_id',locationId],['location_0_remove','on']]));
  expect(removed.locations).toEqual([]);
  const removedWithAddress=listingFromForm(form([...base,['location_0_id',locationId],['location_0_access','physical'],['location_0_address_1','1 Main Street'],['location_0_remove','on']]));
  expect(removedWithAddress.locations).toEqual([]);
 });
 it('ignores address fields for remote and phone locations',()=>{
  for(const access of ['remote','phone']){
   const entries=typedLocation.map(([name,value]):[string,string]=>name==='location_0_access'?[name,access]:[name,value]);
   expect(listingFromForm(form([...base,...entries])).locations,access).toEqual([{access,confidential:false,name:'Online',address:null,coordinates:null}]);
  }
  const blankName=typedLocation.map(([name,value]):[string,string]=>name==='location_0_name'?[name,'']:[name,value]);
  expect(listingFromForm(form([...base,...blankName])).locations).toEqual([{access:'remote',confidential:false,name:'',address:null,coordinates:null}]);
 });
 it('reads unknown hours as null and a nationwide area as its kind alone',()=>{
  const unknown=listingFromForm(form([...scalarEntries,['categories','food'],['area_kind','nationwide'],['area_postal_codes','98101'],['hours_kind','unknown'],['hours_time_zone','America/Los_Angeles'],['hours_MO_opens','09:00'],['hours_MO_closes','17:00']]));
  expect(unknown.hours).toBeNull();
  expect(unknown.service_area).toEqual({kind:'nationwide'});
  for(const kind of ['always_open','by_appointment'])expect(listingFromForm(form([...base,['hours_kind',kind],...weeklyHours.slice(1)])).hours,kind).toEqual({kind});
 });
 it('reads each service area kind from its own fields',()=>{
  const area=(entries:[string,string][])=>listingFromForm(form([...scalarEntries,['categories','food'],...entries])).service_area;
  expect(area([['area_kind','zip'],['area_postal_codes','98101\n98102,, 98103 98101 ']])).toEqual({kind:'zip',postal_codes:['98101','98102','98103','98101']});
  expect(area([['area_kind','zip'],['area_postal_codes','  ,\n']])).toEqual({kind:'zip',postal_codes:[]});
  expect(area([['area_kind','city'],['area_name','Seattle'],['area_state','WA'],['area_postal_codes','98101']])).toEqual({kind:'city',name:'Seattle',state:'WA'});
  expect(area([['area_kind','county'],['area_name','King'],['area_state','WA']])).toEqual({kind:'county',name:'King',state:'WA'});
  expect(area([['area_kind','state'],['area_name','Seattle'],['area_state','WA']])).toEqual({kind:'state',state:'WA'});
 });
 it('sends the organization only when one is chosen and every checked category',()=>{
  const none=listingFromForm(form([...base,['organization_id','']]));
  expect('organization_id' in none).toBe(false);
  const id=randomUUID();
  expect(listingFromForm(form([...base,['organization_id',id]])).organization_id).toBe(id);
  expect(listingFromForm(form([...scalarEntries,['area_kind','nationwide']])).categories).toEqual([]);
 });
 it('leaves rejection to the validator: a lone coordinate and unknown kinds are not repaired',()=>{
  const physical:[string,string][]=[['location_0_access','physical'],['location_0_address_1','1 Main Street'],['location_0_city','Seattle'],['location_0_state','WA'],['location_0_postal_code','98101']];
  const coordinates=(latitude:string,longitude:string)=>listingFromForm(form([...base,['hours_kind','unknown'],...physical,['location_0_latitude',latitude],['location_0_longitude',longitude]]));
  // Both blank is no coordinates; one blank is not 0, it is NaN, which the validator rejects.
  expect(coordinates('','').locations).toEqual([expect.objectContaining({coordinates:null})]);
  expect(resourceInput.safeParse(coordinates('','')).success).toBe(true);
  const lone=coordinates('47.6','');
  const [location]=lone.locations as {coordinates:{latitude:number;longitude:number}}[];
  expect(location.coordinates.latitude).toBe(47.6);
  expect(Number.isNaN(location.coordinates.longitude)).toBe(true);
  const rejected=resourceInput.safeParse(lone);
  expect(rejected.success).toBe(false);
  expect(rejected.error?.issues.some(i=>i.path[0]==='locations')).toBe(true);
  const noArea=listingFromForm(form(scalarEntries));
  expect(noArea.service_area).toEqual({kind:''});
  expect(resourceInput.safeParse(noArea).success).toBe(false);
  expect(listingFromForm(form([...base,['hours_kind','sometimes']])).hours).toEqual({kind:'sometimes'});
  expect(resourceInput.safeParse(listingFromForm(form([...base,['hours_kind','sometimes']]))).success).toBe(false);
  expect(listingFromForm(form([...base,...weeklyHours,['exception_from','2026-12-25'],['exception_opens','09:00'],['exception_closes','']])).hours).toMatchObject({exceptions:[{opens_at:'09:00',closes_at:null}]});
 });
});
