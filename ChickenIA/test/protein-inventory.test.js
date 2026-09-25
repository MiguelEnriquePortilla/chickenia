'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const domain=require('../lib/protein-inventory'),auth=require('../lib/inventory-auth');
const schema=`CREATE TABLE locations(id serial PRIMARY KEY,code text,active boolean DEFAULT true);
INSERT INTO locations(code) VALUES('rastro');
CREATE TABLE inventory_items(id serial PRIMARY KEY,sku text UNIQUE,name text,category text,unit text,active boolean DEFAULT true);
INSERT INTO inventory_items(sku,name,category,unit) VALUES('VER-001','Jitomate','verdura','kg');
CREATE TABLE inventory_movements(id serial PRIMARY KEY,item_id int REFERENCES inventory_items(id),location_id int REFERENCES locations(id),movement_type text,quantity numeric,movement_date date,notes text,recorded_by text,recorded_at timestamptz DEFAULT now());`;
const manager={id:'miguel',name:'Miguel',role:'manager'},processor={id:'eliseo',name:'Eliseo',role:'processor'},kitchen={id:'nancy',name:'Nancy',role:'kitchen'};
async function fixture(){
 const db=new PGlite();await db.exec(schema);const query=async(s,p)=>(await db.query(s,p)).rows;
 return {db,query,read:(date='2026-09-14')=>domain.read(query,date),save:(body,user=manager)=>db.transaction(async tx=>domain.save(async(s,p)=>(await tx.query(s,p)).rows,body,user))};
}
test('decimal stock, preparation conservation, shipments, receipt differences, counts and weekly carry-forward',async()=>{
 const f=await fixture();let revision=0;const save=async(action,extra={},actor=manager)=>{const d=await f.save({date:'2026-09-14',revision,protein:'rosti',action,...extra},actor);revision=d.revision;return d;};
 try{
  const empty=await f.read();assert.equal(empty.rows[0].total,null);assert.equal(empty.rows[0].raw.count,null);assert.equal((await f.query('SELECT * FROM inventory_items')).length,1);
  let d=await save('initial',{raw:232,marinated:100});assert.equal(d.rows[0].total,332);assert.equal(d.rows[1].total,null);
  d=await save('send',{amount:60,slot:'morning'},processor);assert.equal(d.rows[0].raw.current,232);assert.equal(d.rows[0].marinated.current,40);assert.equal(d.rows[0].total,272);
  const shipment=d.shipments[0].id;
  d=await save('marinate',{amount:10.125},processor);assert.equal(d.rows[0].raw.current,221.875);assert.equal(d.rows[0].marinated.current,50.125);assert.equal(d.rows[0].total,272);assert.equal(d.rows[0].prepared,10.125);
  d=await save('entry',{amount:.375},processor);assert.equal(d.rows[0].total,272.375);
  await assert.rejects(save('receive',{shipment,amount:59.5},kitchen),/diferencia/);
  d=await save('receive',{shipment,amount:59.5,notes:'Medio pollo faltante'},kitchen);assert.equal(d.pending,0);assert.equal(d.shipments[0].receipt.difference,-.5);assert.equal(d.shipments[0].receipt.actor,'Nancy');assert.equal(d.rows[0].total,272.375);
  await assert.rejects(save('receive',{shipment,amount:60},kitchen),e=>e.status===409);
  await assert.rejects(save('count',{raw:222,marinated:50}),/diferencia/);
  d=await save('count',{raw:222,marinated:50,notes:'Diferencia por revisar'},processor);assert.equal(d.rows[0].raw.count.difference,-.25);assert.equal(d.rows[0].total,272.375);
  d=await save('waste',{state:'raw',amount:.25,notes:'Merma documentada'},processor);assert.equal(d.rows[0].raw.current,222);assert.equal(d.rows[0].raw.count.movedSince,true);
  const next=await f.read('2026-09-15');assert.equal(next.rows[0].raw.previous,222);assert.equal(next.rows[0].marinated.previous,50.125);assert.equal(next.rows[0].entries,0);assert.equal(next.week[0].rows[0].sent,60);assert.equal(next.week[2].rows,null);
  const history=await f.query('SELECT recorded_by,recorded_at FROM inventory_movements');assert.ok(history.every(e=>e.recorded_by&&e.recorded_at));
  // Shared Rastro ledger ignores protein counts/receipts and remains usable.
  const rastro=await require('../lib/rastro').read(f.query,'2026-09-14');assert.equal(rastro.lines.length,1);assert.equal(rastro.revision,0);
 }finally{await f.db.close();}
});
test('transaction rollback, stale submissions, decimal validation, backdating and role restrictions',async()=>{
 const f=await fixture();const base={date:'2026-09-14',protein:'cruji'};let d;
 try{
  await assert.rejects(f.save({...base,revision:0,action:'initial',raw:180,marinated:45},processor),e=>e.status===403);
  d=await f.save({...base,revision:0,action:'initial',raw:180,marinated:45});
  await assert.rejects(f.save({...base,revision:0,action:'entry',amount:10}),e=>e.status===409);
  const revision=d.revision;
  for(const body of [{action:'send',amount:46,slot:'noon'},{action:'marinate',amount:181},{action:'entry',amount:.0001},{action:'entry',amount:-1},{action:'initial',raw:180,marinated:45},{action:'waste',state:'raw',amount:1},{action:'entry',amount:1,date:'2026-09-13'}]){
   await assert.rejects(f.save({...base,revision,...body}));assert.equal((await f.read()).revision,revision);
  }
  await assert.rejects(f.save({...base,revision,action:'entry',amount:1},kitchen),e=>e.status===403);
  d=await f.save({...base,revision,action:'send',amount:30,slot:'noon'});assert.equal(d.rows[1].total,195);
  d=await f.save({...base,date:'2026-09-16',revision:d.revision,action:'send',amount:15,slot:'other'});
  await assert.rejects(f.save({...base,date:'2026-09-15',revision:d.revision,action:'send',amount:1,slot:'morning'}),/supera/);
  assert.equal((await f.read('2026-09-16')).rows[1].marinated.current,0);
  d=await f.save({...base,date:'2026-09-16',revision:d.revision,action:'count',raw:180,marinated:0});
  await assert.rejects(f.save({...base,revision:d.revision,action:'entry',amount:10}),/conteo físico posterior/);
  await assert.rejects(f.save({...base,revision:d.revision,date:'2099-01-01',action:'entry',amount:1}),/futuros/);
  assert.equal((await f.read('2026-09-13')).rows[1].total,null);
  const simultaneous=await Promise.allSettled([1,2].map(()=>f.save({...base,date:'2026-09-16',revision:d.revision,action:'entry',amount:.125})));
  assert.equal(simultaneous.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(simultaneous.find(r=>r.status==='rejected').reason.status,409);
  assert.equal((await f.read('2026-09-16')).rows[1].raw.current,180.125);
 }finally{await f.db.close();}
});
test('API session, admin summary, origin, persisted transaction and duplicate request protections',async()=>{
 const f=await fixture(),original=auth.authenticate;let user=null,connections=0;
 const handler=require('../api/protein-inventory').createHandler(async()=>{connections++;return {query:(s,p)=>f.db.query(s,p),release(){}};});
 const call=async(method='GET',body,headers={},query={})=>{let status,data;await handler({method,body,query:{date:'2026-09-14',...query},headers:{host:'app.test',origin:'https://app.test','content-type':'application/json',...headers}},{setHeader(){},status(s){status=s;return this;},json(d){data=d;}});return {status,data};};
 try{
  auth.authenticate=()=>{if(!user)throw Object.assign(Error('Inicia sesión'),{status:401});return user;};
  assert.equal((await call()).status,401);user=kitchen;assert.equal((await call('GET',null,{}, {view:'admin'})).status,403);
  user=manager;assert.equal((await call('POST',{}, {origin:'https://other.test'})).status,403);assert.equal(connections,0);
  assert.equal((await call('GET',null,{}, {date:'2026-02-30'})).status,400);
  const body={date:'2026-09-14',revision:0,protein:'rosti',action:'initial',raw:0,marinated:1.5};
  const saved=await call('POST',body);assert.equal(saved.status,200);assert.equal(saved.data.rows[0].total,1.5);
  assert.equal((await call('POST',body)).status,409);
  assert.equal((await call('POST',{...body,revision:saved.data.revision,action:'send',amount:2,slot:'morning',raw:undefined,marinated:undefined})).status,400);
  assert.equal((await call()).data.rows[0].total,1.5);
 }finally{auth.authenticate=original;await f.db.close();}
});
test('rectification fixes actual stock, preserves original records and separates corrections from shipments',async()=>{
 const f=await fixture(),base={date:'2026-09-14',protein:'cruji'};
 try{
  let d=await f.save({...base,revision:0,action:'initial',raw:180,marinated:30});
  const initial=await f.query('SELECT * FROM inventory_movements ORDER BY id');
  const body={...base,revision:d.revision,action:'rectify',raw:150,marinated:0,notes:'Se sumaron los que salieron por error'};
  await assert.rejects(f.save(body,processor),e=>e.status===403);
  await assert.rejects(f.save({...body,notes:' '}),/motivo/);
  await assert.rejects(f.save({...body,raw:-1}));
  await assert.rejects(f.save({...body,raw:150.0001}));
  await assert.rejects(f.save({...body,raw:180,marinated:30}),/iguales/);
  d=await f.save(body);const r=d.rows[1];
  assert.equal(r.total,150);assert.equal(r.adjustment,-60);assert.equal(r.sent,0);assert.equal(r.entries,0);assert.equal(r.waste,0);assert.equal(d.shipments.length,0);
  assert.deepEqual(r.correction.before,{raw:180,marinated:30});assert.deepEqual(r.correction.after,{raw:150,marinated:0});assert.equal(r.correction.actor,'Miguel');
  assert.deepEqual(await f.query("SELECT * FROM inventory_movements WHERE movement_type='initial' ORDER BY id"),initial);
  assert.equal(d.history.filter(e=>e.action==='rectify').length,2);
  assert.equal((await f.read('2026-09-15')).rows[1].raw.previous,150);
  assert.equal((await f.read('2026-09-13')).rows[1].total,null);
  assert.equal(d.week[0].rows[1].adjustment,-60);
  await assert.rejects(f.save(body),e=>e.status===409);
  // Fractional redistribution does not alter the total; both legs are audited.
  d=await f.save({...base,revision:d.revision,action:'rectify',raw:145.875,marinated:4.125,notes:'Corregir separación del pollo contado'});
  assert.equal(d.rows[1].total,150);
  d=await f.save({...base,revision:d.revision,action:'send',amount:4.125,slot:'morning'});
  assert.equal(d.rows[1].total,145.875);assert.equal(d.rows[1].sent,4.125);
  const shipment=d.shipments[0].id;
  d=await f.save({...base,revision:d.revision,action:'receive',shipment,amount:4.125},kitchen);
  d=await f.save({...base,revision:d.revision,action:'rectify',raw:144.875,marinated:0,notes:'Error de un pollo en la apertura'});
  assert.equal(d.shipments[0].receipt.amount,4.125);assert.equal(d.shipments[0].sent,4.125);assert.equal(d.pending,0);
  const later={...base,date:'2026-09-15',revision:d.revision,action:'entry',amount:1};d=await f.save(later);
  await assert.rejects(f.save({...body,revision:d.revision}),/registros posteriores/);
  d=await f.save({...body,date:'2026-09-15',revision:d.revision,raw:145,marinated:0});
  await assert.rejects(f.save({...base,revision:d.revision,action:'entry',amount:1}),/rectificó/);
  assert.equal((await f.read('2026-09-15')).rows[1].total,145);
  const simultaneous=await Promise.allSettled([1,2].map(()=>f.save({...body,date:'2026-09-15',revision:d.revision,raw:146,marinated:0})));
  assert.equal(simultaneous.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.read('2026-09-15')).rows[1].total,146);
 }finally{await f.db.close();}
});

test('fixed form saves both proteins atomically, rejects stale retry and keeps shipment receipts separate',async()=>{
 const f=await fixture(),date='2026-09-14';
 try{
  let d=await f.save({date,revision:0,protein:'rosti',action:'initial',raw:100,marinated:40});
  d=await f.save({date,revision:d.revision,protein:'cruji',action:'initial',raw:10,marinated:0});
  const body={date,revision:d.revision,action:'movements',slot:'noon',deliveredBy:'Eliseo',receivedBy:'Nancy',notes:'Entrega',lines:[{protein:'rosti',entry:20,marinate:30,send:50},{protein:'cruji',marinate:2.5,send:3}]};
  await assert.rejects(f.save(body),/supera/);assert.equal((await f.read()).revision,d.revision);
  assert.equal((await f.read()).rows[0].total,140);
  body.lines[1].send=2.5;d=await f.save(body);
  assert.equal(d.rows[0].raw.current,90);assert.equal(d.rows[0].marinated.current,20);
  assert.equal(d.rows[1].total,7.5);assert.equal(d.shipments.length,2);assert.equal(d.pending,2);
  assert.match(d.shipments[0].notes,/Entrega: Eliseo/);assert.equal(d.shipments[0].receipt,null);
  await assert.rejects(f.save(body),e=>e.status===409);
  await assert.rejects(f.save({...body,revision:d.revision,lines:[{protein:'rosti',entry:0}]}),/mayor que cero/);
  await assert.rejects(f.save({...body,revision:d.revision},kitchen),e=>e.status===403);
 }finally{await f.db.close();}
});


test('reset starts a zero cycle atomically, archives old receipts and preserves unrelated inventory',async()=>{
 const f=await fixture(),day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City'}).format(new Date());
 try{
  let d=await f.save({date:day,revision:0,protein:'rosti',action:'initial',raw:100,marinated:20});
  d=await f.save({date:day,revision:d.revision,protein:'rosti',action:'send',amount:5,slot:'morning'});
  const shipment=d.shipments[0].id;
  await f.query("INSERT INTO inventory_movements(item_id,location_id,movement_type,quantity,movement_date,notes,recorded_by) VALUES(1,1,'entry',9,$1,'Verdura sin cambios','Nancy')",[day]);
  const before=await f.query('SELECT * FROM inventory_movements ORDER BY id');
  const body={date:day,revision:d.revision,action:'reset',notes:'Inicio del ciclo y arqueo autorizado',confirm:true};
  await assert.rejects(f.save(body,processor),e=>e.status===403);
  await assert.rejects(f.save({...body,confirm:false}));
  await assert.rejects(f.save({...body,date:'2026-01-01'}),/hoy/);
  let inserts=0;
  await assert.rejects(f.db.transaction(async tx=>domain.save(async(s,p)=>{
   if(s.startsWith('INSERT INTO inventory_movements')&&++inserts===3)throw Error('simulated write failure');
   return (await tx.query(s,p)).rows;
  },body,manager)),/simulated/);
  assert.deepEqual(await f.query('SELECT * FROM inventory_movements ORDER BY id'),before);
  d=await f.save(body);
  assert.deepEqual(d.rows.map(r=>[r.raw.current,r.marinated.current,r.total,r.sent,r.entries]),[[0,0,0,0,0],[0,0,0,0,0]]);
  assert.equal(d.pending,0);assert.equal(d.shipments.length,0);assert.equal(d.history.length,4);assert.equal(d.reset.actor,'Miguel');
  assert.deepEqual(await f.query('SELECT * FROM inventory_movements WHERE id<= $1 ORDER BY id',[before.at(-1).id]),before);
  await assert.rejects(f.save(body),e=>e.status===409);
  await assert.rejects(f.save({date:day,revision:d.revision,protein:'rosti',action:'receive',shipment,amount:5},kitchen),/envío no existe/);
  d=await f.save({date:day,revision:d.revision,protein:'rosti',action:'rectify',raw:12.125,marinated:2.5,notes:'Arqueo físico de hoy'});
  d=await f.save({date:day,revision:d.revision,protein:'cruji',action:'entry',amount:10.125});
  assert.equal(d.rows[0].total,14.625);assert.equal(d.rows[1].total,10.125);
  const reloaded=await f.read(day);assert.equal(reloaded.rows[0].total,14.625);
  d=await f.save({...body,revision:d.revision});assert.deepEqual(d.rows.map(r=>r.total),[0,0]);
 }finally{await f.db.close();}
});
