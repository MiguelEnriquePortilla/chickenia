'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const core=require('../lib/supervision/control-points');
const date='2026-10-10',clock=new Date('2026-10-11T02:00:00Z');
test('paper catalog contains 30 equally weighted points in each of four cuts',()=>{
 assert.deepEqual(core.catalog.map(c=>c.time),['10:00','12:00','16:00','19:00']);
 for(const cut of core.catalog){assert.equal(cut.areas.length,10);assert.equal(cut.areas.flatMap(a=>a.points).length,30);assert.equal(new Set(cut.areas.flatMap(a=>a.points.map(p=>p.id))).size,30);}
 assert.match(core.catalog[0].areas.find(a=>a.code==='freidoras').points[1].text,/3 pollos/);
 assert.match(core.catalog[3].areas.find(a=>a.code==='supervision').points[1].text,/Video en grupo/);
});
test('late checks and later unchecks do not rewrite prior cuts',()=>{
 const id=core.catalog[0].areas[0].points[0].id;
 const events=[{id:1,cut_index:0,point_id:id,done:true,recorded_at:`${date}T09:00:00-06:00`},{id:2,cut_index:0,point_id:id,done:false,recorded_at:`${date}T11:00:00-06:00`}];
 const first=core.evaluate(date,core.catalog,events,clock)[0].areas[0];
 assert.equal(first.done,1);assert.equal(first.points[0].done,false);assert.equal(first.points[0].atCut,true);
 assert.equal(core.evaluate(date,core.catalog,[{...events[0],recorded_at:`${date}T10:01:00-06:00`}],clock)[0].done,0);
});
test('future cuts excluded from daily scores and no history produces no bonus',()=>{
 const h=core.history([{date,catalog:core.catalog}],[],date,new Date(`${date}T11:00:00-06:00`));
 assert.equal(h.records[0].final,false);assert.equal(h.periods[0].areas[0].score,null);assert.equal(h.periods[0].areas[0].bonus,false);
});
test('only current slot accepts edits and exact deadlines switch slots',()=>{
 const id=core.catalog[3].areas.find(a=>a.code==='supervision').points[2].id;
 const events=[{id:1,cut_index:3,point_id:'cocina-0',done:true,recorded_at:`${date}T19:15:00-06:00`},{id:2,cut_index:3,point_id:id,done:true,recorded_at:`${date}T19:30:00-06:00`},{id:3,cut_index:3,point_id:'cocina-1',done:true,recorded_at:`${date}T19:45:00-06:00`}];
 const close=core.evaluate(date,core.catalog,events,clock)[3];assert.equal(close.passed,true);assert.equal(close.areas[0].done,0);
 assert.equal(core.evaluate(date,core.catalog,[],clock)[3].passed,true);
 assert.equal(core.evaluate(date,core.catalog,[],new Date('2026-10-11T07:00:00Z'))[3].passed,true);
 for(const [time,slot] of [['09:59:59',0],['10:00:00',1],['11:59:59',1],['12:00:00',2],['16:00:00',3],['19:00:00',-1]]){
  const now=new Date(`${date}T${time}-06:00`);assert.equal(core.activeCut(date,core.catalog,now),slot);
  for(let cut=0;cut<4;cut++){
   const body={cut,point:'cocina-0',done:true,revision:0};
   if(cut===slot)assert.doesNotThrow(()=>core.validate(body,date,core.catalog,now));else assert.throws(()=>core.validate(body,date,core.catalog,now));
  }
 }
});
test('calendar week/month, closed days and exact 85 percent bonus boundary',()=>{
 const cuts=core.catalog.map(c=>({...c,areas:[{code:'one',name:'Área',points:Array.from({length:20},(_,i)=>({id:String(i),text:String(i)}))}]}));
 // history supports a real denominator instead of a rounded displayed percent.
 const events=cuts.flatMap((c,cut_index)=>c.areas[0].points.slice(0,17).map(p=>({date,cut_index,point_id:p.id,done:true,recorded_at:`${date}T09:00:00-06:00`})));
 const h=core.history([{date,catalog:cuts}],events,date,clock);
 assert.equal(h.periods[0].start,'2026-10-05');assert.equal(h.periods[1].start,'2026-10-01');
 assert.equal(h.periods[0].areas[0].score,85);assert.equal(h.periods[0].areas[0].bonus,true);
 const closed=core.history([{date,catalog:cuts,closed:true}],events,date,clock);assert.equal(closed.periods[0].areas[0].days,0);
});
test('reject past dates, future cuts, invalid points and revisions',()=>{
 for(const b of [{cut:0,point:'no',done:true,revision:0},{cut:3,point:'cocina-0',done:true,revision:0},{cut:0,point:'cocina-0',done:true,revision:-1}])assert.throws(()=>core.validate(b,date,core.catalog,new Date(`${date}T08:00:00-06:00`)));
 assert.throws(()=>core.validate({cut:0,point:'cocina-0',done:true,revision:0},'2026-10-09',core.catalog,clock));
});
test('real isolated database saves audit events, rejects stale revisions and preserves old checklist',async()=>{
 const {PGlite}=require('@electric-sql/pglite'),db=new PGlite();
 const sql=async(parts,...values)=>(await db.query(parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,''),values)).rows;
 await db.exec("CREATE TABLE locations(id INT PRIMARY KEY,name TEXT,type TEXT); INSERT INTO locations VALUES(1,'Sucursal','tienda'); CREATE TABLE checklist_timeline_days(location_id INT,date DATE,closed BOOLEAN); CREATE TABLE activity_checks(id INT); INSERT INTO activity_checks VALUES(9);");
 const today=core.day(new Date());
 const {createHandler}=require('../lib/supervision/control-points-handler');
 const handler=createHandler({getSql:async()=>sql,authenticate:()=>({name:'Nancy',role:'manager'}),clock:()=>new Date(`${today}T09:30:00-06:00`)});
 async function call(body){const req={method:body?'POST':'GET',query:{date:today,location_id:'1'},headers:{origin:'http://localhost',host:'localhost','content-type':'application/json'},body};let value,status;
  await handler(req,{setHeader(){},status(s){status=s;return this;},json(d){value=d;}});return {status,value};}
 try{
  const initial=await call();assert.equal(initial.status,200);assert.equal(initial.value.revision,0);
  const save=await call({cut:0,point:'cocina-0',done:true,revision:0});assert.equal(save.status,200);assert.equal(save.value.revision,1);
  assert.equal((await call({cut:0,point:'cocina-1',done:true,revision:0})).status,409);
  assert.equal((await db.query('SELECT actor FROM supervision_point_events')).rows[0].actor,'Nancy');
  assert.equal((await db.query('SELECT * FROM activity_checks')).rows.length,1);
 }finally{await db.close();}
});
