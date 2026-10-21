'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{PGlite}=require('@electric-sql/pglite');
const core=require('../lib/supervision/calibre'),{store}=require('../lib/supervision/calibre-store');
const spec=core.AREAS.find(a=>a.code==='cocina'),now=new Date('2026-10-21T18:00:00Z'),user={name:'MIGUEL'};
test('simple 120% keeps checklist simple, caps bonus at 20 and preserves original extra evaluation',()=>{
 let d=core.blank();d.extra={choice:1,verifiedAt:now.toISOString(),achieved:true,result:'Anterior'};
 assert.equal(core.simpleExtras(d)[1].done,true);
 d=core.apply(spec,d,{action:'simple-extra',choice:0,done:true,note:'Privado'},user,now);
 assert.equal(core.checklistScore(spec,d).bonus,0);assert.equal(d.extra.result,'Anterior');
 for(const p of spec.points)d=core.apply(spec,d,{action:'simple-point',point:p.id,done:true,note:''},user,now);
 assert.equal(core.checklistScore(spec,d).score,120);
 d=core.apply(spec,d,{action:'simple-extra',choice:2,done:true,note:''},user,now);assert.equal(core.checklistScore(spec,d).score,120);
 const message=core.simpleReport([{spec,data:d}],'2026-10-21');assert.match(message,/120%/);assert.match(message,/Calibre Chicanito/);assert.doesNotMatch(message,/Privado|Anterior/);
 assert.throws(()=>core.apply(core.AREAS.find(a=>a.code==='supervision'),core.blank(),{action:'simple-extra',choice:0,done:true,note:''},{name:'NANCY'},now),/Miguel/);
});
test('weekly scores are checklist-only, explicit zero differs from no review, week is Monday–Sunday',()=>{
 assert.deepEqual(core.weekDates('2026-10-21'),['2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24','2026-10-25']);
 assert.equal(core.checklistScore(spec,core.blank()).score,null);
 let d=core.apply(spec,core.blank(),{action:'simple-point',point:'1.1',done:false,note:'Por revisar'},user,now);assert.equal(core.checklistScore(spec,d).score,0);
 d=core.apply(spec,d,{action:'simple-point',point:'1.1',done:true,note:'Revisado'},user,now);assert.equal(core.checklistScore(spec,d).done,1);assert.equal(core.checklistScore(spec,d).total,14);
});
test('simple checklist preserves previous closed evaluation, quantities, notes and original points',()=>{
 const d=core.blank();d.points['1.1']={status:'done',note:'Original'};d.final=true;d.finalSummary={score:120};d.samples=[{product:'Original',total:1,passed:1}];
 const edited=core.apply(spec,d,{action:'simple-point',point:'1.1',done:false,note:'Nueva nota'},user,now);
 assert.deepEqual(edited.points,d.points);assert.deepEqual(edited.finalSummary,d.finalSummary);assert.deepEqual(edited.samples,d.samples);assert.equal(edited.final,true);assert.equal(core.checklistScore(spec,edited).score,0);
 assert.throws(()=>core.apply(spec,d,{action:'simple-point',point:'99',done:true},user,now),/desconocida/);
});
test('PostgreSQL save/reload, weekly links data and history use saved points; stale and historical saves rejected',async()=>{
 const db=new PGlite();try{
  await db.exec("CREATE TABLE locations(id int PRIMARY KEY); INSERT INTO locations VALUES(1)");const q=async(s,p)=>(await db.query(s,p)).rows,s=store(q);await s.migrate();
  let view=await s.get(1,'2026-10-21',now);assert.equal(view.weekly.areas.find(a=>a.code==='cocina').days[2].score,null);
  const body={area:'cocina',revision:0,command:{action:'simple-point',point:'1.1',done:true,note:'Lista y verificada'}};
  await s.save(1,'2026-10-21',body,user,now);view=await s.get(1,'2026-10-21',now);
  const day=view.weekly.areas.find(a=>a.code==='cocina').days[2];assert.equal(day.done,1);assert.equal(day.score,100/14);
  assert.equal(view.areas.find(a=>a.spec.code==='cocina').data.checklistPoints['1.1'].note,'Lista y verificada');assert.equal(view.checklistHistory[0].area,'cocina');
  await assert.rejects(s.save(1,'2026-10-21',body,user,now),/actualizó/);await assert.rejects(s.save(1,'2026-10-20',body,user,now),/histórico/);
 }finally{await db.close();}
});
