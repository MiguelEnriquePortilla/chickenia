'use strict';
process.env.CHICKENIA_PILOT_ACCESS='1';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const {randomUUID}=require('node:crypto');
const auth=require('../lib/inventory-auth');
const {repository}=require('../lib/inventory-store');
const {roles,applyOperation,freshState}=require('../lib/inventory-domain');
test('shared pilot login, signed identity, all modules and rollback with actual database',async()=>{
  process.env.INVENTORY_SESSION_SECRET='pilot-tests-only-secret-'.repeat(3);
  process.env.INVENTORY_USERS_JSON=JSON.stringify([{id:'nancy',name:'Nancy',role:'manager',hash:auth.passwordHash('old-individual-password')}]);
  const db=new PGlite(),query=async(s,p)=>(await db.query(s,p)).rows,repo=repository(query);
  const inventory=require('../api/inventory').createHandler(()=>repo,query);
  const chicken=require('../api/chicken-ia').createHandler(query);
  const call=async(handler,method,action,body={},cookie='')=>{
    const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.code=s;return this;},json(data){this.data=data;return this;}};
    await handler({method,query:{action},body,headers:{'content-type':'application/json',cookie}},res);return res;
  };
  try{
    assert.equal((await call(inventory,'GET','session')).code,401);
    assert.equal((await call(inventory,'POST','login',{username:'Prueba Cocina',password:'wrong-password'})).code,401);
    const login=await call(inventory,'POST','login',{username:'Prueba Cocina',password:'CHICKENIA2026'});
    assert.equal(login.code,200);assert.equal(login.data.user.name,'Prueba Cocina');assert.equal(login.data.user.pilot,true);
    const cookie=login.headers['Set-Cookie'].find(c=>c.includes('Path=/api;')).split(';')[0];
    const snap=await call(inventory,'GET','snapshot',{},cookie);
    assert.deepEqual(snap.data.permissions.sort(),Object.keys(roles).sort());
    assert.equal((await call(inventory,'GET','session',{},cookie)).code,200);
    assert.equal((await call(chicken,'GET','session',{},cookie)).code,200);
    const actor=auth.authenticate({headers:{cookie}});
    let state=freshState();
    const request=applyOperation(state,{id:randomUUID(),type:'purchaseRequest',supplier:'Proveedor de prueba',supplierType:'local',due:'2026-09-11',location:'sucursal',urgent:false,lines:[{item:'leche-litros',qty:1}]},actor,'2026-09-11T18:00:00Z');
    const approved=applyOperation(request.state,{id:randomUUID(),type:'approvePurchase',request:request.event.id},actor,'2026-09-11T18:01:00Z');
    assert.equal(approved.event.actor.name,'Prueba Cocina');
    const nancy=await call(inventory,'POST','login',{username:'Nancy',password:'CHICKENIA2026'});
    assert.equal(nancy.data.user.id,'nancy');
    const tampered=cookie.slice(0,-1)+(cookie.at(-1)==='a'?'b':'a');
    assert.equal((await call(inventory,'GET','session',{},tampered)).code,401);
    assert.equal((await call(inventory,'POST','login',{username:'<script>',password:'CHICKENIA2026'})).code,401);
    process.env.CHICKENIA_PILOT_ACCESS='0';
    assert.equal((await call(inventory,'GET','session',{},cookie)).code,401);
    assert.equal((await call(inventory,'POST','login',{username:'Nancy',password:'CHICKENIA2026'})).code,401);
    assert.equal((await call(inventory,'POST','login',{username:'nancy',password:'old-individual-password'})).code,200);
  }finally{process.env.CHICKENIA_PILOT_ACCESS='1';await db.close();}
});
