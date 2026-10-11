'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const paper=require('../lib/production-paper'),auth=require('../lib/inventory-auth');
test('name selection creates signed session without password; invalid name and forged cookie rejected',async()=>{
 const old=process.env.INVENTORY_SESSION_SECRET;process.env.INVENTORY_SESSION_SECRET='local-test-secret-at-least-thirty-two-characters';
 try{
  assert.deepEqual(auth.people([{id:'other',name:'Otro'}]).map(p=>p.name),['NANCY','LILIAN','MIGUEL']);
  const result=await auth.login({body:{username:'Nancy'}},()=>{throw Error('No password query expected');});
  assert.equal(result.user.name,'NANCY');
  assert.equal(auth.authenticate({headers:{cookie:'chickenia_inventory='+result.token}}).name,'NANCY');
  await assert.rejects(()=>auth.login({body:{username:'not-a-team-member'}}),/Selecciona/);
  const payload=Buffer.from(JSON.stringify({sub:'otro',name:'Otro',pilot:true,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
  const signature=require('node:crypto').createHmac('sha256',process.env.INVENTORY_SESSION_SECRET).update(payload).digest('base64url');
  assert.throws(()=>auth.authenticate({headers:{cookie:'chickenia_inventory='+payload+'.'+signature}}),e=>e.status===401);
  assert.throws(()=>auth.authenticate({headers:{cookie:'chickenia_inventory='+result.token+'x'}}));
 }finally{if(old===undefined)delete process.env.INVENTORY_SESSION_SECRET;else process.env.INVENTORY_SESSION_SECRET=old;}
});
test('paper products and units, rosticero limit and invalid amounts',()=>{
 assert.equal(paper.catalog.length,27);assert.equal(paper.catalog.filter(p=>p.area==='Rosticero').length,1);
 assert.equal(paper.catalog.find(p=>p.name==='Costilla cocinada').area,'Hornos');
 assert.ok(paper.catalog.some(p=>p.name==='Adobo Chipotle'));assert.ok(!paper.catalog.some(p=>p.name==='Ensalada de col'));
 let rows=paper.blank();rows[0].initial=30;rows[0].additional=1;assert.throws(()=>paper.validate(rows),/30 pollos/);
 rows[0].additional=0;assert.doesNotThrow(()=>paper.validate(rows));rows[1].previous=-1;assert.throws(()=>paper.validate(rows));
});
test('real isolated database persists quantities and actor, rejects conflicts and preserves old production',async()=>{
 const {PGlite}=require('@electric-sql/pglite'),db=new PGlite();const query=async(s,p)=>(await db.query(s,p)).rows;
 try{
  await db.exec('CREATE TABLE production_daily_live(id integer);INSERT INTO production_daily_live VALUES(123)');
  const service=paper.service(query),date='2026-10-11';let value=await service.get(date);assert.equal(value.revision,0);
  value.lines[0].initial=30;value=await service.save(value,'Nancy');assert.equal(value.revision,1);
  value.lines[3].previous=2.5;value.lines[3].initial=4;value.lines[3].closing=1;value=await service.save(value,'Lilian');assert.equal(value.revision,2);
  await assert.rejects(()=>service.save({...value,revision:1},'Miguel'),e=>e.status===409);
  assert.equal((await service.get(date)).lines[3].previous,2.5);
  assert.deepEqual((await query('SELECT actor FROM production_paper_history ORDER BY revision')).map(r=>r.actor),['Nancy','Lilian']);
  assert.equal((await query('SELECT * FROM production_daily_live'))[0].id,123);
 }finally{await db.close();}
});
