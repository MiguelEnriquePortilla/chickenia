'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const core=require('../lib/supervision/control-points');
const date='2026-10-10',clock=new Date('2026-10-11T02:00:00Z');
test('meeting agreements apply to Barra without rewriting closed cuts or old dates',()=>{
 const d='2026-10-12',cuts=core.catalogForDate(d);
 assert.deepEqual(core.catalogForDate('2026-10-11'),core.catalog);
 const first=cuts[0].areas.find(a=>a.code==='ventas_barras').points[0];
 const second=cuts[1].areas.find(a=>a.code==='ventas_barras').points[0];
 assert.match(first.text,/25%.*9:30.*10:30/);assert.match(second.text,/75%.*13:30/);
 assert.notEqual(first.id,core.catalog[0].areas.find(a=>a.code==='ventas_barras').points[0].id);
 assert.equal(cuts[0].areas.flatMap(a=>a.points).length,30);
 const upgraded=core.upgradeCatalog(d,core.catalog,new Date(d+'T11:00:00-06:00'));
 assert.deepEqual(upgraded[0],core.catalog[0]);assert.deepEqual(upgraded[1],cuts[1]);
 assert.deepEqual(core.upgradeCatalog(d,upgraded,new Date(d+'T11:00:00-06:00')),upgraded);
 assert.throws(()=>core.validate({cut:1,point:'ventas_barras-0',done:true,revision:0},d,cuts,new Date(d+'T11:00:00-06:00')));
 assert.doesNotThrow(()=>core.validate({cut:1,point:second.id,done:true,revision:0},d,cuts,new Date(d+'T11:00:00-06:00')));
});
test('paper catalog contains 30 equally weighted points in each of four cuts',()=>{
 assert.deepEqual(core.catalog.map(c=>c.time),['10:30','13:30','16:30','19:30']);
 assert.deepEqual(core.previousCatalog.map(c=>c.time),['10:00','12:00','16:00','19:00']);
 for(const cut of core.previousCatalog){assert.equal(cut.areas.length,10);assert.equal(cut.areas.flatMap(a=>a.points).length,30);assert.equal(new Set(cut.areas.flatMap(a=>a.points.map(p=>p.id))).size,30);}
 assert.match(core.previousCatalog[0].areas.find(a=>a.code==='freidoras').points[1].text,/3 pollos/);
 assert.match(core.previousCatalog[3].areas.find(a=>a.code==='supervision').points[1].text,/Video en grupo/);
});
test('late checks and later unchecks do not rewrite prior cuts',()=>{
 const id=core.previousCatalog[0].areas[0].points[0].id;
 const events=[{id:1,cut_index:0,point_id:id,done:true,recorded_at:`${date}T09:00:00-06:00`},{id:2,cut_index:0,point_id:id,done:false,recorded_at:`${date}T11:00:00-06:00`}];
 const first=core.evaluate(date,core.previousCatalog,events,clock)[0].areas[0];
 assert.equal(first.done,1);assert.equal(first.points[0].done,false);assert.equal(first.points[0].atCut,true);
 assert.equal(core.evaluate(date,core.previousCatalog,[{...events[0],recorded_at:`${date}T10:01:00-06:00`}],clock)[0].done,0);
});
test('future cuts excluded from daily scores and no history produces no bonus',()=>{
 const h=core.history([{date,catalog:core.previousCatalog}],[],date,new Date(`${date}T11:00:00-06:00`));
 assert.equal(h.records[0].final,false);assert.equal(h.periods[0].areas[0].score,null);assert.equal(h.periods[0].areas[0].bonus,false);
});
test('only current slot accepts edits and exact deadlines switch slots',()=>{
 const id=core.previousCatalog[3].areas.find(a=>a.code==='supervision').points[2].id;
 const events=[{id:1,cut_index:3,point_id:'cocina-0',done:true,recorded_at:`${date}T19:15:00-06:00`},{id:2,cut_index:3,point_id:id,done:true,recorded_at:`${date}T19:30:00-06:00`},{id:3,cut_index:3,point_id:'cocina-1',done:true,recorded_at:`${date}T19:45:00-06:00`}];
 const close=core.evaluate(date,core.previousCatalog,events,clock)[3];assert.equal(close.passed,true);assert.equal(close.areas[0].done,0);
 assert.equal(core.evaluate(date,core.previousCatalog,[],clock)[3].passed,true);
 assert.equal(core.evaluate(date,core.previousCatalog,[],new Date('2026-10-11T07:00:00Z'))[3].passed,true);
 for(const [time,slot] of [['09:59:59',0],['10:00:00',1],['11:59:59',1],['12:00:00',2],['16:00:00',3],['19:00:00',-1]]){
  const now=new Date(`${date}T${time}-06:00`);assert.equal(core.activeCut(date,core.previousCatalog,now),slot);
  for(let cut=0;cut<4;cut++){
   const body={cut,point:'cocina-0',done:true,revision:0};
   if(cut===slot)assert.doesNotThrow(()=>core.validate(body,date,core.previousCatalog,now));else assert.throws(()=>core.validate(body,date,core.previousCatalog,now));
  }
 }
});
test('calendar week/month, closed days and exact 85 percent bonus boundary',()=>{
 const cuts=core.previousCatalog.map(c=>({...c,areas:[{code:'one',name:'Área',points:Array.from({length:20},(_,i)=>({id:String(i),text:String(i)}))}]}));
 // history supports a real denominator instead of a rounded displayed percent.
 const events=cuts.flatMap((c,cut_index)=>c.areas[0].points.slice(0,17).map(p=>({date,cut_index,point_id:p.id,done:true,recorded_at:`${date}T09:00:00-06:00`})));
 const h=core.history([{date,catalog:cuts}],events,date,clock);
 assert.equal(h.periods[0].start,'2026-10-05');assert.equal(h.periods[1].start,'2026-10-01');
 assert.equal(h.periods[0].areas[0].score,85);assert.equal(h.periods[0].areas[0].bonus,true);
 const closed=core.history([{date,catalog:cuts,closed:true}],events,date,clock);assert.equal(closed.periods[0].areas[0].days,0);
});
test('reject past dates, future cuts, invalid points and revisions',()=>{
 for(const b of [{cut:0,point:'no',done:true,revision:0},{cut:3,point:'cocina-0',done:true,revision:0},{cut:0,point:'cocina-0',done:true,revision:-1}])assert.throws(()=>core.validate(b,date,core.previousCatalog,new Date(`${date}T08:00:00-06:00`)));
 assert.throws(()=>core.validate({cut:0,point:'cocina-0',done:true,revision:0},'2026-10-09',core.previousCatalog,clock));
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
  const initial=await call();assert.equal(initial.status,200);assert.equal(initial.value.revision,0);assert.equal(initial.value.start,'2026-10-12');
  const save=await call({cut:0,point:'cocina-0',done:true,revision:0});assert.equal(save.status,200);assert.equal(save.value.revision,1);
  assert.equal((await call({cut:0,point:'cocina-1',done:true,revision:0})).status,409);
  assert.equal((await db.query('SELECT actor FROM supervision_point_events')).rows[0].actor,'Nancy');
  assert.equal((await db.query('SELECT * FROM activity_checks')).rows.length,1);
  await db.exec(`ALTER TABLE supervision_point_events ALTER COLUMN recorded_at SET DEFAULT '${today}T09:30:00-06:00'::timestamptz`);
  const evidence=await call({cut:0,point:core.videoPoint('cocina'),done:true,revision:1,actor:'Fake',recorded_at:'2000-01-01T00:00:00Z'});
  assert.equal(evidence.status,200);
  const video=evidence.value.cuts[0].areas.find(a=>a.code==='cocina').video;
  assert.equal(video.done,true);assert.equal(video.actor,'Nancy');assert.equal(new Date(video.recordedAt).toISOString(),new Date(today+'T09:30:00-06:00').toISOString());
  assert.equal((await call({cut:0,point:core.videoPoint('cocina'),done:false,revision:1})).status,409);

 }finally{await db.close();}
});
test('Sunday is practice and Monday is the first day eligible for bonus averages',()=>{
 assert.equal(core.START,'2026-10-12');
 const days=['2026-10-11','2026-10-12'].map(date=>({date,catalog:core.previousCatalog,active:date>=core.START}));
 const h=core.history(days,[],'2026-10-12',new Date('2026-10-13T02:00:00Z'));
 assert.equal(h.records[0].active,false);assert.equal(h.records[1].active,true);
 assert.equal(h.periods[0].areas[0].days,1);assert.equal(h.periods[1].areas[0].days,1);
});

test('new cutoffs switch exactly at CDMX deadlines and preserve closed historical cuts',()=>{
 const d='2026-10-12';
 for(const [time,slot] of [['10:29:59',0],['10:30:00',1],['13:29:59',1],['13:30:00',2],['16:30:00',3],['19:30:00',-1]])assert.equal(core.activeCut(d,core.catalog,new Date(`${d}T${time}-06:00`)),slot);
 assert.deepEqual(core.catalogForDate('2026-10-10'),core.previousCatalog);
 const upgraded=core.upgradeCatalog('2026-10-11',core.previousCatalog,new Date('2026-10-11T12:30:00-06:00'));
 assert.deepEqual(upgraded.map(c=>c.time),['10:00','12:00','16:30','19:30']);
});

test('video is mandatory for every area at every cutoff; late evidence never rewrites score',()=>{
 const date='2026-10-12',now=new Date(date+'T20:00:00-06:00');
 for(let index=0;index<4;index++)for(const area of core.catalog[index].areas){
  const before=new Date(core.at(date,core.catalog[index].time)-1000).toISOString();
  const checks=area.points.map((p,id)=>({id,cut_index:index,point_id:p.id,done:true,recorded_at:before}));
  const result=events=>core.evaluate(date,core.catalog,events,now)[index].areas.find(a=>a.code===area.code);
  assert.equal(result(checks).done,area.points.length);assert.equal(result(checks).score,0);
  const video={id:99,cut_index:index,point_id:core.videoPoint(area.code),done:true,actor:'Nancy',recorded_at:before};
  assert.equal(result([...checks,video]).score,100);
  assert.equal(result([...checks,{...video,recorded_at:new Date(core.at(date,core.catalog[index].time)).toISOString()}]).score,0);
  const late={...video,recorded_at:new Date(core.at(date,core.catalog[index].time)+1000).toISOString()};
  assert.equal(result([...checks,late]).video.done,true);assert.equal(result([...checks,late]).video.atCut,false);assert.equal(result([...checks,late]).score,0);
  assert.equal(result([...checks,video,{...late,done:false}]).score,100);
  assert.equal(result([...checks,video,{...late,done:false}]).video.history.length,2);
 }
});
test('video gate feeds daily and bonus averages and cannot be marked for future cuts or unknown areas',()=>{
 const date='2026-10-12',now=new Date(date+'T20:00:00-06:00');
 const events=core.catalog.flatMap((cut,cut_index)=>cut.areas.flatMap(a=>a.points.map(p=>({date,cut_index,point_id:p.id,done:true,recorded_at:date+'T09:00:00-06:00'}))));
 const h=core.history([{date,catalog:core.catalog}],events,date,now);
 assert.equal(h.records[0].areas[0].score,0);assert.equal(h.periods[0].areas[0].bonus,false);
 assert.doesNotThrow(()=>core.validate({cut:0,point:core.videoPoint('cocina'),done:true,revision:0},date,core.catalog,now));
 assert.throws(()=>core.validate({cut:1,point:core.videoPoint('cocina'),done:true,revision:0},date,core.catalog,new Date(date+'T09:00:00-06:00')));
 assert.throws(()=>core.validate({cut:0,point:core.videoPoint('unknown'),done:true,revision:0},date,core.catalog,now));
});
