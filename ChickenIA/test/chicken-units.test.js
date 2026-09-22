'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const units=require('../lib/chicken-units'),prod=require('../lib/production-daily'),domain=require('../lib/inventory-domain');
test('Piece-tagged production and losses convert exactly once; finalized history remains unchanged',async()=>{
 const {PGlite}=require('@electric-sql/pglite'),db=new PGlite(),q=async(s,p)=>(await db.query(s,p)).rows;
 try{
  const service=prod.service(q,{environment:'local-test',business:'chicanito',canWrite:true,id:'test'});
  await service.get('2026-09-21');
  const data=prod.blank();data.chickenUnit='piezas';
  for(const line of data.lines.filter(l=>['rosti','freidoras-4'].includes(l.id)))Object.assign(line,{unit:'piezas',previousRaw:80,previousCooked:4,receivedRaw:16,plan1:16,done1:12,plan2:8,done2:6,done3:2,closingCooked:3,closingRaw:40});
  data.digital=true;data.losses=[{productId:'rosti',state:'cocido',type:'merma',quantity:1,unit:'piezas',reason:'Daño'}];
  await q('INSERT INTO production_daily_pilot(date,revision,data,finalized) VALUES($1,1,$2,true)',['2026-09-21',JSON.stringify(data)]);
  const result=await service.get('2026-09-21');assert.equal(result.data.chickenUnit,'pollos');assert.equal(result.data.losses[0].quantity,.125);
  assert.equal(result.data.lines.find(l=>l.id==='rosti').closingCooked,.375);assert.equal(result.totals.chickenTotal,5);
  assert.deepEqual((await service.get('2026-09-21')).data,result.data);
  assert.deepEqual((await q('SELECT data FROM production_daily_pilot'))[0].data,data);
  await assert.rejects(service.save(result),e=>e.status===409);
  const fresh=await service.get('2026-09-22');fresh.data.digital=true;
  for(const line of fresh.data.lines.filter(l=>['rosti','freidoras-4'].includes(l.id)))Object.assign(line,{previousRaw:1.125,done1:1.5,done2:.25,done3:0});
  const saved=await service.save(fresh);assert.equal(saved.totals.chickenTotal,3.5);
  assert.deepEqual((await service.get(fresh.date)).data,saved.data);
 }finally{await db.close();}
});
test('Decimal chicken operations retain legacy ledger, transit, corrections and displayed history',()=>{
 let state=domain.freshState();const events=[],actor={id:'test',name:'Test',role:'manager'};
 const run=(type,values)=>{const result=domain.applyOperation(state,units.command({id:randomUUID(),type,...values}),actor);state=result.state;events.push(result.event);return result.event;};
 for(const location of ['cedis','sucursal'])run('initial',{location,lines:units.ids.map(item=>({item,qty:item==='cruji-marinado'&&location==='cedis'?2.125:0}))});
 const request=run('request',{due:domain.today(new Date()),lines:[{item:'cruji-marinado',qty:1.125}]});
 const sent=run('send',{request:request.id,lines:[{item:'cruji-marinado',qty:1.125}]});run('receive',{request:request.id,shipment:sent.id,lines:[{item:'cruji-marinado',qty:1.125}]});
 run('cook',{recipe:'freir',qty:1.125});assert.equal(state.balances['sucursal:cruji-cocinado'],9000);
 const sale=run('sale',{presentation:'article',item:'cruji-cocinado',qty:.5,kind:'sale'});
 assert.equal(units.display(state).balances['sucursal:cruji-cocinado'],625);
 run('reverse',{_target:sale,note:'Corrección'});assert.equal(units.display(state).balances['sucursal:cruji-cocinado'],1125);
 const count=run('count',{location:'sucursal',lines:[{item:'cruji-cocinado',qty:1.001}],note:'Conteo'});
 run('reconcile',{count:count.id,note:'Verificado'});assert.equal(units.display(state).balances['sucursal:cruji-cocinado'],1001);
 const publicCount=units.display(count);assert.equal(publicCount.detail.lines[0].qty,1001);assert.equal(publicCount.detail.lines[0].expected,1125);
 assert.equal(units.display(sale).deltas[0].qty,-500);
 const report=require('../lib/protein-report').proteinReport({version:1,data:state},events.map(data=>({data})),domain.today(new Date()));
 const row=units.display(report).rows.find(r=>r.item==='cruji-cocinado'&&r.location==='sucursal');assert.equal(row.current,1001);assert.equal(row.verification.quantity,1001);assert.equal(row.unit,'pollos');
 assert.equal(units.display(state).items.find(i=>i.id==='brocoli').unit,'piezas');
 assert.throws(()=>units.command({type:'count',lines:[{item:'cruji-cocinado',qty:.0001}]}));
 assert.throws(()=>units.toPieces(''));assert.throws(()=>units.toPieces(true));
});
test('Supervision converts chicken quantities and targets only, not supplies',()=>{
 const act={name:'Pollo rostizado preparado',unit:'piezas',target:'100–200 piezas'};
 assert.deepEqual(units.activity(act),{...act,unit:'pollos',target:'12.5–25 pollos'});
 assert.equal(units.check({quantity:'12'},act).quantity,1.5);
 const other={name:'Leche',unit:'piezas',target:'20 piezas'};assert.deepEqual(units.activity(other),other);
 assert.equal(units.check({quantity:'12'},{name:'Primera carga',unit:'pollos'}).quantity,'12');
});
