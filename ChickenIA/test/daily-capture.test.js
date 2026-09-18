'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const cash=require('../lib/cash-close'),prod=require('../lib/production-daily');
const actor={environment:'local-test',business:'chicanito',canWrite:true,id:'test'};
function completeCash(){const d=cash.blank();d.cashier='Prueba';d.receiver='Recibe prueba';d.deliveryTime='19:00';d.receipt='TEST-1';for(const k in d.cash)d.cash[k]=0;for(const k in d.counts)d.counts[k]=0;for(const k in d.payments)d.payments[k]={expected:0,confirmed:0};d.salesTotal=0;for(const k in d.evidence)d.evidence[k]='na';return d;}
test('unknown is not zero and first turn is deducted exactly once',()=>{
  assert.equal(cash.calculate(cash.blank()).expected,null);
  const d=completeCash();Object.assign(d.cash,{opening:300000,cashSales:1000000,otherIn:10000,refunds:20000,expenses:50000,firstTurn:400000,withdrawals:40000,retained:300000,delivered:500000});d.counts.b1000=8;
  const t=cash.calculate(d);assert.equal(t.expected,800000);assert.equal(t.counted,800000);assert.equal(t.cashDifference,0);assert.equal(t.deliveryPending,0);
  d.cash.delivered=400000;assert.equal(cash.calculate(d).canFinalize,false);d.explanation='Pendiente segunda entrega';assert.equal(cash.calculate(d).canFinalize,true);
  d.counts.m050=3;assert.equal(cash.calculate(d).counted,800150);
  assert.throws(()=>cash.calculate({...d,cash:{...d.cash,opening:1.5}}));
});
test('terminal net and details reconcile without double subtraction',()=>{
  const d=completeCash();d.terminals=[{reference:'X',method:'credit',count:1,charged:10000,refunded:2000}];d.payments.credit={expected:8000,confirmed:8000};d.salesTotal=8000;
  assert.deepEqual(cash.calculate(d).warnings,[]);
  d.payments.credit.confirmed=10000;assert.ok(cash.calculate(d).warnings.some(w=>w.includes('Terminal')));
});
test('production keeps plans distinct from made and validates units',()=>{
  const d=prod.blank();d.lines[0].unit='kg';d.lines[0].plan1=10;assert.equal(d.lines[0].done1,null);
  assert.ok(prod.calculate(d).missing.length>0);
  d.lines[0].done1=8;assert.equal(prod.calculate(d).pendingBatches,1);
  const cruji=d.lines.find(r=>r.id==='freidoras-4');cruji.done1=1.5;assert.throws(()=>prod.calculate(d),/enteras/);
  cruji.done1=8;cruji.unit='kg';assert.throws(()=>prod.calculate(d),/unidad/);
  cruji.unit='piezas';d.lines[1].id=d.lines[0].id;assert.throws(()=>prod.calculate(d),/Catálogo/);
});
test('both stores persist drafts, reject stale writes and preserve audit history',async()=>{
  const {PGlite}=require('@electric-sql/pglite'),db=new PGlite(),query=async(s,p)=>(await db.query(s,p)).rows;
  try{
    for(const [factory,table]of [[cash.cashService,'cash_close_pilot'],[prod.service,'production_daily_pilot']]){
      const api=factory(query,actor),first=await api.get('2026-09-17');assert.equal(first.revision,0);
      const saved=await api.save({...first,finalize:false});assert.equal(saved.revision,1);
      await assert.rejects(api.save({...first,finalize:false}),e=>e.status===409);
      const fresh=await api.get(first.date);assert.deepEqual(fresh.data,saved.data);
      await api.save({...fresh,finalize:false});assert.equal((await query(`SELECT count(*)::int n FROM ${table}_history`))[0].n,2);
      await assert.rejects(api.save({...fresh,revision:2,finalize:true}),/Faltan/);
      await assert.rejects(factory(query,{...actor,canWrite:false}).save({...fresh}),e=>e.status===403);
      assert.throws(()=>factory(query,{...actor,environment:'server'}),/local/);
    }
    const api=cash.cashService(query,actor);await api.save({date:'2026-09-18',revision:0,data:completeCash(),finalize:true});
    await assert.rejects(api.save({date:'2026-09-18',revision:1,data:completeCash()}),e=>e.status===409);
    const production=prod.service(query,actor),d=await production.get('2026-09-19');d.data.lines[0].unit='kg';d.data.lines[0].plan1=10;
    const saved=await production.save(d);saved.data.lines[0].unit='litros';await assert.rejects(production.save(saved),/unidad/);
  }finally{await db.close();}
});
