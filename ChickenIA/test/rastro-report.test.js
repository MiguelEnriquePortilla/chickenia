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
test('Legacy whole chickens convert once to pieces, raw and cooked; piece fractions are rejected',()=>{
 const d=prod.blank(),r=d.lines.find(l=>l.id==='rosti'),c=d.lines.find(l=>l.id==='freidoras-4');
 Object.assign(r,{previousRaw:20,closingCooked:3.75,done1:20,done2:20});Object.assign(c,{previousRaw:20,done1:48,done2:0});
 const p=prod.pieces(d);assert.equal(p.lines.find(l=>l.id==='rosti').closingCooked,30);assert.equal(p.lines.find(l=>l.id==='rosti').previousRaw,160);assert.equal(p.lines.find(l=>l.id==='freidoras-4').done1,48);
 assert.deepEqual(prod.pieces(p),p);assert.equal(prod.calculate(p).chickenPieces,368);
 p.lines.find(l=>l.id==='rosti').closingCooked=3.75;assert.throws(()=>prod.calculate(p),/enteras/);
});
test('Digital cash totals use total coins and combined card payments without photo metadata',()=>{
 const d=cash.blank();d.digital={coinsTotal:91300,cardTotal:76700,preparedTime:'',deliveredBy:'',reviewedBy:''};
 Object.assign(d.counts,{b1000:0,b500:37,b200:6,b100:11,b50:29,b20:2});d.cash.retained=500000;d.cash.expenses=0;d.cash.firstTurn=130700;d.payments.transfer.confirmed=10700;
 const t=cash.calculate(d);assert.equal(t.counted,2320300);assert.equal(t.toDeliver,1820300);assert.equal(t.cardTotal,76700);
});
test('Rastro API enforces session, role and request origin before opening a database connection',async()=>{
 const auth=require('../lib/inventory-auth'),original=auth.authenticate;let calls=0;
 const handler=require('../api/rastro').createHandler(async()=>{calls++;throw Error('Unexpected DB');});
 const call=async(headers={})=>{let status;await handler({method:'POST',headers,body:{}},{setHeader(){},status(s){status=s;return this;},json(){}});return status;};
 try{auth.authenticate=()=>{throw Object.assign(Error('login'),{status:401});};assert.equal(await call(),401);auth.authenticate=()=>({role:'kitchen'});assert.equal(await call(),403);auth.authenticate=()=>({role:'manager'});assert.equal(await call({origin:'https://evil.test',host:'app.test'}),403);assert.equal(calls,0);}finally{auth.authenticate=original;}
});
