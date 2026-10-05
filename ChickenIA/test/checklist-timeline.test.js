'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const timeline=require('../lib/supervision/checklist-timeline'),store=require('../lib/supervision/checklist-timeline-store');
const date='2026-10-06',at=t=>`${date}T${t}:00-06:00`;
const catalog=[{id:1,area_code:'cocina',area_name:'Cocina',name:'Inicio',routine_block:'apertura',weight:3},{id:2,area_code:'cocina',area_name:'Cocina',name:'Cierre',routine_block:'cierre',weight:3}];
const event=(id,time,done=true,more={})=>({id,activity_id:id,done,recorded_at:at(time),verified_at:at(time),...more});
test('cuts freeze at their exact deadline; late checks and later unchecks do not rewrite the morning',()=>{
 const events=[event(1,'10:01'),event(2,'18:50')];
 let result=timeline.evaluate(catalog,events,date,at('19:00'));
 assert.deepEqual(result.cuts.map(c=>c.areas[0].score),[0,100,100,100]);
 assert.equal(result.areas[0].score,75);
 events.push(event(1,'18:55',false,{id:3}));result=timeline.evaluate(catalog,events,date,at('19:00'));
 assert.deepEqual(result.cuts.map(c=>c.areas[0].score),[0,100,100,50]);
 assert.equal(timeline.evaluate(catalog,[event(1,'10:00')],date,at('10:00')).cuts[0].areas[0].score,100);
 assert.equal(timeline.evaluate(catalog,[{...event(1,'10:00'),recorded_at:'2026-10-05T10:00:00-06:00'}],date,at('10:00')).cuts[0].areas[0].score,0);
 assert.equal(timeline.evaluate(catalog,[],date,at('09:00')).areas[0].score,null);
 assert.equal(timeline.evaluate(catalog,[],'2026-10-05',at('19:00')).areas[0].score,null);
});
test('repeat checks require a new verification; editing notes or quantities does not renew an observation',()=>{
 const row={...catalog[0],name:'Mantener productos hidratados todo el día, incluyendo ensaladas',routine_block:'operacion',measurement:'percentage'};
 const morning=event(1,'11:00',true,{quality_score:100});
 const edited=event(1,'15:00',true,{id:2,quality_score:100,verified_at:at('11:00')});
 let r=timeline.evaluate([row],[morning,edited],date,at('19:00'));
 assert.deepEqual(r.cuts.map(c=>c.areas[0].score),[null,100,0,0]);
 r=timeline.evaluate([row],[morning,{...edited,verified_at:at('15:00')}],date,at('19:00'));
 assert.deepEqual(r.cuts.map(c=>c.areas[0].score),[null,100,100,100]);
 assert.equal(timeline.schedule({...row,name:'Preparación de una sola vez'}).repeat,false);
});
test('explicit times, afternoon orders, late closing and unknown metadata are not penalized early',()=>{
 assert.equal(timeline.schedule({name:'4:00pm — Revisión',routine_block:'operacion'}).first,2);
 assert.equal(timeline.schedule({name:'7:30pm — Reporte',routine_block:'cierre'}).first,null);
 assert.equal(timeline.schedule({name:'Sin bloque'}).first,null);
 assert.equal(timeline.schedule({name:'Elaborar con Nancy la orden de producción del siguiente día',routine_block:'operacion'}).first,2);
 assert.equal(timeline.schedule({measurement:'bar-close',routine_block:'operacion'}).first,3);
});
test('weekly/monthly means average daily grades and exclude partial, closed and pre-activation days',()=>{
 const days=[{date,final:true,active:true,areas:[{code:'cocina',score:75}]},{date:'2026-10-07',final:true,active:true,areas:[{code:'cocina',score:100}]},{date:'2026-10-08',final:false,active:true,areas:[{code:'cocina',score:0}]},{date:'2026-10-09',final:true,closed:true,active:true,areas:[{code:'cocina',score:0}]}];
 assert.deepEqual(timeline.averages(days,'2026-10-09',7).areas.cocina,{score:88,days:2});
 assert.equal(timeline.averages(days,'2026-11-09',30).days,0);
});
test('real PostgreSQL/API journals edits atomically, preserves the daily catalog, isolates locations and audits closed days',async()=>{
 const {db,sql}=await require('./checklist-timeline-fixture').fixture();
 const dbModule=require('../lib/supervision/db'),original=dbModule.ensureTables;dbModule.ensureTables=async()=>sql;
 const checks=require('../api/checks'),today=timeline.day();
 const call=async(body)=>{let status,result;await checks({method:'POST',body,query:{},headers:{}},{status(n){status=n;return this;},json(d){result=d;}});assert.equal(status,200,JSON.stringify(result));return result;};
 try{
  await store.migrate(sql);
  const base={activity_id:1,location_id:1,check_date:today,done:true,checked_by:'Nancy',verify:true};
  const first=await call(base);assert.ok(first.verified_at);
  await call({...base,verify:false,notes:'Observación corregida'});
  let events=await sql`SELECT * FROM checklist_check_events ORDER BY id`;assert.equal(events.length,2);assert.equal(+events[0].verified_at,+events[1].verified_at);
  await call({...base,done:false});await call(base);events=await sql`SELECT * FROM checklist_check_events ORDER BY id`;assert.equal(events.length,4);assert.equal(events[2].done,false);assert.ok(+events[3].verified_at>=+events[0].verified_at);
  await sql`UPDATE activities SET name='Nombre cambiado',weight=10 WHERE id=1`;
  await store.ensureDay(sql,1,today);
  const [saved]=await sql`SELECT catalog FROM checklist_timeline_days WHERE location_id=1`;assert.equal(saved.catalog[0].name,'Preparar cocina');assert.equal(saved.catalog[0].weight,3);
  await call({...base,location_id:2});assert.equal((await sql`SELECT count(*)::int n FROM checklist_timeline_days WHERE location_id=2`)[0].n,0);
  const view=await store.get(sql,1,today);assert.equal(view.areas.length,3);assert.equal(view.cuts.length,4);
  await store.setClosed(sql,1,today,true,'Sucursal cerrada','Miguel');assert.equal((await store.get(sql,1,today)).closed,true);
  await store.setClosed(sql,1,today,false,'Se abrió la sucursal','Miguel');assert.equal((await sql`SELECT count(*)::int n FROM checklist_timeline_calendar_events`)[0].n,2);
  await sql`DELETE FROM activity_checks WHERE activity_id=1 AND location_id=1`;
  assert.equal((await sql`SELECT done FROM checklist_check_events WHERE location_id=1 ORDER BY id DESC LIMIT 1`)[0].done,false);
 }finally{dbModule.ensureTables=original;await db.close();}
});
test('calendar changes require a manager, same origin and explicit reason before database access',async()=>{
 const auth=require('../lib/inventory-auth'),original=auth.authenticate,handler=require('../lib/supervision/checklist-timeline-handler');
 const call=async(headers={},body={})=>{let status;await handler({method:'POST',headers,body,query:{date,location_id:1}},{setHeader(){},status(n){status=n;return this;},json(){}});return status;};
 try{
  auth.authenticate=()=>{throw Object.assign(Error('Sesión requerida'),{status:401});};assert.equal(await call(),401);
  auth.authenticate=()=>({role:'kitchen'});assert.equal(await call(),403);
  auth.authenticate=()=>({role:'manager'});assert.equal(await call(),403);
  assert.equal(await call({host:'app.test',origin:'https://app.test','content-type':'application/json'},{closed:true,reason:''}),400);
 }finally{auth.authenticate=original;}
});
