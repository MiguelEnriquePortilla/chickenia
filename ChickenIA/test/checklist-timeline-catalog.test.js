'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
test('full production schema and all current catalog migrations initialize the journal without losing tasks',async()=>{
 const db=new PGlite(),sql=async(parts,...values)=>(await db.query(parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,''),values)).rows;
 const neonPath=require.resolve('@neondatabase/serverless');require(neonPath);
 const original=require.cache[neonPath].exports,previousUrl=process.env.DATABASE_URL;
 require.cache[neonPath].exports={...original,neon:()=>sql};process.env.DATABASE_URL='postgres://isolated-test';
 try{
  const {ensureTables}=require('../lib/supervision/db');
  await ensureTables();await ensureTables();
  const core=require('../lib/supervision/checklist-timeline'),store=require('../lib/supervision/checklist-timeline-store');
  const [loc]=await sql`SELECT id FROM locations WHERE code='jojutla'`;
  await store.ensureDay(sql,loc.id,core.day());
  const [snapshot]=await sql`SELECT catalog FROM checklist_timeline_days WHERE location_id=${loc.id}`;
  assert.ok(snapshot.catalog.length>100);
  const unknown=snapshot.catalog.filter(r=>r.schedule.first===null);
  assert.ok(unknown.every(r=>/7:(15|30)pm/.test(r.name)),JSON.stringify(unknown));
  assert.ok(snapshot.catalog.some(r=>r.schedule.repeat));
  const view=await store.get(sql,loc.id,core.day());assert.equal(view.areas.length,9);
  assert.equal((await sql`SELECT count(*)::int n FROM pg_trigger WHERE tgname='checklist_check_journal'`)[0].n,1);
 }finally{require.cache[neonPath].exports=original;if(previousUrl===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previousUrl;await db.close();}
});
