import { randomUUID } from 'node:crypto';
import { describe,it,expect } from 'vitest';
import { resourceInput } from '@/modules/catalog';
import { fieldLabel,listingFromForm } from '@/server/listing-form';
// Pure value tests: no database. The parser reads the posted form into the input resourceInput validates; resourceInput stays the authority.
const form=(entries:[string,string][])=>{const data=new FormData();for(const [name,value] of entries)data.append(name,value);return data;};
const scalars={name:'Synthetic food program',description:'Synthetic test record, not a real assistance resource.',organization_name:'Synthetic test organization',url:'https://example.org',eligibility_description:'Contact the provider about requirements',application_process:'Contact the provider',source_type:'url',source_url:'https://example.org/listing',source_note:'Synthetic test fixture, permitted for tests only'};
const scalarEntries=Object.entries(scalars) as [string,string][];
const base:[string,string][]=[...scalarEntries,['categories','food'],['area_kind','nationwide']];
const weeklyHours:[string,string][]=[['hours_kind','weekly'],['hours_time_zone','America/Los_Angeles'],['hours_MO_opens','09:00'],['hours_MO_closes','17:00']];
const typedLocation:[string,string][]=[['location_0_access','remote'],['location_0_name','Online'],['location_0_address_1','1 Hidden Way'],['location_0_address_2','Suite 2'],['location_0_city','Seattle'],['location_0_state','WA'],['location_0_postal_code','98109'],['location_0_latitude','47.6205'],['location_0_longitude','-122.3493'],['location_0_confidential','private']];
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
   ['location_0_id',locationId],['location_0_access','physical'],['location_0_name',''],['location_0_address_1','1 Hidden Way'],['location_0_address_2',''],['location_0_city','Seattle'],['location_0_state','WA'],['location_0_postal_code','98109'],['location_0_latitude','47.6205'],['location_0_longitude','-122.3493'],['location_0_confidential','private'],
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
  // The time zone is a select, not typing; typed times under "Not known yet" are rejected (see the S2-28 test below).
  const unknown=listingFromForm(form([...scalarEntries,['categories','food'],['area_kind','nationwide'],['area_postal_codes','98101'],['hours_kind','unknown'],['hours_time_zone','America/Los_Angeles'],['hours_MO_opens',''],['hours_MO_closes','']]));
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
 it('reads the privacy choice as private, public or not chosen',()=>{
  const physical:[string,string][]=[['location_0_access','physical'],['location_0_address_1','1 Main Street'],['location_0_city','Seattle'],['location_0_state','WA'],['location_0_postal_code','98101']];
  const location=(choice?:string)=>(listingFromForm(form([...base,...physical,...(choice===undefined?[]:[['location_0_confidential',choice] as [string,string]])])).locations as Record<string,unknown>[])[0];
  expect(location('private')).toHaveProperty('confidential',true);
  expect(location('public')).toHaveProperty('confidential',false);
  // Not chosen is not "public": the key is left out so the server decides (a Safety listing's physical location is private, and a private one stays private).
  expect(location()).not.toHaveProperty('confidential');
  expect(location('')).not.toHaveProperty('confidential');
  // The old checkbox value and anything else are not a choice either.
  for(const other of ['on','true','off','PRIVATE','none'])expect(location(other),other).not.toHaveProperty('confidential');
  // Only a physical location has the flag.
  for(const access of ['remote','phone'])expect(listingFromForm(form([...base,['location_0_access',access],['location_0_confidential','private']])).locations,access).toEqual([{access,confidential:false,name:'',address:null,coordinates:null}]);
 });
 it('sends a weekly day with one time so the validator rejects it',()=>{
  const weekly=(entries:[string,string][])=>listingFromForm(form([...base,['hours_kind','weekly'],['hours_time_zone','America/Los_Angeles'],...entries]));
  const mondayOnlyOpens=weekly([['hours_MO_opens','09:00'],['hours_MO_closes','']]);
  expect((mondayOnlyOpens.hours as {weekly:unknown[]}).weekly).toEqual([{day:'MO',opens_at:'09:00',closes_at:''}]);
  const rejected=resourceInput.safeParse(mondayOnlyOpens);
  expect(rejected.success).toBe(false);
  expect(rejected.error?.issues.some(i=>i.path[0]==='hours')).toBe(true);
  expect(resourceInput.safeParse(weekly([['hours_MO_opens',''],['hours_MO_closes','17:00']])).success).toBe(false);
  // A day with both times blank is a closed day and is left out; with both filled it is valid.
  expect((weekly([['hours_MO_opens',''],['hours_MO_closes',''],['hours_TU_opens','  '],['hours_TU_closes','']]).hours as {weekly:unknown[]}).weekly).toEqual([]);
  expect(resourceInput.safeParse(weekly([['hours_MO_opens','09:00'],['hours_MO_closes','17:00']])).success).toBe(true);
 });
 it('reads an extension only when it is all digits',()=>{
  const extension=(value:string)=>(listingFromForm(form([...base,['phone_number','988'],['phone_extension',value]])).phones as {extension:number|null}[])[0].extension;
  expect(extension('12')).toBe(12);
  expect(extension(' 12 ')).toBe(12);
  expect(extension('')).toBeNull();
  for(const typed of ['1e3','0x10','+5','1.5','-3','12a','abc','١٢'])expect(Number.isNaN(extension(typed)),typed).toBe(true);
  expect(resourceInput.safeParse(listingFromForm(form([...base,['hours_kind','unknown'],['phone_number','988'],['phone_extension','1e3']]))).success).toBe(false);
  expect(resourceInput.safeParse(listingFromForm(form([...base,['hours_kind','unknown'],['phone_number','988'],['phone_extension','12']]))).success).toBe(true);
 });
 it('zips phone columns of different lengths by position and reads only ten location slots',()=>{
  const phones=(entries:[string,string][])=>listingFromForm(form([...base,...entries])).phones;
  expect(phones([['phone_number','988'],['phone_number','211'],['phone_extension','5']])).toEqual([{number:'988',extension:5},{number:'211',extension:null}]);
  expect(phones([['phone_number','988'],['phone_extension','5'],['phone_extension','7']])).toEqual([{number:'988',extension:5}]);
  expect(phones([['phone_extension','5']])).toEqual([]);
  const remote=(slot:number):[string,string][]=>[[`location_${slot}_access`,'remote']];
  expect(listingFromForm(form([...base,...remote(9)])).locations).toEqual([{access:'remote',confidential:false,name:'',address:null,coordinates:null}]);
  expect(listingFromForm(form([...base,...remote(10),...remote(11)])).locations).toEqual([]);
  // A live slot with no id sends no id key at all (toEqual would not see an undefined one).
  const [fresh]=listingFromForm(form([...base,...remote(0),['location_0_id','']])).locations as object[];
  expect(fresh).not.toHaveProperty('id');
  const [kept]=listingFromForm(form([...base,...remote(0),['location_0_id',locationId]])).locations as object[];
  expect(kept).toHaveProperty('id',locationId);
 });
 it('names the first invalid field of a rejected listing',()=>{
  const valid={...scalars,categories:['food'],service_area:{kind:'nationwide'}};
  const label=(input:Record<string,unknown>,form?:FormData)=>fieldLabel(resourceInput.safeParse(input).error,form);
  expect(resourceInput.safeParse(valid).success).toBe(true);
  expect(label({...valid,phones:[{number:'555',extension:null}]})).toEqual({key:'phoneNumber'});
  expect(label({...valid,locations:[{access:'remote'},{access:'physical'}]})).toEqual({key:'locationN',n:2});
  expect(fieldLabel(new Error('Access denied'))).toBeNull();
  expect(fieldLabel(undefined)).toBeNull();
  // Every top-level field the form shows maps to the label the person sees.
  const cases:[Record<string,unknown>,string][]=[
   [{name:''},'name'],[{organization_name:''},'organizationName'],[{organization_id:'not-an-id'},'chooseOrganization'],[{description:''},'description'],[{categories:[]},'categories'],
   [{url:'ftp://example.org'},'website'],[{eligibility_description:''},'eligibility'],[{application_process:''},'intake'],[{source_type:'rumor'},'sourceType'],[{source_url:'ftp://example.org/listing'},'sourceUrl'],[{source_note:''},'source'],
   [{service_area:{kind:'zip',postal_codes:[]}},'serviceArea'],[{phones:[{number:'988',extension:0}]},'phoneNumber'],[{hours:{kind:'weekly',time_zone:'Mars/Olympus',weekly:[],exceptions:[]}},'hours'],
  ];
  for(const [change,key] of cases)expect(label({...valid,...change}),key).toEqual({key});
  // A rule that is not about one location (each location listed once) names no location.
  const repeated=randomUUID();
  expect(label({...valid,locations:[{id:repeated,access:'remote'},{id:repeated,access:'remote'}]})).toBeNull();
  // Given the form, a location is numbered as the form shows it: a removed slot before it still counts.
  const posted=form([...base,['hours_kind','unknown'],['location_0_id',locationId],['location_0_access','remote'],['location_0_remove','on'],['location_1_access','physical']]);
  expect(label(listingFromForm(posted))).toEqual({key:'locationN',n:1});
  expect(label(listingFromForm(posted),posted)).toEqual({key:'locationN',n:2});
 });
 it('reads every rule a day has, in order',()=>{
  const weekly=(entries:[string,string][])=>(listingFromForm(form([...base,['hours_kind','weekly'],['hours_time_zone','America/Los_Angeles'],...entries])).hours as {weekly:unknown[]}).weekly;
  // A day with a lunch break has two rules; the edit form shows one row per stored rule, so none is dropped.
  expect(weekly([['hours_MO_opens','09:00'],['hours_MO_closes','12:00'],['hours_MO_opens','13:00'],['hours_MO_closes','17:00'],['hours_TU_opens','10:00'],['hours_TU_closes','14:00']])).toEqual([
   {day:'MO',opens_at:'09:00',closes_at:'12:00'},{day:'MO',opens_at:'13:00',closes_at:'17:00'},{day:'TU',opens_at:'10:00',closes_at:'14:00'},
  ]);
  // A blank row is skipped; a half-filled one, or a lone time without its pair, is sent so the validator rejects it.
  expect(weekly([['hours_MO_opens','09:00'],['hours_MO_closes','12:00'],['hours_MO_opens',''],['hours_MO_closes','']])).toEqual([{day:'MO',opens_at:'09:00',closes_at:'12:00'}]);
  expect(weekly([['hours_MO_opens','09:00'],['hours_MO_closes','12:00'],['hours_MO_opens','13:00'],['hours_MO_closes','']])).toEqual([{day:'MO',opens_at:'09:00',closes_at:'12:00'},{day:'MO',opens_at:'13:00',closes_at:''}]);
  expect(weekly([['hours_MO_opens','09:00'],['hours_MO_closes','12:00'],['hours_MO_closes','17:00']])).toEqual([{day:'MO',opens_at:'09:00',closes_at:'12:00'},{day:'MO',opens_at:'',closes_at:'17:00'}]);
 });
 it('rejects typed hours under "Not known yet" instead of dropping them',()=>{
  const unknown=(entries:[string,string][])=>listingFromForm(form([...base,['hours_kind','unknown'],['hours_time_zone','America/Los_Angeles'],...entries]));
  // With nothing typed, "Not known yet" is unknown hours.
  expect(unknown([]).hours).toBeNull();
  expect(unknown([['hours_MO_opens',''],['hours_MO_closes',' '],['exception_from',''],['exception_to',''],['exception_opens',''],['exception_closes',''],['exception_note','']]).hours).toBeNull();
  // Any typed weekly time or exception date is sent with the "unknown" kind, which the schema rejects, so the error names Hours.
  const typed:[string,string][][]=[[['hours_MO_opens','09:00']],[['hours_SU_closes','17:00']],[['hours_MO_opens','09:00'],['hours_MO_closes','17:00']],[['exception_from','2026-12-25']],[['exception_to','2026-12-26']]];
  for(const entries of typed){
   const input=unknown(entries),label=JSON.stringify(entries);
   expect(input.hours,label).toMatchObject({kind:'unknown',time_zone:'America/Los_Angeles'});
   expect(fieldLabel(resourceInput.safeParse(input).error),label).toEqual({key:'hours'});
  }
 });
 it("rejects a typed location left at \"Don't add a location\" instead of dropping it",()=>{
  const saved:[string,string][]=[['location_0_id',locationId],['location_0_access','remote']];
  const posted=(entries:[string,string][])=>form([...base,['hours_kind','unknown'],...saved,['location_1_id',''],...entries]);
  // An unused slot with nothing typed is skipped. The privacy radio alone does not count, because Safety selects it by itself.
  expect(listingFromForm(posted([['location_1_access','none']])).locations).toEqual([expect.objectContaining({id:locationId})]);
  expect(listingFromForm(posted([['location_1_access','none'],['location_1_name',''],['location_1_address_1','  '],['location_1_state',''],['location_1_confidential','private']])).locations).toHaveLength(1);
  // Any typed name, address, state or coordinate keeps the slot with its access as posted ('none', or missing), so the save is rejected and names the slot the person sees.
  const typed:[string,string][]=[['name','Main office'],['address_1','1 Main Street'],['address_2','Suite 2'],['city','Seattle'],['state','WA'],['postal_code','98101'],['latitude','47.6'],['longitude','-122.3']];
  for(const [field,value] of typed)for(const access of [[['location_1_access','none']],[]] as [string,string][][]){
   const data=posted([...access,[`location_1_${field}`,value]]),input=listingFromForm(data),label=field+(access.length?' none':' missing');
   expect(input.locations,label).toHaveLength(2);
   expect((input.locations as {access:string}[])[1].access,label).toBe(access.length?'none':'');
   expect(fieldLabel(resourceInput.safeParse(input).error,data),label).toEqual({key:'locationN',n:2});
  }
 });
});
