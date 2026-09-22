'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite'),rastro=require('../lib/rastro'),prod=require('../lib/production-daily'),cash=require('../lib/cash-close');
test('Rastro preserves unknown stock, carries balances, rolls back excessive outputs and rejects repeated saves',async()=>{
 const db=new PGlite(),q=async(s,p)=>(await db.query(s,p)).rows;
 try{
  await db.exec("CREATE TABLE locations(id serial PRIMARY KEY,code text,active boolean);INSERT INTO locations(code,active) VALUES('rastro',true);CREATE TABLE inventory_items(id serial PRIMARY KEY,sku text,name text,unit text,active boolean);INSERT INTO inventory_items(sku,name,unit,active) VALUES('VER-001','Jitomate','kg',true);CREATE TABLE inventory_movements(id serial PRIMARY KEY,item_id int,location_id int,movement_type text,quantity numeric,movement_date date,notes text,recorded_by text,recorded_at timestamptz DEFAULT now());");
  const save=body=>db.transaction(async tx=>rastro.save(async(s,p)=>(await tx.query(s,p)).rows,body,{name:'Prueba'}));
  assert.equal((await rastro.read(q,'2026-09-19')).lines[0].final,null);
  const first={date:'2026-09-19',revision:0,lines:[{itemId:1,initial:10.5,entry:4,exit:2.25}]};
  const a=await save(first);assert.equal(a.lines[0].final,12.25);
  await assert.rejects(save(first),e=>e.status===409);
  const next=await rastro.read(q,'2026-09-20');assert.equal(next.lines[0].previous,12.25);
  await assert.rejects(save({date:next.date,revision:next.revision,lines:[{itemId:1,entry:1,exit:50}]}),/supera/);
  assert.equal((await rastro.read(q,next.date)).revision,next.revision);
  const b=await save({date:next.date,revision:next.revision,lines:[{itemId:1,exit:12}]});assert.equal(b.lines[0].final,.25);
  await assert.rejects(save({date:first.date,revision:b.revision,lines:[{itemId:1,exit:1}]}),/supera/);
  assert.equal((await rastro.read(q,next.date)).lines[0].final,.25);
 }finally{await db.close();}
});
test('Rastro rectifications preserve movements, audit differences and carry three-day history',async()=>{
 const db=new PGlite(),q=async(s,p)=>(await db.query(s,p)).rows,manager={id:'admin',name:'Supervisora',role:'manager'};
 try{
  await db.exec("CREATE TABLE locations(id serial PRIMARY KEY,code text,active boolean);INSERT INTO locations(code,active) VALUES('rastro',true);CREATE TABLE inventory_items(id serial PRIMARY KEY,sku text,name text,unit text,active boolean);INSERT INTO inventory_items(sku,name,unit,active) VALUES('VER-001','Jitomate','kg',true),('RAS-011','Bolsa','pieza',true),('PRO-001','Proteina','pollo',true);CREATE TABLE inventory_movements(id serial PRIMARY KEY,item_id int,location_id int,movement_type text,quantity numeric,movement_date date,notes text,recorded_by text,recorded_at timestamptz DEFAULT now());");
  const save=(body,user=manager)=>db.transaction(async tx=>rastro.save(async(s,p)=>(await tx.query(s,p)).rows,body,user));
  let a=await save({date:'2026-08-31',revision:0,lines:[{itemId:1,initial:10,entry:5,exit:3},{itemId:2,initial:4}]});
  const body={action:'rectify',date:a.date,revision:a.revision,itemId:1,quantity:9.5,notes:'Salida capturada como entrada'};
  await assert.rejects(save(body,{role:'dispatch'}),e=>e.status===403);
  await assert.rejects(save({...body,quantity:12}),/igual/);
  await assert.rejects(save({...body,notes:' '}),/error/);
  await assert.rejects(save({...body,itemId:2,quantity:1.5}),/enteras/);
  await assert.rejects(save({...body,itemId:3}),/disponible/);
  await assert.rejects(save({...body,date:'2099-01-01'}),/futuros/);
  await assert.rejects(save({...body,quantity:-1}));
  a=await save(body);
  assert.equal(a.lines.find(i=>i.id===1).final,9.5);assert.equal(a.lines.find(i=>i.id===1).adjustment,-2.5);
  assert.deepEqual(a.history[0].recorded_by,'Supervisora');assert.equal(JSON.parse(a.history[0].notes).before,12);
  assert.equal(a.history.filter(m=>m.movement_type==='entry')[0].quantity,'5');
  await assert.rejects(save(body),e=>e.status===409);
  a=await save({date:'2026-09-01',revision:a.revision,lines:[{itemId:1,entry:2}]});
  await assert.rejects(save({...body,revision:a.revision}),/posteriores/);
  a=await save({date:'2026-09-02',revision:a.revision,lines:[{itemId:1,exit:1}]});
  assert.deepEqual(a.days.map(d=>d.date),['2026-08-31','2026-09-01','2026-09-02']);
  assert.deepEqual(a.days.map(d=>d.lines.find(i=>i.id===1).final),[9.5,11.5,10.5]);
  a=await save({...body,date:a.date,revision:a.revision,quantity:13});
  assert.equal(a.lines.find(i=>i.id===1).adjustment,2.5);
  await assert.rejects(save({date:'2026-09-01',revision:a.revision,lines:[{itemId:1,entry:1}]}),/rectificado/);
  a=await save({...body,date:a.date,revision:a.revision,quantity:0});
  assert.equal(a.lines.find(i=>i.id===1).final,0);
  a=await save({date:a.date,revision:a.revision,lines:[{itemId:1,entry:2,exit:1}]});
  assert.equal(a.lines.find(i=>i.id===1).final,1);
  const before=await rastro.read(q,'2026-08-30');assert.equal(before.lines[0].final,null);
  assert.equal((await q('SELECT count(*) FROM inventory_movements WHERE item_id=3'))[0].count,0);
 }finally{await db.close();}
});
test('Legacy mixed units convert once to pollos without changing the stored source',()=>{
 const d=prod.blank();delete d.chickenUnit;
 const r=d.lines.find(l=>l.id==='rosti'),c=d.lines.find(l=>l.id==='freidoras-4');
 c.unit='piezas';Object.assign(r,{previousRaw:20,closingCooked:3.75,done1:20,done2:20});Object.assign(c,{previousRaw:20,done1:48,done2:0});
 const p=prod.chickens(d);assert.equal(p.lines.find(l=>l.id==='rosti').closingCooked,3.75);assert.equal(p.lines.find(l=>l.id==='rosti').previousRaw,20);assert.equal(p.lines.find(l=>l.id==='freidoras-4').done1,6);
 assert.deepEqual(prod.chickens(p),p);assert.equal(prod.calculate(p).chickenTotal,46);assert.equal(c.done1,48);
});
test('Digital cash totals use total coins and combined card payments without photo metadata',()=>{
 const d=cash.blank();d.digital={coinsTotal:91300,cardTotal:76700,preparedTime:'',deliveredBy:'',reviewedBy:''};
 Object.assign(d.counts,{b1000:0,b500:37,b200:6,b100:11,b50:29,b20:2});d.cash.retained=500000;d.cash.expenses=0;d.cash.firstTurn=130700;d.payments.transfer.confirmed=10700;
 const t=cash.calculate(d);assert.equal(t.counted,2320300);assert.equal(t.toDeliver,1820300);assert.equal(t.cardTotal,76700);
});
test('Rastro API enforces session, role and request origin before opening a database connection',async()=>{
 const auth=require('../lib/inventory-auth'),original=auth.authenticate;let calls=0;
 const handler=require('../api/rastro').createHandler(async()=>{calls++;throw Error('Unexpected DB');});
 const call=async(headers={},body={},method='POST',query={})=>{let status;await handler({method,headers,body,query},{setHeader(){},status(s){status=s;return this;},json(){}});return status;};
 try{auth.authenticate=()=>{throw Object.assign(Error('login'),{status:401});};assert.equal(await call(),401);auth.authenticate=()=>({role:'kitchen'});assert.equal(await call(),403);auth.authenticate=()=>({role:'dispatch'});assert.equal(await call({}, {action:'rectify'}),403);assert.equal(await call({}, {},'GET',{view:'admin'}),403);auth.authenticate=()=>({role:'manager'});assert.equal(await call({origin:'https://evil.test',host:'app.test'}),403);assert.equal(calls,0);}finally{auth.authenticate=original;}
});
