process.env.CHICKENIA_PILOT_ACCESS='0'; // Regression coverage for individual-account mode.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const {freshState,applyOperation}=require('../lib/inventory-domain');
const {repository}=require('../lib/inventory-store');

test('weekly local purchases need approval and receipt; units and cash reference survive',()=>{
  let state=freshState();const nancy={id:'nancy',name:'Nancy',role:'manager'},lilian={id:'lilian',name:'Lilian',role:'dispatch'};
  const run=(type,args,actor=nancy)=>{const r=applyOperation(state,{id:randomUUID(),type,...args},actor,'2026-09-11T16:00:00Z');state=r.state;return r.event;};
  assert.equal(state.items.find(i=>i.id==='cloro').unit,'garrafas');
  assert.equal(state.items.find(i=>i.id==='cocina-crema-espagueti').unit,'kg');
  assert.equal(state.items.find(i=>i.id==='cocina-crema-espagueti').kind,'supply');
  run('initial',{location:'sucursal',lines:[{item:'leche-litros',qty:0},{item:'cocina-crema-espagueti',qty:0}]});
  const args={supplier:'3B',supplierType:'local',due:'2026-09-12',location:'sucursal',urgent:true,lines:[{item:'leche-litros',qty:4}]};
  assert.throws(()=>run('purchaseRequest',args),/Explica/);
  const request=run('purchaseRequest',{...args,urgent:false});
  assert.throws(()=>run('approvePurchase',{request:request.id}),/autorización/);
  const approved=run('approvePurchase',{request:request.id},lilian);
  assert.throws(()=>run('approvePurchase',{request:request.id},lilian),/ya autorizada/);
  const receipt={location:'sucursal',purchase:approved.id,lines:args.lines,note:'Compra semanal',receipt:'Ticket 3B-1',amount:120.50,paymentSource:'caja'};
  assert.throws(()=>run('supplier',{...receipt,location:'cedis'}),/ubicación/);
  assert.throws(()=>run('supplier',{...receipt,receipt:''}),/Comprobante/);
  const received=run('supplier',receipt);
  assert.equal(state.balances['sucursal:leche-litros'],4000);
  assert.equal(received.detail.amount,120.50);assert.equal(received.detail.paymentSource,'caja');
  run('transform',{location:'sucursal',inputs:[{item:'leche-litros',qty:2}],outputs:[{item:'cocina-crema-espagueti',qty:1.8}],note:'Pesaje real'});
  assert.equal(state.balances['sucursal:leche-litros'],2000);
  assert.equal(state.balances['sucursal:cocina-crema-espagueti'],1800);
});

test('catalogue upgrade adds weighed preparations once without converting old balances',async()=>{
  const db=new PGlite();const q=async(s,p)=>(await db.query(s,p)).rows;const repo=repository(q);
  try{
    await repo.migrate();const current=await repo.snapshot();
    current.data.items=current.data.items.filter(i=>!require('../lib/kitchen-items').some(n=>n.id===i.id));
    current.data.balances['sucursal:cloro']=2000;
    await q('UPDATE inv_state SET data=$1::jsonb',[JSON.stringify(current.data)]);
    await repo.migrate();const upgraded=await repo.snapshot();await repo.migrate();const again=await repo.snapshot();
    assert.equal(again.version,upgraded.version);assert.equal(again.data.balances['sucursal:cloro'],2000);
    assert.equal(again.data.items.find(i=>i.id==='cloro').unit,'garrafas');
    assert.equal(again.data.items.filter(i=>i.id==='cocina-arroz-blanco').length,1);
  }finally{await db.close();}
});

test('kitchen scheduling validates permission, kg and protects captured dates',async()=>{
  const db=new PGlite();const sql=async(parts,...values)=>(await db.query(parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,''),values)).rows;
  const auth=require('../lib/inventory-auth'),original=auth.authenticate;
  auth.authenticate=()=>({id:'nancy',name:'Nancy',role:'manager'});
  try{
    await db.exec(`CREATE TABLE areas(id int,code text);INSERT INTO areas VALUES(1,'cocina');
      CREATE TABLE activities(id int primary key,area_id int,name text,frequency text,unit text,active boolean,requires_quantity boolean,valid_from date,valid_until date,order_index int);
      INSERT INTO activities VALUES(1,1,'Adobo semanal','weekly','kg',true,true,null,null,1);
      CREATE TABLE kitchen_plans(activity_id int,plan_date date,kg numeric,scheduled_by text,updated_at timestamptz default now(),PRIMARY KEY(activity_id,plan_date));
      CREATE TABLE activity_checks(activity_id int,check_date date);`);
    const handler=require('../api/kitchen-plan').createHandler(async()=>sql);
    const call=async(method,body={})=>{let status,data;await handler({method,body,query:{date:'2099-01-01'},headers:{'content-type':'application/json'}},{setHeader(){},status(n){status=n;return this;},json(v){data=v;}});return {status,data};};
    assert.equal((await call('POST',{date:'2099-01-01',activity_id:1,kg:2.125})).status,200);
    assert.equal(Number((await call('GET')).data.activities[0].kg),2.125);
    assert.equal((await call('POST',{date:'2099-01-01',activity_id:1,kg:-1})).status,400);
    await db.exec("INSERT INTO activity_checks VALUES(1,'2099-01-01')");
    assert.equal((await call('POST',{date:'2099-01-01',activity_id:1,kg:0})).status,409);
    auth.authenticate=()=>({id:'eliseo',name:'Eliseo',role:'processor'});
    assert.equal((await call('POST',{date:'2099-01-02',activity_id:1,kg:1})).status,403);
  }finally{auth.authenticate=original;await db.close();}
});
