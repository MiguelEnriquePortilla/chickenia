'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{PGlite}=require('@electric-sql/pglite');
const core=require('../lib/supervision/calibre'),{store}=require('../lib/supervision/calibre-store');
const now=new Date('2026-11-09T18:00:00Z'),date='2026-11-09',user={name:'NANCY'},spec=core.AREAS.find(a=>a.code==='cocina'),responsible={id:1,name:'Ana Lima'};
const close={action:'feedback-close',observation:'Preparó a tiempo las guarniciones.',recommendation:'Mantener la preparación antes de apertura.'};
function reviewed(){return core.apply(spec,core.blank(),{action:'simple-point',point:'1.1',done:true},user,now,date);}
test('feedback closure requires both texts, max 180 and responsible; blank drafts remain allowed',()=>{
 for(const key of ['observation','recommendation']){
  assert.throws(()=>core.apply(spec,reviewed(),{...close,[key]:'   '},user,now,date,responsible),/observación|recomendación/i);
  assert.throws(()=>core.apply(spec,reviewed(),{...close,[key]:'x'.repeat(181)},user,now,date,responsible),/180/);
 }
 assert.throws(()=>core.apply(spec,reviewed(),close,user,now,date),/responsable/i);
 assert.throws(()=>core.apply(spec,core.blank(),close,user,now,date,responsible),/revisión|actividad/i);
 const draft=core.apply(spec,reviewed(),{action:'feedback-save',observation:'',recommendation:''},user,now,date,responsible);
 assert.equal(draft.feedback.closedAt,null);
});
test('closure binds authoritative employee and evaluator; editing checklist reopens without changing scores or legacy',()=>{
 const source=reviewed(),d=core.apply(spec,source,{...close,employeeId:99,actor:'FAKE'},user,now,date,responsible);
 assert.equal(d.feedback.employeeId,1);assert.equal(d.feedback.actor,'NANCY');assert.equal(d.feedback.closedAt,now.toISOString());assert.equal(d.feedback.observation,close.observation);
 assert.deepEqual(core.checklistScore(spec,d),core.checklistScore(spec,source));assert.equal(d.final,false);
 const changed=core.apply(spec,d,{action:'simple-point',point:'1.1',done:false},user,now,date,responsible);
 assert.equal(changed.feedback.closedAt,null);assert.equal(changed.feedback.observation,close.observation);
 assert.throws(()=>core.apply(spec,source,close,user,new Date('2026-11-08T18:00:00Z'),'2026-11-08',responsible),/9 de noviembre|09|vigencia/i);
 assert.doesNotMatch(core.simpleReport([{spec,data:d,responsible}],date),/Preparó a tiempo/);
});
test('saved feedback persists into person history and weekly report; stale and historical writes are rejected',async()=>{
 const db=new PGlite();try{
 await db.exec("CREATE TABLE locations(id int PRIMARY KEY); INSERT INTO locations VALUES(1); CREATE TABLE employees(id int PRIMARY KEY,name text UNIQUE,active boolean,order_index int); INSERT INTO employees VALUES(1,'Ana Lima',true,1),(8,'Maurilio Salgado',true,8)");
 const q=async(s,p)=>(await db.query(s,p)).rows,s=store(q);await s.migrate();await q("UPDATE calibre_assignment_settings SET start_date='2026-11-06'");
 await s.assign(1,date,{area:'cocina',employeeId:1},user,now);
 await s.save(1,date,{area:'cocina',revision:0,command:{action:'simple-point',point:'1.1',done:true}},user,now);
 const body={area:'cocina',revision:1,command:close};await s.save(1,date,body,user,now);
 const v=await s.get(1,date,now),r=v.areas.find(r=>r.spec.code==='cocina');assert.equal(r.feedbackStatus,'closed');assert.equal(r.data.feedback.employeeId,1);
 const d=v.weekly.areas.find(a=>a.code==='cocina').days[0];assert.equal(d.feedback.observation,close.observation);assert.equal(d.responsible.name,'Ana Lima');assert.equal(d.points['1.1'].status,'done');assert.equal(d.spec.code,'cocina');
 const h=await s.personHistory(1,1,date,date);assert.equal(h.entries[0].feedback.recommendation,close.recommendation);assert.equal(h.entries[0].feedbackStatus,'closed');
 await assert.rejects(s.save(1,date,body,user,now),/actualizó/);await assert.rejects(s.save(1,'2026-11-08',body,user,now),/histórico/);
 const events=await q("SELECT action,data FROM calibre_events ORDER BY revision");assert.equal(events[1].action,'feedback-close');assert.equal(events[1].data.feedback.actor,'NANCY');
 const old=await s.get(1,'2026-11-08',now);assert.equal(old.areas[0].feedbackStatus,'legacy');
 }finally{await db.close();}
});
