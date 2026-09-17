'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { authorized, currentCut, CUTS, report, message, sendTelegram } = require('../lib/supervision/telegram');
test('authentication fails closed', () => {
  assert.equal(authorized(undefined, undefined), false);
  assert.equal(authorized('Bearer short', 'short'), false);
  const secret = 'a'.repeat(32);
  assert.equal(authorized(`Bearer ${secret}`, secret), true);
  assert.equal(authorized(`Bearer ${'b'.repeat(32)}`, secret), false);
});
test('five Mexico City checkpoints tolerate Hobby delay without early sends or backfill', () => {
  for (const [i,iso] of ['2026-09-16T15:30:00Z','2026-09-16T18:00:00Z','2026-09-16T20:00:00Z','2026-09-16T23:00:00Z','2026-09-17T01:00:00Z'].entries()) {
    const result=currentCut(new Date(iso));
    assert.equal(result.date,'2026-09-16');
    assert.equal(result.cut.id,CUTS[i].id);
    assert.equal(currentCut(new Date(Date.parse(iso)-1000)).cut,undefined);
    assert.equal(currentCut(new Date(Date.parse(iso)+59*60000),CUTS[i].id).cut.id,CUTS[i].id);
    assert.equal(currentCut(new Date(Date.parse(iso)+65*60000),CUTS[i].id).cut,undefined);
    assert.equal(currentCut(new Date(iso),CUTS[(i+1)%CUTS.length].id).cut,undefined);
  }
});
test('block score excludes closing tasks and exposes unclassified activities', () => {
  const snapshot=report([
    {area_name:'Cocina',routine_block:'apertura',weight:6,done:true},
    {area_name:'Cocina',routine_block:'cierre',weight:6,done:false,criticality:'critica'},
    {area_name:'Caja',routine_block:null,weight:3,done:false},
  ],CUTS[0],'2026-09-16','Jojutla','2026-09-16T15:30:00Z');
  assert.equal(snapshot.areas[0].block,100);
  assert.equal(snapshot.areas[0].day,50);
  assert.equal(snapshot.areas[0].critical_pending,0);
  assert.equal(snapshot.areas[1].block,null);
  assert.equal(snapshot.areas[1].unclassified,1);
  assert.match(message(snapshot),/Avance del día: 40% verificado/);
  assert.match(message(snapshot),/pendientes sin horario definido/);
  assert.equal((message(snapshot).match(/%/g)||[]).length,3);
  assert.doesNotMatch(message(snapshot),/Bloque:|Día:|▰|▱/);
});
test('transport sends plain text only to configured group and sanitizes failures', async () => {
  const env={TELEGRAM_BOT_TOKEN:'secret-token',TELEGRAM_CHAT_ID:'-5489495348'};
  const id=await sendTelegram('Prueba',env,async(url,opts)=>{
    assert.equal(url,'https://api.telegram.org/botsecret-token/sendMessage');
    const body=JSON.parse(opts.body);
    assert.equal(body.chat_id,env.TELEGRAM_CHAT_ID);
    assert.equal(body.text,'Prueba');
    assert.equal(body.parse_mode,undefined);
    return {ok:true,json:async()=>({ok:true,result:{message_id:42}})};
  });
  assert.equal(id,42);
  await assert.rejects(sendTelegram('Prueba',env,async()=>{throw Error('secret-token');}),error=>!error.message.includes('secret-token'));
  await assert.rejects(sendTelegram('Prueba',{},()=>{throw Error('must not call');}),/sin configurar/);
});
test('endpoint persists a single immutable snapshot under concurrent dispatch and protects preview', async () => {
  const {PGlite}=require('@electric-sql/pglite');
  const db=new PGlite();
  const sql=async(parts,...values)=>(await db.query(parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,''),values)).rows;
  await db.exec(`CREATE TABLE locations(id int primary key,name text,type text);
    INSERT INTO locations VALUES(1,'Jojutla','tienda');
    CREATE TABLE areas(id int primary key,code text,name text,location_type text,active boolean,order_index int);
    INSERT INTO areas VALUES(1,'cocina','Cocina','tienda',true,1);
    CREATE TABLE activities(id int primary key,name text,area_id int,weight int,criticality text,routine_block text,active boolean,frequency text,valid_from date,valid_until date,order_index int);
    INSERT INTO activities VALUES(1,'Preparar cocina',1,6,'alta','apertura',true,'daily',null,null,1);
    CREATE TABLE activity_checks(activity_id int,location_id int,check_date date,done boolean);
    INSERT INTO activity_checks VALUES(1,1,'2026-09-16',true);
    CREATE TABLE kitchen_plans(activity_id int,plan_date date);`);
  const dbModule=require('../lib/supervision/db'),telegram=require('../lib/supervision/telegram');
  const originalEnsure=dbModule.ensureTables,originalCut=telegram.currentCut,originalFetch=global.fetch;
  const keys=['SUPERVISION_NOTIFY_SECRET','SUPERVISION_LOCATION_ID','SUPERVISION_NOTIFY_ENABLED','TELEGRAM_CHAT_ID','TELEGRAM_BOT_TOKEN','CRON_SECRET','SUPERVISION_NOTIFY_START_AT'];
  const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  Object.assign(process.env,{SUPERVISION_NOTIFY_SECRET:'s'.repeat(32),SUPERVISION_LOCATION_ID:'1',SUPERVISION_NOTIFY_ENABLED:'true',TELEGRAM_CHAT_ID:'-5489495348',TELEGRAM_BOT_TOKEN:'test'});
  let sends=0;
  global.fetch=async()=>{sends++;return {ok:true,json:async()=>({ok:true,result:{message_id:99}})};};
  dbModule.ensureTables=async()=>sql;
  telegram.currentCut=()=>({date:'2026-09-16',cut:CUTS[0]});
  const handler=require('../api/summary');
  const call=async(action,method='POST',auth=true)=>{
    let status,body;
    await handler({method,query:{action,telegram:'1'},headers:{authorization:auth?`Bearer ${process.env.SUPERVISION_NOTIFY_SECRET}`:undefined}}, {setHeader(){},status(n){status=n;return this;},json(v){body=v;}});
    return {status,body};
  };
  try {
    process.env.SUPERVISION_NOTIFY_START_AT='2099-01-01T18:00:00Z';
    assert.match((await call('dispatch')).body.skipped,/primer reporte/);
    assert.equal(sends,0);
    process.env.SUPERVISION_NOTIFY_START_AT='invalid';
    assert.equal((await call('dispatch')).status,503);
    delete process.env.SUPERVISION_NOTIFY_START_AT;
    assert.equal((await call('preview','GET',false)).status,401);
    assert.equal((await call('dispatch','GET')).status,405);
    assert.equal((await call('cron','GET')).status,401);
    process.env.CRON_SECRET=process.env.SUPERVISION_NOTIFY_SECRET;
    process.env.SUPERVISION_NOTIFY_ENABLED='false';
    assert.equal((await call('cron','GET')).status,503);
    process.env.SUPERVISION_NOTIFY_ENABLED='true';
    assert.equal((await call('cron','POST')).status,405);
    assert.equal((await call('preview','GET')).body.snapshot.overall_score,100);
    assert.equal(sends,0);
    // Initialize schema before concurrency so this tests delivery races, not PostgreSQL DDL races.
    assert.equal((await call('dispatch')).status,200);
    await db.exec('DELETE FROM supervision_telegram_deliveries'); sends=0;
    const results=await Promise.all([call('dispatch'),call('cron','GET')]);
    assert.equal(results.filter(r=>r.body.ok).length,1);
    assert.equal(results.filter(r=>r.body.skipped).length,1);
    assert.equal(sends,1);
    await db.exec('UPDATE activity_checks SET done=false');
    const records=await sql`SELECT snapshot,status FROM supervision_telegram_deliveries`;
    assert.equal(records[0].snapshot.overall_score,100);
    assert.equal(records[0].status,'sent');
    await db.exec('DELETE FROM supervision_telegram_deliveries');
    global.fetch=async()=>{sends++;throw Error('timeout');};
    assert.equal((await call('dispatch')).status,502);
    const afterFailure=sends;
    assert.ok((await call('dispatch')).body.skipped);
    assert.equal(sends,afterFailure);
    assert.equal((await sql`SELECT status FROM supervision_telegram_deliveries`)[0].status,'unknown');
  } finally {
    dbModule.ensureTables=originalEnsure;telegram.currentCut=originalCut;global.fetch=originalFetch;
    for(const k of keys)if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];
    await db.close();
  }
});
