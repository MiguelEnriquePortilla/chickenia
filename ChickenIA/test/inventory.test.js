process.env.CHICKENIA_PILOT_ACCESS='0'; // Regression coverage for individual-account mode.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { freshState, applyOperation, today } = require('../lib/inventory-domain');
const { repository } = require('../lib/inventory-store');
const auth = require('../lib/inventory-auth');
const { PGlite } = require('@electric-sql/pglite');
const manager={id:'nancy',name:'Nancy',role:'manager'};
function fixture(){
  let state=freshState();
  const run=(type,data={},actor=manager)=>{
    const result=applyOperation(state,{id:randomUUID(),type,...data},actor);
    state=result.state;return result.event;
  };
  for(const location of ['cedis','sucursal'])run('initial',{location,lines:state.items.map(i=>({item:i.id,qty:0}))});
  const purchase=run('purchase',{supplier:'Proveedor de prueba',lines:[{item:'pollo-enhielado',qty:100}]});
  run('supplier',{location:'cedis',purchase:purchase.id,lines:[{item:'pollo-enhielado',qty:100}],note:'Proveedor confirmado'});
  return {run,get state(){return state;}};
}
test('recepción, preparación, tránsito, cocción y venta conservan cantidades',()=>{
  const f=fixture();
  f.run('prepare',{recipe:'rosti',qty:30});
  const r=f.run('request',{due:today(new Date()),lines:[{item:'rosti-marinado',qty:30}]});
  const s=f.run('send',{request:r.id,lines:[{item:'rosti-marinado',qty:30}]});
  f.run('receive',{request:r.id,shipment:s.id,lines:[{item:'rosti-marinado',qty:28}],note:'Dos pendientes'});
  assert.equal(f.state.balances['sucursal:rosti-marinado'],28000);
  assert.throws(()=>f.run('closeRequest',{request:r.id,note:'Cerrar'}),/tránsito/);
  f.run('transitReturn',{request:r.id,shipment:s.id,lines:[{item:'rosti-marinado',qty:2}],note:'Regresan a CEDIS'});
  f.run('closeRequest',{request:r.id,note:'Faltante cancelado'});
  f.run('cook',{recipe:'rostizar',qty:20});
  f.run('sale',{presentation:'medio',kind:'sale',qty:3});
  assert.equal(f.state.balances['sucursal:rosti-cocinado'],18500);
  assert.equal(Object.values(f.state.balances).reduce((a,b)=>a+b,0),98500);
});
test('CRUJI se convierte de pollos a ocho piezas y no admite fracciones de pieza',()=>{
  const f=fixture();f.run('prepare',{recipe:'cruji',qty:2});
  const r=f.run('request',{due:today(new Date()),lines:[{item:'cruji-marinado',qty:2}]});
  const s=f.run('send',{request:r.id,lines:[{item:'cruji-marinado',qty:2}]});
  f.run('receive',{request:r.id,shipment:s.id,lines:[{item:'cruji-marinado',qty:2}]});
  f.run('cook',{recipe:'freir',qty:2});
  f.run('sale',{presentation:'pieza',qty:3,kind:'sale'});
  assert.equal(f.state.balances['sucursal:cruji-cocinado'],13000);
  assert.throws(()=>f.run('sale',{presentation:'pieza',qty:.5,kind:'sale'}));
});
test('permisos, inicialización, blancos, duplicados y saldos negativos',()=>{
  const f=fixture();
  assert.throws(()=>f.run('sale',{presentation:'entero',qty:1,kind:'sale'}),/insuficiente/);
  assert.throws(()=>f.run('sale',{presentation:'entero',qty:1,kind:'sale'},{id:'eliseo',name:'Eliseo',role:'processor'}),/cuenta/);
  assert.throws(()=>f.run('initial',{location:'cedis',lines:[{item:'pollo-enhielado',qty:0}]}),/ya tiene/);
  assert.throws(()=>f.run('supplier',{location:'cedis',note:'Compra',lines:[{item:'harina',qty:''}]}),/vacío/);
  assert.throws(()=>f.run('supplier',{location:'cedis',note:'Compra',lines:[{item:'harina',qty:1},{item:'harina',qty:1}]}),/repetirse/);
  assert.throws(()=>applyOperation(freshState(),{id:randomUUID(),type:'prepare',recipe:'rosti',qty:1},manager),/saldo inicial/);
});
test('conteo no cambia saldo; conciliación no se permite tras cambios incluso si vuelve al mismo saldo',()=>{
  const f=fixture();
  const c=f.run('count',{location:'cedis',lines:[{item:'pollo-enhielado',qty:99}],note:'Revisar'});
  assert.equal(f.state.balances['cedis:pollo-enhielado'],100000);
  f.run('reconcile',{count:c.id,note:'Conteo físico verificado'});
  assert.equal(f.state.balances['cedis:pollo-enhielado'],99000);
  const c2=f.run('count',{location:'cedis',lines:[{item:'pollo-enhielado',qty:98}],note:'Revisar'});
  const prep=f.run('prepare',{recipe:'rosti',qty:1});
  f.run('reverse',{_target:prep,note:'Captura errónea'});
  assert.throws(()=>f.run('reconcile',{count:c2.id,note:'Revisado'}),/después/);
});
test('cortesías requieren motivo y preparación fallida no consume insumos',()=>{
  const f=fixture(),before=structuredClone(f.state);
  assert.throws(()=>f.run('sale',{presentation:'entero',qty:1,kind:'courtesy'}),/motivo/);
  assert.throws(()=>f.run('prepare',{recipe:'rosti',qty:101}),/insuficiente/);
  assert.deepEqual(f.state,before);
});
test('fecha de negocio respeta México y no admite solicitudes pasadas',()=>{
  assert.equal(today('2026-09-10T02:00:00Z'),'2026-09-09');
  const f=fixture();assert.throws(()=>f.run('request',{due:'2020-01-01',lines:[{item:'harina',qty:1}]}),/futura/);
});
test('pedido a proveedor autorizado, recepción parcial y reversión devuelven lo pendiente',()=>{
  const f=fixture();
  const p=f.run('purchase',{supplier:'Central de abastos',lines:[{item:'harina',qty:3}]},{id:'lilian',name:'Lilian',role:'dispatch'});
  assert.throws(()=>f.run('supplier',{location:'cedis',purchase:p.id,lines:[{item:'harina',qty:4}],note:'Llegó'}),/supera/);
  const receipt=f.run('supplier',{location:'cedis',purchase:p.id,lines:[{item:'harina',qty:2}],note:'Dos recibidos'});
  f.run('reverse',{_target:receipt,note:'Error de conteo'});
  assert.equal(f.state.balances['cedis:harina'],0);
  assert.equal(f.state.purchases.find(x=>x.id===p.id).received[0].qty,0);
});
test('preparaciones genéricas, unidades fraccionarias y venta de otro producto',()=>{
  const f=fixture();
  const output=f.run('catalog',{name:'Salsa preparada',unit:'litros',area:'Sucursal',kind:'finished',step:1});
  f.run('initial',{location:'sucursal',lines:[{item:output.id,qty:0}]});
  // Two counted kilos of cebolla, as an explicit physical reconciliation for this test.
  const c=f.run('count',{location:'sucursal',lines:[{item:'cebolla',qty:2}],note:'Conteo'});
  f.run('reconcile',{count:c.id,note:'Saldo verificado'});
  f.run('transform',{location:'sucursal',inputs:[{item:'cebolla',qty:.5}],outputs:[{item:output.id,qty:1.25}],note:'Rendimiento capturado'});
  f.run('sale',{presentation:'article',item:output.id,qty:.25,kind:'sale'});
  assert.equal(f.state.balances['sucursal:'+output.id],1000);
  assert.equal(f.state.balances['sucursal:cebolla'],1500);
  assert.throws(()=>f.run('transform',{location:'sucursal',inputs:[{item:'bote-basura',qty:1}],outputs:[{item:output.id,qty:1}],note:'Invalid'}),/equipo/);
});
test('PostgreSQL: migración no destructiva, idempotencia y rechazo de concurrencia',async()=>{
  const db=new PGlite();const query=async(s,p)=>(await db.query(s,p)).rows;const repo=repository(query);
  try {
    await db.exec('CREATE TABLE activity_checks(id int); INSERT INTO activity_checks VALUES(42)');
    await repo.migrate();await repo.migrate();
    assert.equal((await query('SELECT * FROM activity_checks',[]))[0].id,42);
    const command={id:randomUUID(),version:0,type:'initial',location:'sucursal',lines:[{item:'rosti-cocinado',qty:2}]};
    const results=await Promise.all([repo.execute(command,manager),repo.execute(command,manager)]);
    assert.equal(results.filter(r=>r.repeated).length,1);
    assert.equal((await repo.snapshot()).data.balances['sucursal:rosti-cocinado'],2000);
    await assert.rejects(()=>repo.execute({...command,lines:[{item:'rosti-cocinado',qty:3}]},manager),/Identificador/);
    const v=(await repo.snapshot()).version;
    const sale=()=>({id:randomUUID(),version:v,type:'sale',presentation:'entero',qty:2,kind:'sale'});
    const writes=await Promise.allSettled([repo.execute(sale(),manager),repo.execute(sale(),manager)]);
    assert.equal(writes.filter(r=>r.status==='fulfilled').length,1);
    assert.equal((await repo.snapshot()).data.balances['sucursal:rosti-cocinado'],0);
    assert.equal((await repo.history()).length,2);
    const sold=(await repo.history())[0].data;
    await repo.execute({id:randomUUID(),version:2,type:'reverse',target:sold.id,note:'Corrección'},manager);
    assert.equal((await repo.snapshot()).data.balances['sucursal:rosti-cocinado'],2000);
    await assert.rejects(()=>repo.execute({id:randomUUID(),version:3,type:'reverse',target:sold.id,note:'Otra'},manager),/corregido/);
    await assert.rejects(()=>repo.execute({id:randomUUID(),version:3,type:'reverse',_target:sold,note:'Inyección'},manager),/reservado/);
  }finally{await db.close();}
});
test('API: autenticación, CSRF, cookie, permisos y límite de intentos',async()=>{
  const db=new PGlite();const query=async(s,p)=>(await db.query(s,p)).rows;const repo=repository(query);
  process.env.INVENTORY_SESSION_SECRET='test-secret-'.repeat(5);
  const password='test-only-password-1234';
  process.env.INVENTORY_USERS_JSON=JSON.stringify([{...manager,hash:auth.passwordHash(password)},{id:'cocina',name:'Cocina',role:'kitchen',hash:auth.passwordHash(password)}]);
  const handler=require('../api/inventory').createHandler(()=>repo,query);
  async function call(method,action,body={},headers={}){
    const req={method,query:{action},body,headers:{host:'localhost','content-type':'application/json',...headers}};
    const out={headers:{}};const res={setHeader(k,v){out.headers[k]=v;},status(code){out.status=code;return this;},json(data){out.data=data;return this;}};
    await handler(req,res);return out;
  }
  try {
    assert.equal((await call('GET','snapshot')).status,401);
    assert.equal((await call('POST','login',{username:'nancy',password},{origin:'https://attacker.test'})).status,403);
    const logged=await call('POST','login',{username:'nancy',password});assert.equal(logged.status,200);
    assert.match(logged.headers['Set-Cookie'][0],/Path=\/api\/inventory; Max-Age=0/);
    assert.match(logged.headers['Set-Cookie'][1],/HttpOnly; SameSite=Strict; Path=\/api; /);
    const cookie=logged.headers['Set-Cookie'][1].split(';')[0];
    assert.equal((await call('GET','snapshot',{}, {cookie})).status,200);
    assert.equal((await call('GET','snapshot',{}, {cookie:cookie+'x'})).status,401);
    const kitchen=await call('POST','login',{username:'cocina',password});
    const forbidden=await call('POST','operation',{id:randomUUID(),version:0,type:'initial',location:'sucursal',lines:[{item:'rosti-cocinado',qty:1}]},{cookie:kitchen.headers['Set-Cookie'][1].split(';')[0]});
    assert.equal(forbidden.status,403);
    for(let i=0;i<10;i++)assert.equal((await call('POST','login',{username:'missing',password})).status,401);
    assert.equal((await call('POST','login',{username:'missing',password})).status,429);
  }finally{await db.close();}
});
