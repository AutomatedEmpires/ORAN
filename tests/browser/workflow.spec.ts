import { test,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import pg from 'pg';
import { testDatabaseUrl } from '../../scripts/test-database';
import { hydrated } from './support';
async function accessible(page:import('@playwright/test').Page){const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations.filter(v=>v.impact==='critical'||v.impact==='serious')).toEqual([]);}
type Page=import('@playwright/test').Page;
type Locator=import('@playwright/test').Locator;
// The browser launcher's in-memory database (scripts/test-database.ts), read to check what a save recorded.
async function query<T>(text:string,values:unknown[]):Promise<T[]>{const client=new pg.Client({connectionString:testDatabaseUrl});await client.connect();try{return (await client.query(text,values)).rows as T[];}finally{await client.end();}}
// The fields the listing's latest submission asserted, as entity:field.
async function lastRecorded(serviceId:string){return (await query<{field:string}>("SELECT f.entity_type||':'||f.field_path AS field FROM oran.field_assertion f JOIN oran.listing_state l ON l.revision_id=f.revision_id WHERE l.service_id=$1 ORDER BY 1",[serviceId])).map(r=>r.field);}
const resourceForm=(page:Page)=>page.locator('form').filter({has:page.getByLabel('Resource name',{exact:true})});
// Signs in as Admin and fills the resource form's required fields, with a phone call as the source.
async function startListing(page:Page,name:string,category='Food'){
 await page.goto('/sign-in');await page.getByRole('button',{name:'Enter as Admin',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Add resource',exact:true})).toBeVisible();
 const form=resourceForm(page);
 await hydrated(form);
 await form.getByLabel('Resource name',{exact:true}).fill(name);
 await form.getByLabel('Organization name',{exact:true}).fill('Synthetic browser organization');
 await form.getByRole('checkbox',{name:category,exact:true}).check();
 await form.getByLabel('Description',{exact:true}).fill('Synthetic browser test listing, not a real assistance service.');
 await form.getByLabel('Who may qualify',{exact:true}).fill('Contact the provider about requirements');
 await form.getByLabel('How to get help',{exact:true}).fill('Contact the provider before visiting');
 await form.getByRole('radio',{name:'A phone call',exact:true}).check();
 await form.getByLabel('Source and permission note',{exact:true}).fill('Synthetic browser fixture for testing only');
 return form;
}
async function save(form:Locator,label:'Add resource'|'Save'){
 const button=form.getByRole('button',{name:label,exact:true});
 // Wait for this save's server action. The status can already say "Saved…" from an earlier save in the same view, so reading it first would accept the previous revision (M-5).
 const posted=form.page().waitForResponse(response=>response.request().method()==='POST'&&response.request().headers()['next-action']!==undefined);
 await button.click();
 await posted;
 await expect(form.getByRole('status')).toHaveText(/^Saved\. This resource needs/);
}
// Opens the listing's edit page from "Resources you maintain" and returns its id and form.
async function openEdit(page:Page,name:string){
 await page.goto('/admin');
 await page.locator('article').filter({has:page.getByRole('heading',{name,exact:true})}).getByRole('link',{name:'Edit resource',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Edit resource',exact:true})).toBeVisible();
 const form=resourceForm(page);
 await hydrated(form);
 return {id:/\/resources\/([0-9a-f-]{36})\/edit/.exec(page.url())![1],form};
}
// An edit that changes the description, the source and its note, and nothing else.
async function editDescription(page:Page,name:string,description:string){
 const {id,form}=await openEdit(page,name);
 await form.getByLabel('Description',{exact:true}).fill(description);
 await form.getByRole('radio',{name:'A website',exact:true}).check();
 await form.getByLabel('Source web address',{exact:true}).fill('https://example.org/updated-source');
 await form.getByLabel('Source and permission note',{exact:true}).fill('Updated synthetic source note for browser verification');
 await save(form,'Save');
 return id;
}
test('admin entry → approved scoped community verification → personalized discovery',async({page})=>{
 // Four accessibility passes on this journey need more than a minute when the machine is busy. The checks themselves are unchanged.
 test.setTimeout(120000);
 const name='Synthetic browser resource '+Date.now();
 await page.goto('/admin');
 await expect(page).toHaveURL(/sign-in/);
 await page.getByRole('button',{name:'Enter as Admin',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Add resource',exact:true})).toBeVisible();
 await accessible(page);
 await page.getByLabel('Resource name',{exact:true}).fill(name);
 await page.getByLabel('Organization name',{exact:true}).fill('Synthetic browser organization');
 await page.getByLabel('Service ZIP codes',{exact:true}).fill('98101');
 await page.getByLabel('Website',{exact:true}).fill('https://example.org');
 await page.locator('form').filter({has:page.getByLabel('Resource name',{exact:true})}).getByRole('checkbox',{name:'Food',exact:true}).check();
 await page.getByLabel('Description',{exact:true}).fill('Synthetic browser test listing, not a real assistance service.');
 await page.getByLabel('Who may qualify',{exact:true}).fill('Contact the provider about requirements');
 await page.getByLabel('How to get help',{exact:true}).fill('Contact the provider before visiting');
 await page.getByRole('radio',{name:'A website',exact:true}).check();
 await page.getByLabel('Source web address',{exact:true}).fill('https://example.org/synthetic-source');
 await page.getByLabel('Source and permission note',{exact:true}).fill('Synthetic browser fixture for testing only');
 await page.getByRole('button',{name:'Add resource',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Saved. This resource needs'})).toBeVisible();
 // The form resets after a save, and the source question resets with it.
 await expect(page.getByRole('radio',{name:'A website',exact:true})).not.toBeChecked();
 await expect(page.getByLabel('Source web address',{exact:true})).toHaveCount(0);
 await expect(page.getByLabel('Resource name',{exact:true})).toHaveValue('');
 await page.goto('/');
 await expect(page.getByRole('heading',{name,exact:true})).toHaveCount(0);
 await page.goto('/admin');
 const contributor=page.locator('article').filter({has:page.getByRole('heading',{name:'Development community contributor',exact:true})});
 await contributor.getByLabel('Approved ZIP scope').fill('98101');
 await contributor.getByRole('checkbox',{name:'Food',exact:true}).check();
 await contributor.getByRole('button',{name:'Approve contributor',exact:true}).click();
 await expect(contributor.getByRole('status')).toHaveText('Saved.');
 await page.goto('/sign-in');
 await page.getByRole('button',{name:'Enter as Community',exact:true}).click();
 const task=page.locator('article').filter({has:page.getByRole('heading',{name,exact:true})});
 await accessible(page);
 await task.getByLabel('Method',{exact:true}).selectOption('website');
 await task.getByLabel('Evidence and source reference').fill('Synthetic evidence from example.org used only in browser testing');
 await task.getByLabel('Fields checked').fill('name, description, published eligibility and intake');
 await task.getByRole('button',{name:'Record verification',exact:true}).click();
 await expect(page.getByRole('heading',{name,exact:true})).toHaveCount(0);
 await page.goto('/');
 await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
 await expect(page.locator('article').filter({has:page.getByRole('heading',{name,exact:true})})).toContainText('Website review');
 await accessible(page);
 await page.goto('/sign-in');
 await page.getByRole('button',{name:'Enter as My profile',exact:true}).click();
 await accessible(page);
 await page.getByLabel('Service ZIP code',{exact:true}).fill('98101');
 await page.getByRole('checkbox',{name:'Food',exact:true}).check();
 await page.getByRole('checkbox',{name:'I agree to store these preferences for personalized matching.',exact:true}).check();
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
 await expect(page.getByText('Matches a support need you selected.',{exact:false})).toBeVisible();
 await page.goto('/admin');
 await expect(page.getByRole('main').getByRole('alert')).toHaveText('You do not have access to this workspace.');
 await page.goto('/profile');
 await page.getByRole('button',{name:'Delete my saved preferences',exact:true}).click();
 await expect(page.getByRole('button',{name:'Delete my saved preferences',exact:true})).toHaveCount(0);
 await expect(page.getByLabel('Service ZIP code',{exact:true})).toHaveValue('');
 await page.getByRole('combobox',{name:'Language',exact:true}).selectOption('es');
 await page.getByRole('button',{name:'Apply',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','es');
 await expect(page.getByRole('heading',{name:'Encuentra tu próximo paso.',exact:true})).toBeVisible();
 await page.goto('/profile');
 await expect(page.getByRole('checkbox',{name:'Alimentos',exact:true})).toBeVisible();
 await page.setViewportSize({width:375,height:812});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('organization staff maintain their own unpublished resources',async({page})=>{
 const name='Synthetic organization resource '+Date.now();
 await page.goto('/sign-in');await page.getByRole('button',{name:'Enter as Organization',exact:true}).click();
 await accessible(page);
 await expect(page.getByLabel('Organization name',{exact:true})).toHaveValue('Development organization');
 await expect(page.getByRole('radio',{name:'The organization itself',exact:true})).toBeChecked();
 await page.getByLabel('Resource name',{exact:true}).fill(name);
 await page.getByLabel('Service ZIP codes',{exact:true}).fill('98101');
 await page.getByRole('checkbox',{name:'Food',exact:true}).check();
 await page.getByLabel('Description',{exact:true}).fill('Synthetic organization fixture for browser verification only.');
 await page.getByLabel('Who may qualify',{exact:true}).fill('Contact the organization');
 await page.getByLabel('How to get help',{exact:true}).fill('Contact before visiting');
 await page.getByLabel('Source and permission note',{exact:true}).fill('Synthetic organization test fixture only');
 await page.getByRole('button',{name:'Add resource',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Saved. This resource needs'})).toBeVisible();
 const card=page.locator('article').filter({has:page.getByRole('heading',{name,exact:true})});
 await card.getByRole('link',{name:'Edit resource',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Edit resource',exact:true})).toBeVisible();
 await expect(page.getByRole('radio',{name:'The organization itself',exact:true})).toBeChecked();
 await page.getByLabel('Description',{exact:true}).fill('Updated synthetic organization fixture.');
 await page.getByLabel('Source and permission note',{exact:true}).fill('Updated synthetic source note for browser verification');
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Saved. This resource needs'})).toBeVisible();
 await page.goto('/organization');await expect(page.getByText('Updated synthetic organization fixture.',{exact:true})).toBeVisible();
 await page.goto('/');await expect(page.getByRole('heading',{name,exact:true})).toHaveCount(0);
});
test('a rejected resource form keeps what was typed',async({page})=>{
 const name='Synthetic rejected resource '+Date.now();
 await page.goto('/sign-in');await page.getByRole('button',{name:'Enter as Admin',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Add resource',exact:true})).toBeVisible();
 const form=page.locator('form').filter({has:page.getByLabel('Resource name',{exact:true})}),add=form.getByRole('button',{name:'Add resource',exact:true}),status=form.getByRole('status');
 await hydrated(form);
 // The status region is in the page before anything is submitted, so a screen reader hears what is put in it.
 await expect(status).toHaveCount(1);
 await expect(status).toBeEmpty();
 await page.getByLabel('Resource name',{exact:true}).fill(name);
 await page.getByLabel('Organization name',{exact:true}).fill('Synthetic rejected organization');
 await page.getByLabel('Service ZIP codes',{exact:true}).fill('98101');
 await form.getByRole('checkbox',{name:'Food',exact:true}).check();
 await page.getByLabel('Description',{exact:true}).fill('Synthetic rejected-form test listing, not a real assistance service.');
 await page.getByLabel('Who may qualify',{exact:true}).fill('Contact the provider about requirements');
 await page.getByLabel('How to get help',{exact:true}).fill('Contact the provider before visiting');
 await page.getByRole('radio',{name:'A website',exact:true}).check();
 // The browser accepts any absolute address in a web-address field; the server accepts only http and https, so this is a rejection the form cannot catch itself. An admin is never offered "The organization itself".
 await page.getByLabel('Source web address',{exact:true}).fill('ftp://example.org/synthetic-source');
 await page.getByLabel('Source and permission note',{exact:true}).fill('Synthetic rejected-form fixture for testing only');
 // Hold the server's answer so the busy state can be read without racing it.
 let answer:()=>void=()=>{};
 const held=new Promise<void>(resolve=>{answer=resolve;});
 await page.route('**/admin',async route=>{if(route.request().headers()['next-action'])await held;await route.continue();});
 await add.click();
 await expect(add).toHaveAttribute('aria-busy','true');
 await expect(add).toHaveAttribute('aria-disabled','true');
 await expect(status).toHaveText('Saving…');
 answer();
 await expect(status).toHaveText('Please check “Source web address” and try again.');
 await expect(add).not.toHaveAttribute('aria-busy');
 await expect(page.getByLabel('Resource name',{exact:true})).toHaveValue(name);
 await expect(page.getByLabel('Organization name',{exact:true})).toHaveValue('Synthetic rejected organization');
 await expect(page.getByLabel('Service ZIP codes',{exact:true})).toHaveValue('98101');
 await expect(form.getByRole('checkbox',{name:'Food',exact:true})).toBeChecked();
 await expect(page.getByLabel('Description',{exact:true})).toHaveValue('Synthetic rejected-form test listing, not a real assistance service.');
 await expect(page.getByRole('radio',{name:'A website',exact:true})).toBeChecked();
 await expect(page.getByLabel('Source web address',{exact:true})).toHaveValue('ftp://example.org/synthetic-source');
 await expect(page.getByLabel('Source and permission note',{exact:true})).toHaveValue('Synthetic rejected-form fixture for testing only');
 // Fixing the one field and sending again saves, and a save still clears the form.
 await page.getByLabel('Source web address',{exact:true}).fill('https://example.org/synthetic-source');
 await add.click();
 await expect(status).toHaveText(/^Saved\. This resource needs/);
 await expect(page.getByLabel('Resource name',{exact:true})).toHaveValue('');
 await expect(page.getByRole('radio',{name:'A website',exact:true})).not.toBeChecked();
});
test('an admin who belongs to no organization has no source preselected',async({page})=>{
 await page.goto('/sign-in');await page.getByRole('button',{name:'Enter as Admin',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Add resource',exact:true})).toBeVisible();
 await page.goto('/organization');
 await expect(page.getByRole('heading',{name:'Resources you maintain',exact:true})).toBeVisible();
 for(const name of ['A website','A phone call'])await expect(page.getByRole('radio',{name,exact:true})).not.toBeChecked();
 await expect(page.getByRole('radio',{name:'The organization itself',exact:true})).toHaveCount(0);
});
test('the source question offers only answers the server accepts',async({page})=>{
 await page.goto('/sign-in');await page.getByRole('button',{name:'Enter as Admin',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Add resource',exact:true})).toBeVisible();
 await expect(page.getByRole('radio',{name:'The organization itself',exact:true})).toHaveCount(0);
 const address=page.getByLabel('Source web address',{exact:true});
 await expect(address).toHaveCount(0);
 await page.getByRole('radio',{name:'A website',exact:true}).check();
 await expect(address).toHaveAttribute('required','');
 await accessible(page);
 await page.getByRole('radio',{name:'A phone call',exact:true}).check();
 await expect(address).toHaveCount(0);
 await page.goto('/sign-in');await page.getByRole('button',{name:'Enter as Organization',exact:true}).click();
 await expect(page.getByLabel('Organization name',{exact:true})).toHaveValue('Development organization');
 await expect(page.getByRole('radio',{name:'The organization itself',exact:true})).toBeChecked();
 await expect(address).toHaveCount(0);
});
test('a signed-in user with no memberships is denied staff workspaces',async({page})=>{
 await page.goto('/sign-in');await page.getByRole('button',{name:'Enter as My profile',exact:true}).click();
 await expect(page).toHaveURL(/\/profile/);
 for(const path of ['/organization','/community','/admin']){
  await page.goto(path);
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('You do not have access to this workspace.');
 }
});
test('local sign-in rejects cross-origin and unknown identities',async({request})=>{
 const rejected=await request.post('/api/dev-session',{headers:{origin:'https://outside.example'},form:{identity:'dev-admin'}});
 expect(rejected.status()).toBe(403);
 const unknown=await request.post('/api/dev-session',{headers:{origin:'http://127.0.0.1:3100'},form:{identity:'invented-admin'}});
 expect(unknown.status()).toBe(400);
});
test('the resource form names the field to fix',async({page})=>{
 const name='Synthetic named-field resource '+Date.now();
 const form=await startListing(page,name);
 await form.getByLabel('Service ZIP codes',{exact:true}).fill('98101');
 await form.getByLabel('Phone number',{exact:true}).fill('555');
 await form.getByRole('button',{name:'Add resource',exact:true}).click();
 await expect(form.getByRole('status')).toHaveText('Please check “Phone number” and try again.');
 await expect(form.getByLabel('Resource name',{exact:true})).toHaveValue(name);
 await expect(form.getByLabel('Phone number',{exact:true})).toHaveValue('555');
});
const keepPrivate='Keep this address private. People will see “Call for location”.';
test('the address privacy choice follows Safety until someone chooses',async({page})=>{
 const form=await startListing(page,'Synthetic privacy choice '+Date.now());
 const location=form.getByRole('group',{name:'Location 1',exact:true}),privacy=location.getByRole('group',{name:'Address privacy',exact:true});
 const [keep,show]=[privacy.getByRole('radio',{name:keepPrivate,exact:true}),privacy.getByRole('radio',{name:'Show this address publicly',exact:true})];
 const safety=form.getByRole('checkbox',{name:'Safety',exact:true});
 // A new location starts with no choice, so a form sent without JavaScript leaves it to the server's Safety default.
 await expect(keep).not.toBeChecked();await expect(show).not.toBeChecked();
 await safety.check();await expect(keep).toBeChecked();
 await safety.uncheck();await expect(keep).not.toBeChecked();await expect(show).not.toBeChecked();
 // Once someone chooses, Safety no longer changes the choice.
 await show.check();await safety.check();
 await expect(show).toBeChecked();await expect(keep).not.toBeChecked();
});
test('a Safety listing keeps its private address through an edit',async({page})=>{
 test.setTimeout(120000);
 const name='Synthetic safety resource '+Date.now();
 const form=await startListing(page,name,'Safety');
 const location=form.getByRole('group',{name:'Location 1',exact:true});
 // Safety was checked while filling the form: the new location's address is private without anyone choosing it (Review Focus 5).
 await expect(location.getByRole('radio',{name:keepPrivate,exact:true})).toBeChecked();
 await form.getByLabel('Service ZIP codes',{exact:true}).fill('98102, 98101');
 await location.getByRole('radio',{name:'At a physical place',exact:true}).check();
 await location.getByLabel('Location name (optional)',{exact:true}).fill('Hidden Haven Shelter');
 await location.getByLabel('Street address',{exact:true}).fill('1 Hidden Way');
 await location.getByLabel('City',{exact:true}).fill('Seattle');
 await location.getByLabel('State',{exact:true}).selectOption('WA');
 await location.getByLabel('ZIP code',{exact:true}).fill('98109');
 await location.getByLabel('Latitude (optional)',{exact:true}).fill('47.6311');
 await location.getByLabel('Longitude (optional)',{exact:true}).fill('-122.3101');
 await form.getByLabel('Phone number',{exact:true}).fill('(206) 555-0100');
 await form.getByLabel('Extension (optional)',{exact:true}).fill('12');
 await expect(form.getByRole('radio',{name:'Not known yet',exact:true})).toBeChecked();
 await form.getByLabel('Time zone',{exact:true}).selectOption('America/Los_Angeles');
 const group=(scope:Locator,name:string)=>scope.getByRole('group',{name,exact:true});
 // Typing a time leaves "Not known yet", so the hours are kept instead of dropped (S2-28).
 await group(form,'Monday').getByLabel('Opens',{exact:true}).fill('09:00');
 await expect(form.getByRole('radio',{name:'Weekly hours',exact:true})).toBeChecked();
 await group(form,'Monday').getByLabel('Closes',{exact:true}).fill('17:00');
 await group(form,'Friday').getByLabel('Opens',{exact:true}).fill('19:00');
 await group(form,'Friday').getByLabel('Closes',{exact:true}).fill('07:00');
 await group(form,'Date with different hours 1').getByLabel('From',{exact:true}).fill('2026-12-25');
 await save(form,'Add resource');
 // An edit that changes only the description, the source and its note records the description and nothing else (Review Focus 2).
 const id=await editDescription(page,name,'Updated synthetic safety listing, not a real assistance service.');
 expect(await lastRecorded(id)).toEqual(['service:description']);
 await page.reload();
 const edit=resourceForm(page),saved=group(edit,'Location 1');
 await expect(edit.getByLabel('Description',{exact:true})).toHaveValue('Updated synthetic safety listing, not a real assistance service.');
 await expect(edit.getByLabel('Service ZIP codes',{exact:true})).toHaveValue('98101, 98102');
 await expect(edit.getByLabel('Time zone',{exact:true})).toHaveValue('America/Los_Angeles');
 await expect(group(edit,'Monday').getByLabel('Opens',{exact:true})).toHaveValue('09:00');
 await expect(group(edit,'Friday').getByLabel('Opens',{exact:true})).toHaveValue('19:00');
 await expect(group(edit,'Friday').getByLabel('Closes',{exact:true})).toHaveValue('07:00');
 await expect(group(edit,'Date with different hours 1').getByLabel('From',{exact:true})).toHaveValue('2026-12-25');
 await expect(saved.getByLabel('Street address',{exact:true})).toHaveValue('1 Hidden Way');
 await expect(saved.getByLabel('Location name (optional)',{exact:true})).toHaveValue('Hidden Haven Shelter');
 await expect(saved.getByLabel('Latitude (optional)',{exact:true})).toHaveValue('47.6311');
 await expect(saved.getByLabel('Longitude (optional)',{exact:true})).toHaveValue('-122.3101');
 await expect(saved.getByRole('radio',{name:keepPrivate,exact:true})).toBeChecked();
 await expect(edit.getByLabel('Phone number',{exact:true}).first()).toHaveValue('+12065550100');
 await expect(edit.getByLabel('Extension (optional)',{exact:true}).first()).toHaveValue('12');
 await accessible(page);
 await page.setViewportSize({width:375,height:812});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 // Neither the verification task nor the listing's card shows the private address, its ZIP, its coordinates or the location's name, only "Call for location" (Review Focus 5).
 const hidden=['1 Hidden Way','98109','Hidden Haven','47.6311','-122.3101'],titled=page.getByRole('heading',{name,exact:true});
 await page.goto('/admin');
 const mine=page.locator('article').filter({has:page.getByRole('link',{name:'Edit resource',exact:true})}).filter({has:titled});
 const task=page.locator('article').filter({has:page.getByRole('button',{name:'Record verification',exact:true})}).filter({has:titled});
 for(const article of [mine,task]){
  await expect(article).toContainText('Call for location');
  for(const text of hidden)await expect(article).not.toContainText(text);
 }
 // Headings nest under the title: Hours is an h3 under a card's h2 and an h4 under a task's h3 (axe cannot tell).
 await expect(mine.getByRole('heading',{level:3,name:'Hours',exact:true})).toBeVisible();
 await expect(task.getByRole('heading',{level:4,name:'Hours',exact:true})).toBeVisible();
 await expect(task.getByRole('heading',{level:5,name:'Dates with different hours',exact:true})).toBeVisible();
 // "Record verification" is its own heading under the task title, not inside the hours (M-3).
 await expect(task.getByRole('heading',{level:4,name:'Record verification',exact:true})).toBeVisible();
 await hydrated(task.locator('form'));
 await task.getByLabel('Method',{exact:true}).selectOption('website');
 await task.getByLabel('Evidence and source reference').fill('Synthetic evidence from example.org used only in browser testing');
 await task.getByLabel('Fields checked').fill('phone, hours and location');
 await task.getByRole('button',{name:'Record verification',exact:true}).click();
 await expect(task).toHaveCount(0);
 // Phones, weekly hours with an overnight interval, and a closure on a holiday read as stored, whatever the server's time zone (Review Focus 4).
 await page.goto('/');
 const card=page.locator('article').filter({has:titled});
 await expect(card).toContainText('Call for location');
 await expect(card.getByRole('heading',{level:3,name:'Hours',exact:true})).toBeVisible();
 await expect(card.getByRole('heading',{level:4,name:'Dates with different hours',exact:true})).toBeVisible();
 await expect(card).toContainText('(206) 555-0100');
 await expect(card.getByRole('link',{name:'(206) 555-0100',exact:true})).toHaveAttribute('href','tel:+12065550100;ext=12');
 await expect(card).toContainText('ext. 12');
 await expect(card).toContainText(/9:00\sAM – 5:00\sPM/);
 await expect(card).toContainText(/7:00\sPM – 7:00\sAM/);
 await expect(card).toContainText('Closed');
 await expect(card).toContainText(/Dec 25, 2026/);
 await expect(card).toContainText('Times are in Pacific (Los Angeles).');
 await expect(card.getByRole('listitem').filter({hasText:'Dec 25, 2026'})).toContainText('Closed');
 for(const text of hidden)await expect(card).not.toContainText(text);
 await accessible(page);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('an edit keeps every other part as stored',async({page})=>{
 test.setTimeout(240000);
 const run=Date.now(),group=(scope:Locator,name:string)=>scope.getByRole('group',{name,exact:true});
 const listings:{name:string;fill:(form:Locator)=>Promise<void>}[]=[
  {name:'Synthetic city listing '+run,fill:async form=>{
   await form.getByRole('radio',{name:'A city',exact:true}).check();
   await form.getByLabel('City or county name',{exact:true}).fill('Seattle');
   await group(form,'Where the service is available').getByLabel('State',{exact:true}).selectOption('WA');
   await form.getByRole('radio',{name:'By appointment',exact:true}).check();
   const location=group(form,'Location 1');
   await location.getByRole('radio',{name:'Online or remote',exact:true}).check();
   await location.getByLabel('Location name (optional)',{exact:true}).fill('Video visits');
  }},
  {name:'Synthetic county listing '+run,fill:async form=>{
   await form.getByRole('radio',{name:'A county',exact:true}).check();
   await form.getByLabel('City or county name',{exact:true}).fill('King');
   await group(form,'Where the service is available').getByLabel('State',{exact:true}).selectOption('WA');
   await form.getByRole('radio',{name:'24/7',exact:true}).check();
   await group(form,'Location 1').getByRole('radio',{name:'By phone only',exact:true}).check();
   await form.getByLabel('Phone number',{exact:true}).fill('988');
  }},
  {name:'Synthetic state listing '+run,fill:async form=>{
   await form.getByRole('radio',{name:'A state',exact:true}).check();
   await group(form,'Where the service is available').getByLabel('State',{exact:true}).selectOption('WA');
   await form.getByRole('radio',{name:'Weekly hours',exact:true}).check();
   await form.getByLabel('Time zone',{exact:true}).selectOption('America/Chicago');
   await group(form,'Monday').getByLabel('Opens',{exact:true}).fill('09:00');
   await group(form,'Monday').getByLabel('Closes',{exact:true}).fill('12:00');
   // A second Monday rule (a lunch break), as another writer may store it: a new day has one row, so the test adds the second pair.
   await group(form,'Monday').evaluate(day=>{for(const [name,value] of [['hours_MO_opens','13:00'],['hours_MO_closes','17:00']]){const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;day.append(input);}});
   await group(form,'Saturday').getByLabel('Opens',{exact:true}).fill('22:00');
   await group(form,'Saturday').getByLabel('Closes',{exact:true}).fill('06:00');
   const exception=group(form,'Date with different hours 1');
   await exception.getByLabel('From',{exact:true}).fill('2026-11-26');
   await exception.getByLabel('To (optional)',{exact:true}).fill('2026-11-27');
   await exception.getByLabel('Opens',{exact:true}).fill('10:00');
   await exception.getByLabel('Closes',{exact:true}).fill('14:00');
   await exception.getByLabel('Note (optional)',{exact:true}).fill('Thanksgiving');
   const location=group(form,'Location 1');
   await location.getByRole('radio',{name:'At a physical place',exact:true}).check();
   await location.getByLabel('Location name (optional)',{exact:true}).fill('Main office');
   await location.getByLabel('Street address',{exact:true}).fill('200 Public Street');
   await location.getByLabel('Apartment, suite or floor (optional)',{exact:true}).fill('Suite 4');
   await location.getByLabel('City',{exact:true}).fill('Olympia');
   await location.getByLabel('State',{exact:true}).selectOption('WA');
   await location.getByLabel('ZIP code',{exact:true}).fill('98501-1234');
   await location.getByLabel('Latitude (optional)',{exact:true}).fill('47.0379');
   await location.getByLabel('Longitude (optional)',{exact:true}).fill('-122.9007');
   await location.getByRole('radio',{name:'Show this address publicly',exact:true}).check();
   await form.getByLabel('Phone number',{exact:true}).fill('1-800-555-0199');
  }},
  {name:'Synthetic nationwide listing '+run,fill:async form=>{await form.getByRole('radio',{name:'Nationwide',exact:true}).check();}},
  // A private address in a listing without Safety: only its stored value keeps it private through an edit (S2-18).
  {name:'Synthetic private listing '+run,fill:async form=>{
   await form.getByLabel('Service ZIP codes',{exact:true}).fill('98103');
   const location=group(form,'Location 1');
   await location.getByRole('radio',{name:'At a physical place',exact:true}).check();
   await location.getByLabel('Street address',{exact:true}).fill('3 Quiet Lane');
   await location.getByLabel('City',{exact:true}).fill('Seattle');
   await location.getByLabel('State',{exact:true}).selectOption('WA');
   await location.getByLabel('ZIP code',{exact:true}).fill('98103');
   await location.getByRole('radio',{name:keepPrivate,exact:true}).check();
  }},
 ];
 for(const listing of listings){const form=await startListing(page,listing.name);await listing.fill(form);await save(form,'Add resource');}
 // The state listing gains a second phone with an extension, a second exception and a second location, so its edit form shows several saved rows of each. It also changes its time zone and its location's state.
 const {id,form}=await openEdit(page,listings[2].name);
 const monday=group(form,'Monday');
 await expect(monday.getByLabel('Opens',{exact:true})).toHaveCount(2);
 await expect(group(monday,'Time range 2').getByLabel('Closes',{exact:true})).toHaveValue('17:00');
 await group(form,'Phone 2').getByLabel('Phone number',{exact:true}).fill('(206) 555-0123');
 await group(form,'Phone 2').getByLabel('Extension (optional)',{exact:true}).fill('305');
 await group(form,'Date with different hours 2').getByLabel('From',{exact:true}).fill('2026-12-25');
 await group(form,'Location 2').getByRole('radio',{name:'Online or remote',exact:true}).check();
 await form.getByLabel('Time zone',{exact:true}).selectOption('America/Denver');
 await group(form,'Location 1').getByLabel('State',{exact:true}).selectOption('OR');
 await form.getByRole('radio',{name:'A phone call',exact:true}).check();
 await form.getByLabel('Source and permission note',{exact:true}).fill('Synthetic browser fixture for testing only');
 await save(form,'Save');
 // The save refreshes the form from what was stored, without a reload: the new rows are saved rows now, and the selects show the new values.
 await expect(group(form,'Location 2').getByRole('checkbox',{name:'Remove this location',exact:true})).toBeVisible();
 await expect(group(form,'Location 3').getByRole('radio',{name:"Don't add a location",exact:true})).toBeChecked();
 await expect(form.getByLabel('Phone number',{exact:true})).toHaveCount(3);
 await expect(group(form,'Phone 2').getByLabel('Phone number',{exact:true})).toHaveValue('+12065550123');
 await expect(form.getByLabel('Time zone',{exact:true})).toHaveValue('America/Denver');
 await expect(group(form,'Location 1').getByLabel('State',{exact:true})).toHaveValue('OR');
 // So a second save in the same view, of the description only, asserts the description and nothing else.
 await form.getByLabel('Description',{exact:true}).fill('Synthetic state listing saved twice in one view, not a real assistance service.');
 await form.getByRole('radio',{name:'A phone call',exact:true}).check();
 await form.getByLabel('Source and permission note',{exact:true}).fill('Synthetic browser fixture for testing only');
 await save(form,'Save');
 expect(await lastRecorded(id)).toEqual(['service:description']);
 for(const listing of listings){
  const id=await editDescription(page,listing.name,'Updated synthetic listing, not a real assistance service.');
  expect(await lastRecorded(id),listing.name).toEqual(['service:description']);
 }
 const {form:reopened}=await openEdit(page,listings[4].name);
 await expect(group(reopened,'Location 1').getByRole('radio',{name:keepPrivate,exact:true})).toBeChecked();
});
test('adding Safety on an edit makes a saved public address private',async({page})=>{
 const name='Synthetic Safety added on edit '+Date.now();
 const form=await startListing(page,name);
 await form.getByLabel('Service ZIP codes',{exact:true}).fill('98101');
 const location=form.getByRole('group',{name:'Location 1',exact:true});
 await location.getByRole('radio',{name:'At a physical place',exact:true}).check();
 await location.getByLabel('Street address',{exact:true}).fill('4 Harbor Road');
 await location.getByLabel('City',{exact:true}).fill('Seattle');
 await location.getByLabel('State',{exact:true}).selectOption('WA');
 await location.getByLabel('ZIP code',{exact:true}).fill('98104');
 await location.getByRole('radio',{name:'Show this address publicly',exact:true}).check();
 await save(form,'Add resource');
 const {id,form:edit}=await openEdit(page,name),saved=edit.getByRole('group',{name:'Location 1',exact:true});
 const [keep,show,safety]=[saved.getByRole('radio',{name:keepPrivate,exact:true}),saved.getByRole('radio',{name:'Show this address publicly',exact:true}),edit.getByRole('checkbox',{name:'Safety',exact:true})];
 const resubmit=async()=>{await edit.getByRole('radio',{name:'A phone call',exact:true}).check();await edit.getByLabel('Source and permission note',{exact:true}).fill('Synthetic browser fixture for testing only');await save(edit,'Save');};
 await expect(show).toBeChecked();
 // Adding Safety makes the untouched saved address private (S2-26); removing it again shows the stored choice.
 await safety.check();await expect(keep).toBeChecked();
 await safety.uncheck();await expect(show).toBeChecked();
 await safety.check();await expect(keep).toBeChecked();
 await resubmit();
 expect(await lastRecorded(id)).toEqual(['location:confidential','service:categories']);
 await page.reload();
 await hydrated(edit);
 await expect(keep).toBeChecked();
 // In a listing that already has Safety, a saved address shows its stored choice: staff may show it publicly, and a later edit leaves that alone.
 await show.check();
 await resubmit();
 expect(await lastRecorded(id)).toEqual(['location:confidential']);
 expect(await lastRecorded(await editDescription(page,name,'Updated synthetic Safety listing, not a real assistance service.'))).toEqual(['service:description']);
 await expect(show).toBeChecked();
});
