'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const {repository}=require('../lib/inventory-store');
const {service}=require('../lib/food-service');
const {freshState,applyOperation,today}=require('../lib/inventory-domain');
const actor={id:'lilian',name:'Lilian',role:'manager',business:'chicanito',canWrite:true};
const purchase=(extra={})=>({date:today(new Date()),supplier:'Proveedor de prueba',market:'Central de Abastos',destination:'cedis',received:true,lines:[{item:'morron',stockQty:3,purchaseQty:3,purchaseUnit:'piezas',unitPriceCents:1800}],note:'Compra verificada de prueba',...extra});
function domain(){let state=freshState();const run=(type,data={})=>{const out=applyOperation(state,{id:randomUUID(),type,...data},actor);state=out.state;return out.event;};return {run,get state(){return state;}};}
test('compra verificada conserva costos y recibo, no duplica desde recepción antigua',()=>{
  const f=domain();f.run('initial',{location:'cedis',lines:[{item:'morron',qty:0}]});
  const e=f.run('foodPurchase',purchase());
  assert.equal(f.state.balances['cedis:morron'],3000);
  assert.equal(e.detail.document.totalCents,5400);assert.equal(e.detail.document.status,'received');
  assert.throws(()=>f.run('supplier',{location:'cedis',purchase:e.id,lines:[{item:'morron',qty:1}],note:'Repetido'}),/FoodIA/);
  assert.throws(()=>f.run('foodReceive',{purchase:e.id,lines:[{item:'morron',qty:1}]}),/excede/);
  f.run('foodVoid',{purchase:e.id,note:'Prueba cancelada'});assert.equal(f.state.balances['cedis:morron'],0);
  assert.throws(()=>f.run('foodVoid',{purchase:e.id,note:'Otra vez'}),/anulada/);
});
test('sin llegada no afecta saldo; recepción parcial y costos pendientes explícitos',()=>{
  const f=domain();const e=f.run('foodPurchase',purchase({received:false,lines:[{item:'morron',stockQty:3,purchaseQty:3,purchaseUnit:'piezas'}]}));
  assert.equal(e.detail.document.totalCents,null);assert.equal(e.detail.document.costStatus,'pending');
  assert.equal(f.state.balances['cedis:morron'],undefined);
  assert.throws(()=>f.run('foodReceive',{purchase:e.id,lines:[{item:'morron',qty:1}]}),/saldo inicial/);
  f.run('initial',{location:'cedis',lines:[{item:'morron',qty:2}]});
  f.run('foodReceive',{purchase:e.id,lines:[{item:'morron',qty:1}]});assert.equal(f.state.foodPurchases[0].status,'partial');
  f.run('foodCost',{purchase:e.id,lines:[{item:'morron',unitPriceCents:2000}],note:'Ticket'});
  assert.equal(f.state.foodPurchases[0].totalCents,6000);
  f.run('foodReceive',{purchase:e.id,lines:[{item:'morron',qty:2}]});assert.equal(f.state.balances['cedis:morron'],5000);
});
test('guía orientadora no bloquea máximos ni artículos nuevos; conserva unidades originales',()=>{
  const f=domain();const item=f.run('catalog',{name:'Papa por kg de prueba',unit:'kg',step:1,area:'Almacén · Vegetales',kind:'supply'}).detail;
  const list=f.run('foodList',{date:today(new Date()),market:'Central',lines:[{item:'morron',qty:40,observedQty:2,min:3,max:8}]}).detail.list;
  f.run('initial',{location:'cedis',lines:[{item:item.id,qty:0}]});
  const e=f.run('foodPurchase',purchase({list:list.id,lines:[{item:item.id,stockQty:45,purchaseQty:45,purchaseUnit:'kg',unitPriceCents:1800}]}));
  assert.equal(e.detail.document.totalCents,81000);assert.equal(f.state.balances['cedis:'+item.id],45000);
  assert.equal(f.state.items.find(i=>i.id==='morron').unit,'piezas');
});
test('rechaza equivalencias omitidas, precios inconsistentes y anulación con saldo insuficiente',()=>{
  const f=domain();f.run('initial',{location:'cedis',lines:[{item:'morron',qty:0}]});
  assert.throws(()=>f.run('foodPurchase',purchase({lines:[{item:'morron',stockQty:3,purchaseQty:1,purchaseUnit:'caja'}]})),/equivalencia/);
  assert.throws(()=>f.run('foodPurchase',purchase({lines:[{item:'morron',stockQty:3,purchaseQty:2,purchaseUnit:'piezas'}]})),/coincidir/);
  assert.throws(()=>f.run('foodPurchase',purchase({lines:[{item:'morron',stockQty:3,purchaseQty:3,purchaseUnit:'piezas',unitPriceCents:1800,totalCents:5000}]})),/importe/);
  const e=f.run('foodPurchase',purchase());f.run('consume',{location:'cedis',lines:[{item:'morron',qty:1}],note:'Consumido'});
  assert.throws(()=>f.run('foodVoid',{purchase:e.id,note:'Anular'}),/insuficiente/);assert.equal(f.state.foodPurchases[0].status,'received');
});
test('PostgreSQL: compra, saldo, historial y detalle relacional atómicos; reintento y permisos',async()=>{
  const db=new PGlite();const query=async(s,p)=>(await db.query(s,p)).rows,repo=repository(query);await repo.migrate();
  const api=service(repo,query,actor),miguel=service(repo,query,{...actor,id:'miguel',name:'Miguel'});
  let d=await api.prepare('initial',{location:'cedis',lines:[{item:'morron',qty:0}],note:'Conteo físico previo'});await api.commit(d.draftId);
  d=await api.prepare('foodPurchase',purchase());const before=await repo.snapshot();
  assert.equal(before.data.balances['cedis:morron'],0);
  await assert.rejects(()=>miguel.commit(d.draftId),/no encontrado/);
  const first=await api.commit(d.draftId),again=await api.commit(d.draftId);assert.equal(again.repeated,true);assert.equal(first.version,again.version);
  assert.equal((await query('SELECT * FROM food_purchase_lines',[])).length,1);
  assert.equal((await repo.snapshot()).data.balances['cedis:morron'],3000);
  const report=await miguel.purchases(today(new Date()),today(new Date()));assert.equal(report.knownTotalCents,5400);
  const reader=service(repo,query,{...actor,canWrite:false});await assert.rejects(()=>reader.prepare('foodPurchase',purchase()),/lectura/);
  assert.throws(()=>service(repo,query,{...actor,business:'otro'}),/Negocio/);
  const a=await api.prepare('foodPurchase',purchase()),b=await api.prepare('foodPurchase',purchase());await api.commit(a.draftId);
  await assert.rejects(()=>api.commit(b.draftId),/actualizó/);
  assert.equal((await query('SELECT * FROM food_purchases',[])).length,2);
  // Force relational failure and prove that the inventory update and audit roll back too.
  await query("ALTER TABLE food_purchases ADD CONSTRAINT reject_bad_supplier CHECK(data->>'supplier'<>'Fallar')",[]);
  const bad=await api.prepare('foodPurchase',purchase({supplier:'Fallar'})),v=(await repo.snapshot()).version;
  await assert.rejects(()=>api.commit(bad.draftId));assert.equal((await repo.snapshot()).version,v);
  assert.equal((await query('SELECT * FROM inv_events WHERE id=$1::uuid',[bad.draftId])).length,0);
  await db.close();
});
