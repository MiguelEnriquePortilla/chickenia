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
module.exports={schema};
