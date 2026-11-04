import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe,it,expect } from 'vitest';
import { addressValue,areaRows,formatPhone,hoursValue,listingOptions,locationInput,normalizePhone,partMessages,phoneValue,serviceAreaValue,usStates,usTimeZones,weekDays } from '@/modules/catalog';
// Pure value tests: no database. The migration's named CHECKs are read from the SQL so these schemas cannot drift from them.
const migration = readFileSync(fileURLToPath(new URL('../supabase/migrations/20261104100000_listing_parts.sql',import.meta.url)),'utf8');
const checkPattern = (name:string) => new RegExp(new RegExp(`CONSTRAINT ${name} CHECK \\([a-z_]+ ~ '([^']+)'\\)`).exec(migration)![1]);
const address = {address_1:'123 Main St',address_2:null,city:'Seattle',state_province:'WA',postal_code:'98101'};
const weekly = {kind:'weekly',time_zone:'America/Los_Angeles',weekly:[{day:'FR',opens_at:'19:00',closes_at:'07:00'}],exceptions:[{from:'2026-12-25',to:'2026-12-25',opens_at:null,closes_at:null,note:'Holiday'}]};
const withException = (e:object) => ({...weekly,exceptions:[{...weekly.exceptions[0],...e}]});
const withWeekly = (rows:unknown[]) => ({...weekly,weekly:rows});
const hasIssue = (r:{success:boolean;error?:{issues:{message:string}[]}},message:string) => !r.success && !!r.error?.issues.some(i=>i.message===message);

describe('phone numbers',()=>{
 it('normalizes common US formats and hotline short codes',()=>{
  for (const raw of ['(206) 555-0100','206.555.0100','+1 206 555 0100','1-206-555-0100','2065550100','+12065550100']) expect(normalizePhone(raw),raw).toBe('+12065550100');
  expect(normalizePhone('1-800-555-0199')).toBe('+18005550199');
  expect(normalizePhone('988')).toBe('988');
  expect(normalizePhone('211')).toBe('211');
  // Brief case '12345678901' is a valid 1-234-567-8901 under the brief's own rule (area 234 is Ohio), so the invalid 11-digit inputs here are ones that really break it.
  for (const raw of ['555-0100','106-555-0100','911','','11234567890','22065550100','1206555010','206-155-0100']) expect(normalizePhone(raw),raw).toBeNull();
  expect(formatPhone('+12065550100')).toBe('(206) 555-0100');
  expect(formatPhone('988')).toBe('988');
 });
 it('accepts its own output and what the database accepts',()=>{
  const database = checkPattern('phone_number_shape');
  for (const raw of ['(206) 555-0100','1-800-555-0199','+12345678901','988','211','311','511','711','811']) {
   const out = normalizePhone(raw)!;
   expect(normalizePhone(out),raw).toBe(out);
   expect(out,raw).toMatch(database);
  }
  expect(formatPhone('+18005550199')).toBe('(800) 555-0199');
  for (const code of ['211','311','511','711','811','988']) expect(formatPhone(code)).toBe(code);
 });
 it('stores the normalized number with an optional extension',()=>{
  expect(phoneValue.parse({number:'(206) 555-0100',extension:null})).toEqual({number:'+12065550100',extension:null});
  expect(phoneValue.parse({number:'206.555.0100',extension:12})).toEqual({number:'+12065550100',extension:12});
  expect(phoneValue.parse({number:'988',extension:null}).number).toBe('988');
  const bad = phoneValue.safeParse({number:'555-0100',extension:null});
  expect(hasIssue(bad,'Use a US phone number')).toBe(true);
  expect(partMessages.phone).toBe('Use a US phone number');
  for (const extension of [0,100000,1.5,-1]) expect(phoneValue.safeParse({number:'988',extension}).success,String(extension)).toBe(false);
  expect(phoneValue.safeParse({number:'988',extension:99999}).success).toBe(true);
  expect(phoneValue.safeParse({number:'988',extension:1}).success).toBe(true);
 });
});

describe('options',()=>{
 it('lists exactly the 56 state and territory codes',()=>{
  const expected = 'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC AS GU MP PR VI'.split(' ');
  expect(expected).toHaveLength(56);
  expect([...usStates].sort()).toEqual([...expected].sort());
  expect(new Set(usStates).size).toBe(56);
  for (const code of usStates) expect(code).toMatch(checkPattern('address_state_code'));
  expect(usStates).not.toContain('US');
 });
 it('exposes the time zones, days and the combined option set',()=>{
  expect(usTimeZones).toEqual(['America/New_York','America/Chicago','America/Denver','America/Phoenix','America/Los_Angeles','America/Anchorage','Pacific/Honolulu','America/Puerto_Rico','Pacific/Guam','Pacific/Pago_Pago']);
  expect(weekDays).toEqual(['MO','TU','WE','TH','FR','SA','SU']);
  expect(listingOptions).toEqual({states:usStates,timeZones:usTimeZones,days:weekDays});
  for (const day of weekDays) expect(migration).toContain(`'${day}'`);
 });
});

describe('hours',()=>{
 it('accepts overnight hours and dated closures',()=>{
  expect(hoursValue.parse(weekly)).toEqual(weekly);
 });
 it('accepts unknown, 24/7, by appointment and different hours on a dated exception',()=>{
  expect(hoursValue.parse(null)).toBeNull();
  expect(hoursValue.parse({kind:'always_open'})).toEqual({kind:'always_open'});
  expect(hoursValue.parse({kind:'by_appointment'})).toEqual({kind:'by_appointment'});
  const shortDay = withException({from:'2026-12-24',to:'2026-12-24',opens_at:'09:00',closes_at:'12:00',note:'  Short day  '});
  expect(hoursValue.parse(shortDay)).toEqual(withException({from:'2026-12-24',to:'2026-12-24',opens_at:'09:00',closes_at:'12:00',note:'Short day'}));
  expect(hoursValue.safeParse({...weekly,exceptions:[]}).success).toBe(true);
 });
 it('drops fields that do not belong to the kind',()=>{
  expect(hoursValue.parse({kind:'always_open',time_zone:'America/Chicago'})).toEqual({kind:'always_open'});
 });
 it('rejects contradictory hours',()=>{
  const row = weekly.weekly[0];
  expect(hoursValue.safeParse(withWeekly([{...row,closes_at:'19:00'}])).success).toBe(false);
  expect(hoursValue.safeParse(withException({opens_at:'09:00'})).success).toBe(false);
  expect(hoursValue.safeParse(withException({closes_at:'17:00'})).success).toBe(false);
  expect(hoursValue.safeParse(withException({opens_at:'09:00',closes_at:'09:00'})).success).toBe(false);
  expect(hoursValue.safeParse(withException({from:'2026-12-26',to:'2026-12-25'})).success).toBe(false);
  expect(hoursValue.safeParse({...weekly,time_zone:'Europe/London'}).success).toBe(false);
  expect(hoursValue.safeParse({kind:'weekly',weekly:weekly.weekly,exceptions:[]}).success).toBe(false);
  expect(hoursValue.safeParse(withWeekly([])).success).toBe(false);
  expect(hoursValue.safeParse(withWeekly([{...row,opens_at:'24:00'}])).success).toBe(false);
  expect(hoursValue.safeParse(withWeekly([{...row,closes_at:'7:00'}])).success).toBe(false);
  expect(hoursValue.safeParse(withWeekly([{...row,day:'XX'}])).success).toBe(false);
  expect(hoursValue.safeParse(withException({from:'2026-02-30',to:'2026-03-01'})).success).toBe(false);
  expect(hoursValue.safeParse({kind:'sometimes'}).success).toBe(false);
 });
 it('keeps the row counts and the note length the form promises',()=>{
  const row = weekly.weekly[0];
  expect(hoursValue.safeParse(withWeekly(Array.from({length:21},()=>row))).success).toBe(true);
  expect(hoursValue.safeParse(withWeekly(Array.from({length:22},()=>row))).success).toBe(false);
  const exception = weekly.exceptions[0];
  expect(hoursValue.safeParse({...weekly,exceptions:Array.from({length:20},()=>exception)}).success).toBe(true);
  expect(hoursValue.safeParse({...weekly,exceptions:Array.from({length:21},()=>exception)}).success).toBe(false);
  expect(hoursValue.safeParse(withException({note:'x'.repeat(120)})).success).toBe(true);
  expect(hoursValue.safeParse(withException({note:'x'.repeat(121)})).success).toBe(false);
 });
 it('never returns a date object, so no time zone can shift a date',()=>{
  const parsed = hoursValue.parse(weekly);
  expect(parsed?.kind === 'weekly' && parsed.exceptions[0].from).toBe('2026-12-25');
 });
});

describe('service areas',()=>{
 it('normalizes ZIP lists and validates named areas',()=>{
  expect(serviceAreaValue.parse({kind:'zip',postal_codes:['98102','98101','98102']})).toEqual({kind:'zip',postal_codes:['98101','98102']});
  expect(serviceAreaValue.safeParse({kind:'county',name:'12345',state:'WA'}).success).toBe(false);
  expect(serviceAreaValue.safeParse({kind:'state',state:'US'}).success).toBe(false);
  expect(areaRows({kind:'nationwide'})).toEqual([{name:'United States',extent:'US',kind:'nationwide'}]);
  expect(areaRows({kind:'county',name:'King County',state:'WA'})).toEqual([{name:'King County, WA',extent:'King County, WA',kind:'county'}]);
 });
 it('rejects empty, oversized and malformed ZIP lists',()=>{
  expect(serviceAreaValue.safeParse({kind:'zip',postal_codes:[]}).success).toBe(false);
  expect(serviceAreaValue.safeParse({kind:'zip',postal_codes:['9810']}).success).toBe(false);
  expect(serviceAreaValue.safeParse({kind:'zip',postal_codes:['98101-1234']}).success).toBe(false);
  const codes = (n:number) => Array.from({length:n},(_,i)=>String(10000+i));
  expect(serviceAreaValue.safeParse({kind:'zip',postal_codes:codes(100)}).success).toBe(true);
  expect(serviceAreaValue.safeParse({kind:'zip',postal_codes:codes(101)}).success).toBe(false);
 });
 it('accepts the other kinds and trims names',()=>{
  expect(serviceAreaValue.parse({kind:'city',name:'  Seattle ',state:'WA'})).toEqual({kind:'city',name:'Seattle',state:'WA'});
  expect(serviceAreaValue.parse({kind:'city',name:"Coeur d'Alene",state:'ID'}).kind).toBe('city');
  expect(serviceAreaValue.parse({kind:'city',name:'Añasco',state:'PR'}).kind).toBe('city');
  expect(serviceAreaValue.parse({kind:'state',state:'WA'})).toEqual({kind:'state',state:'WA'});
  expect(serviceAreaValue.parse({kind:'nationwide'})).toEqual({kind:'nationwide'});
  expect(serviceAreaValue.safeParse({kind:'city',name:'X',state:'WA'}).success).toBe(false);
  expect(serviceAreaValue.safeParse({kind:'city',name:'Seattle',state:'ZZ'}).success).toBe(false);
  expect(serviceAreaValue.safeParse({kind:'region'}).success).toBe(false);
 });
 it('writes the HSDS rows each kind produces',()=>{
  expect(areaRows({kind:'zip',postal_codes:['98101','98102']})).toEqual([{name:'ZIP 98101',extent:'98101',kind:'zip'},{name:'ZIP 98102',extent:'98102',kind:'zip'}]);
  expect(areaRows({kind:'city',name:'Seattle',state:'WA'})).toEqual([{name:'Seattle, WA',extent:'Seattle, WA',kind:'city'}]);
  expect(areaRows({kind:'state',state:'WA'})).toEqual([{name:'WA',extent:'WA',kind:'state'}]);
  for (const kind of ['zip','city','county','state','nationwide']) expect(migration).toContain(`'${kind}'`);
 });
});

describe('addresses',()=>{
 it('trims text and turns an empty second line into null',()=>{
  expect(addressValue.parse({...address,address_1:'  123 Main St ',address_2:'   ',city:' Seattle '})).toEqual(address);
  expect(addressValue.parse({...address,address_2:' Suite 4 '}).address_2).toBe('Suite 4');
  expect(addressValue.parse({...address,postal_code:'98101-1234'}).postal_code).toBe('98101-1234');
 });
 it('rejects what the database would reject',()=>{
  const state = checkPattern('address_state_code'), postal = checkPattern('address_postal_code');
  for (const bad of [{state_province:'wa'},{state_province:'Washington'},{state_province:'ZZ'},{postal_code:'9810'},{postal_code:'98101-12'},{postal_code:'981011234'},{address_1:'ab'},{city:'X'},{address_1:'x'.repeat(151)},{address_2:'x'.repeat(151)},{city:'x'.repeat(101)}]) expect(addressValue.safeParse({...address,...bad}).success,JSON.stringify(bad)).toBe(false);
  for (const code of usStates) expect(addressValue.parse({...address,state_province:code}).state_province).toMatch(state);
  for (const zip of ['98101','98101-1234']) expect(zip).toMatch(postal);
  expect(addressValue.safeParse({...address,address_2:undefined}).success).toBe(false);
 });
});

describe('locations',()=>{
 it('requires an address only for physical locations',()=>{
  expect(locationInput.safeParse({access:'physical'}).success).toBe(false);
  expect(locationInput.safeParse({access:'remote',address}).success).toBe(false);
  expect(locationInput.safeParse({access:'phone',confidential:true}).success).toBe(false);
  expect(locationInput.parse({access:'phone'})).toEqual({access:'phone',name:null,address:null,coordinates:null});
 });
 it('names the rule that was broken',()=>{
  const message = 'A physical location needs an address; remote and phone locations have no address, coordinates or privacy flag';
  expect(partMessages.location).toBe(message);
  expect(hasIssue(locationInput.safeParse({access:'physical'}),message)).toBe(true);
  expect(hasIssue(locationInput.safeParse({access:'remote',coordinates:{latitude:1,longitude:2}}),message)).toBe(true);
  expect(hasIssue(locationInput.safeParse({access:'phone',confidential:true}),message)).toBe(true);
 });
 it('keeps a physical location, its privacy flag and optional coordinates',()=>{
  const id = '5f0c8c3e-6f0e-4a5b-9f3e-0d2d6c2a1b7a';
  expect(locationInput.parse({id,access:'physical',confidential:true,name:'  Main office ',address,coordinates:{latitude:47.6,longitude:-122.3}})).toEqual({id,access:'physical',confidential:true,name:'Main office',address,coordinates:{latitude:47.6,longitude:-122.3}});
  expect(locationInput.parse({access:'physical',address})).toEqual({access:'physical',name:null,address,coordinates:null});
  expect(locationInput.parse({access:'physical',name:'',address}).name).toBeNull();
  expect(locationInput.parse({access:'physical',confidential:false,address}).confidential).toBe(false);
  expect(locationInput.parse({access:'remote',confidential:false}).confidential).toBe(false);
  expect(locationInput.parse({access:'remote',name:'Online'})).toEqual({access:'remote',name:'Online',address:null,coordinates:null});
 });
 it('rejects coordinates out of range, a bad id and an unknown access',()=>{
  for (const coordinates of [{latitude:91,longitude:0},{latitude:-91,longitude:0},{latitude:0,longitude:181},{latitude:0,longitude:-181},{latitude:0},{longitude:0}]) expect(locationInput.safeParse({access:'physical',address,coordinates}).success,JSON.stringify(coordinates)).toBe(false);
  for (const coordinates of [{latitude:90,longitude:180},{latitude:-90,longitude:-180}]) expect(locationInput.safeParse({access:'physical',address,coordinates}).success).toBe(true);
  expect(locationInput.safeParse({access:'physical',address,id:'not-a-uuid'}).success).toBe(false);
  expect(locationInput.safeParse({access:'mail',address}).success).toBe(false);
  expect(locationInput.safeParse({access:'physical',address,name:'x'.repeat(151)}).success).toBe(false);
 });
});
