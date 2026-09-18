'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const auth=require('../lib/inventory-auth'),handler=require('../lib/daily-handler');
const cash=require('../lib/cash-close'),prod=require('../lib/production-daily');
const actor={business:'chicanito',environment:'production',canWrite:true,id:'test-live'};
test('real data is isolated from pilot and daily summary distinguishes missing and draft',async()=>{
  const {PGlite}=require('@electric-sql/pglite'),db=new PGlite();
  const query=async(s,p)=>(await db.query(s,p)).rows;
  try{
    for(const factory of [cash.cashService,prod.service]){
      const local=factory(query,{...actor,environment:'local-test'}),live=factory(query,actor);
      const d=await local.get('2026-09-18');await local.save(d);
      assert.equal((await live.get(d.date)).revision,0);
      const record=await live.get(d.date);const saved=await live.save(record);assert.equal(saved.environment,'production');
      assert.equal((await local.get(d.date)).revision,1);
    }
    const sql=async(parts,...values)=>query(parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,''),values);
    const summary=await require('../lib/daily-summary').snapshot(sql,'2026-09-18');
    assert.match(summary.lines.join('\n'),/Borrador/);
    assert.match(summary.lines.join('\n'),/Contado: pendiente/);
    const empty=await require('../lib/daily-summary').snapshot(sql,'2026-09-19');assert.equal(empty.lines.length,2);assert.match(empty.lines[0],/sin captura/);
  }finally{await db.close();}
});
test('daily endpoint requires session, protects cash by role, checks origin and persists authorized drafts',async()=>{
  const {PGlite}=require('@electric-sql/pglite'),db=new PGlite(),query=async(s,p)=>(await db.query(s,p)).rows;
  const original=auth.authenticate;let role='manager',logged=false;
  auth.authenticate=()=>{if(!logged)throw Object.assign(Error('Login'),{status:401});return {id:'user',role};};
  const call=async(action,method='GET',body,extra={})=>{let status,data;await handler({method,query:{action,mode:'close',date:'2026-09-18'},body,headers:{host:'example.test',origin:'https://example.test','content-type':'application/json',...extra}},{setHeader(){},status(s){status=s;return this;},json(d){data=d;}},query);return {status,data};};
  try{
    assert.equal((await call('daily-get')).status,401);logged=true;role='kitchen';assert.equal((await call('daily-get')).status,403);
    const overview=await call('daily-overview');assert.equal(overview.status,200);assert.equal(overview.data.cash,null);
    role='manager';const current=await call('daily-get');assert.equal(current.status,200);
    const request={mode:'close',date:'2026-09-18',revision:0,data:current.data.data};
    assert.equal((await call('daily-save','POST',request,{origin:'https://evil.test'})).status,403);
    assert.equal((await call('daily-save','POST',request,{origin:undefined})).status,403);
    assert.equal((await call('daily-save','POST',request)).status,200);
    assert.equal((await call('daily-save','POST',request)).status,409);
    assert.equal((await call('daily-save','GET')).status,405);
  }finally{auth.authenticate=original;await db.close();}
});
