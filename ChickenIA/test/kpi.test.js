'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const kpi=require('../lib/supervision/kpi'),catalog=require('../lib/supervision/kpi-catalog');
const product={id:'rosti',name:'Rosti',area:'rosticero',active:true,unit:'pollos',produced:20,planned:20,previous:0,closing:4};
const sources={productionRevision:1,productionFinalized:true,cashRevision:1,cashFinalized:true,cashBalanced:true,products:[product]};
function data(cut,products=[product]){return {checks:catalog.requirements(cut).map(r=>({id:r.id,status:'ready',note:''})),products:products.filter(p=>p.active).map(p=>({id:p.id,available:4,quality:'approved',note:'Demanda restante revisada con el área',inProcess:2,remainingDemand:6,additional:0,decision:'stop'})),notes:''};}
test('four controls, quality issues, blank quantities and explicit zero are evaluated separately',()=>{
 assert.deepEqual(kpi.CUTS.map(c=>c.time),['09:30','12:00','16:00','19:00']);
 let d=data('apertura');assert.equal(kpi.evaluate(d,'apertura',sources).ready,true);
 d.products[0].available=null;assert.equal(kpi.evaluate(d,'apertura',sources).reviewed,false);
 d.products[0].available=0;assert.equal(kpi.evaluate(d,'apertura',sources).reviewed,true);assert.equal(kpi.evaluate(d,'apertura',sources).ready,false);
 d.products[0].quality='issue';assert.equal(kpi.evaluate(d,'apertura',sources).reviewed,true);assert.equal(kpi.evaluate(d,'apertura',sources).ready,false);
 assert.equal(kpi.evaluate(data('apertura'),'apertura',{...sources,productionRevision:0}).ready,false);
 assert.equal(kpi.evaluate(data('apertura',[]),'apertura',{...sources,products:[]}).ready,false);
 assert.throws(()=>kpi.validate({...data('apertura'),checks:[]},'apertura',[product]),/listado/);
 d=data('apertura');d.products[0].quality='issue';d.products[0].note='';assert.throws(()=>kpi.validate(d,'apertura',[product]),/incidencia/);
});
test('16:00 requires a production decision; closure needs finalized sources and matching inventory',()=>{
 const d=data('ajuste');assert.equal(kpi.evaluate(d,'ajuste',sources).ready,true);
 d.products[0].additional=null;assert.equal(kpi.evaluate(d,'ajuste',sources).ready,false);
 const close=data('cierre');assert.equal(kpi.evaluate(close,'cierre',sources).ready,true);
 close.products[0].available=5;assert.equal(kpi.evaluate(close,'cierre',sources).ready,false);
 assert.equal(kpi.evaluate(data('cierre'),'cierre',{...sources,cashBalanced:false}).ready,false);
 assert.equal(kpi.evaluate(data('cierre'),'cierre',{...sources,productionFinalized:false}).ready,false);
});
test('future controls do not lower scores, last on-time revision wins and late corrections preserve failure',()=>{
 const date='2026-10-05',evaluation=kpi.evaluate(data('apertura'),'apertura',sources);
 const event={date,cut:'apertura',revision:1,created_at:'2026-10-05T15:29:59Z',evaluation};
 let s=kpi.summarize(date,[event],date,'2026-10-05T17:00:00Z');assert.equal(s.met,1);assert.equal(s.due,1);assert.equal(s.score,100);
 assert.equal(s.cuts[1].status,'upcoming');
 const bad={...event,revision:2,created_at:'2026-10-05T15:30:00Z',evaluation:{...evaluation,ready:false}};
 const corrected={...event,revision:3,created_at:'2026-10-05T15:31:00Z'};
 s=kpi.summarize(date,[event,bad,corrected],date,'2026-10-05T18:00:00Z');assert.equal(s.met,0);assert.equal(s.due,2);assert.equal(s.cuts[0].status,'late');assert.equal(s.cuts[0].atDeadline.revision,2);
 assert.equal(kpi.summarize(date,[event],'2026-10-06','2026-10-06T02:00:00Z').due,0);
 assert.equal(kpi.summarize(date,[],date,'2026-10-06T01:00:00Z').due,4);
});
test('real PostgreSQL keeps immutable revisions, rejects stale edits, changed sources, future and past capture',async()=>{
 const db=new PGlite(),query=async(s,p)=>(await db.query(s,p)).rows,service=require('../lib/supervision/kpi-store').store(query);
 try{
  await service.migrate();await service.migrate();
  const now=new Date(),date=kpi.day(now),src=await service.sources(date);
  const body={date,cut:'apertura',revision:0,sourceRevision:0,cashRevision:0,data:data('apertura',src.products)};
  const actor={id:'nancy',name:'Nancy'};
  const saved=await service.save(1,body,actor,now);assert.equal(saved.revision,1);assert.equal(saved.evaluation.ready,false);
  await assert.rejects(service.save(1,body,actor,now),/Otro usuario/);
  const result=await Promise.allSettled([service.save(1,{...body,revision:1},actor,now),service.save(1,{...body,revision:1},actor,now)]);
  assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
  const events=await service.events(1,date);assert.equal(events.length,2);assert.equal(events[0].actor_name,'Nancy');assert.ok(events[0].created_at);
  await assert.rejects(service.save(1,{...body,revision:2,sourceRevision:99},actor,now),/cambiaron/);
  await assert.rejects(service.save(1,{...body,date:'2020-01-01'},actor,now),/día actual/);
  await assert.rejects(service.save(1,{...body,cut:'comida'},actor,new Date(date+'T14:00:00Z')),/todavía no inicia/);
  const view=await service.get(1,date,now);assert.equal(view.periods.length,2);assert.equal(view.due,0);
  assert.equal((await query('SELECT count(*)::int n FROM supervision_kpi_config'))[0].n,1);
 }finally{await db.close();}
});
test('API authenticates before DB access and protects writes and location scope',async()=>{
 const auth=require('../lib/inventory-auth'),original=auth.authenticate;
 const handler=require('../lib/supervision/kpi-handler').createHandler(async()=>{throw Error('DB should not be called');});
 const call=async(method,headers={},body={})=>{let status,result;await handler({method,headers,body,query:{date:'2026-10-05'}},{setHeader(){},status(v){status=v;return this;},json(v){result=v;}});return {status,result};};
 try{
  auth.authenticate=()=>{throw Object.assign(Error('Inicia sesión'),{status:401});};assert.equal((await call('GET')).status,401);
  auth.authenticate=()=>({id:'cook',role:'kitchen'});assert.equal((await call('GET')).status,403);
  auth.authenticate=()=>({id:'nancy',role:'manager'});assert.equal((await call('POST')).status,403);
  assert.equal((await call('POST',{host:'app.test',origin:'https://evil.test','content-type':'application/json'})).status,403);
  assert.equal((await call('POST',{host:'app.test',origin:'https://app.test','content-type':'text/plain'})).status,415);
  assert.equal((await call('POST',{host:'app.test',origin:'https://app.test','content-type':'application/json'},{date:'bad'})).status,400);
 }finally{auth.authenticate=original;}
});
test('digital cash source requires explicit reconciliation, including card total and cash sales',async()=>{
 const db=new PGlite(),query=async(s,p)=>(await db.query(s,p)).rows;
 try{
  const cash=require('../lib/cash-close'),actor={id:'nancy',environment:'production',business:'chicanito',canWrite:true};
  const service=cash.cashService(query,actor),date=kpi.day(new Date()),data=cash.blank();await service.get(date);
  data.cashier='Nancy';data.receiver='Nancy';data.deliveryTime='19:00';data.receipt='Prueba aislada';data.salesTotal=0;
  for(const key of Object.keys(data.cash))data.cash[key]=0;
  for(const key of Object.keys(data.counts))data.counts[key]=0;
  for(const key of Object.keys(data.payments))data.payments[key]={expected:0,confirmed:0};
  data.digital={coinsTotal:0,cardTotal:0,preparedTime:'19:00',deliveredBy:'Nancy',reviewedBy:'Nancy'};
  await service.save({date,revision:0,data});
  const store=require('../lib/supervision/kpi-store').store(query);
  assert.equal((await store.sources(date)).cashBalanced,true);
  data.digital.cardTotal=100;
  await service.save({date,revision:1,data});assert.equal((await store.sources(date)).cashBalanced,false);
  data.digital.cardTotal=0;data.payments.cash.confirmed=null;
  await service.save({date,revision:2,data});assert.equal((await store.sources(date)).cashBalanced,false);
 }finally{await db.close();}
});
test('cron configuration matches the four controls and archived schedules remain readable',()=>{
 const config=require('../vercel.json'),telegram=require('../lib/supervision/telegram');
 assert.deepEqual(config.crons.map(r=>r.schedule),['30 15 * * *','0 18 * * *','0 22 * * *','0 1 * * *']);
 assert.equal(telegram.cutsForDate('2026-09-26').length,5);
 assert.equal(telegram.cutsForDate('2026-10-05').length,4);
 assert.equal(telegram.cutLabel({cut:'precierre'}),'Antes del cierre');
});
