'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite');
const c=require('../lib/supervision/calibre'),{store}=require('../lib/supervision/calibre-store');
const now=new Date('2026-10-21T18:00:00Z'),nancy={name:'NANCY',role:'manager'},miguel={name:'MIGUEL',role:'manager'};
const spec=code=>c.AREAS.find(a=>a.code===code);
const run=(code,data,command,user=nancy,time=now)=>c.apply(spec(code),data,command,user,time,'2026-10-21');
function ready(code){const a=spec(code),d=c.blank();for(const p of a.points)d.points[p.id]={status:'done'};for(const product of a.products)for(const slot of ['arranque','comida','precierre'].slice(0,a.expected))d.samples.push({product,slot,total:1,passed:1});return d;}
test('approved cards retain their exact point numbers, 14 kitchen activities, and no invented cash amounts',()=>{
 assert.deepEqual(c.AREAS.map(a=>a.points.length),[15,14,12,15,13,16,7,8]);
 for(const a of c.AREAS)assert.equal(new Set(a.points.map(p=>p.id)).size,a.points.length);
assert.match(spec('cocina').points.find(p=>p.id==='1.2').text,/Rosticero/);
});
test('50/50 base, original failed sample retained, equal points and verified extra only at full base',()=>{
 let d=ready('ventas_barras');d.samples=[{product:'Pedido',slot:'arranque',total:10,passed:7},{product:'Pedido',slot:'comida',total:10,passed:7},{product:'Pedido',slot:'precierre',total:10,passed:7}];
 let s=c.summary(spec('ventas_barras'),d,now);assert.equal(s.score,85);assert.equal(s.level,'Mínimo');
 d.extra={verifiedAt:now.toISOString(),achieved:true};assert.equal(c.summary(spec('ventas_barras'),d,now).extra,0);
 d=ready('ventas_barras');d.extra={verifiedAt:now.toISOString(),achieved:true};s=c.summary(spec('ventas_barras'),d,now);assert.equal(s.score,120);
 d.extra.achieved=false;assert.equal(c.summary(spec('ventas_barras'),d,now).score,100);
 d.points['1.1']={status:'issue'};assert.ok(c.summary(spec('ventas_barras'),d,now).score<100);
 d.points['1.1']={status:'na',note:'No aplica validado'};assert.equal(c.summary(spec('ventas_barras'),d,now).ficha,100);
});
test('no cases and missing checks differ; extra never replaces missing KPI or critical resolution',()=>{
 const d=ready('rosticero');d.extra={verifiedAt:now.toISOString(),achieved:true};d.samples=[];
 assert.equal(c.summary(spec('rosticero'),d,now).level,'Pendiente de verificar');d.noCases={reason:'No hubo operación'};
 let s=c.summary(spec('rosticero'),d,now);assert.equal(s.level,'Sin casos para evaluar');assert.equal(s.extra,0);assert.equal(s.provisional,true);
 d.samples=ready('rosticero').samples;d.points['1.6']={status:'issue'};s=c.summary(spec('rosticero'),d,now);assert.equal(s.critical,true);assert.equal(s.extra,0);
});
test('samples have explicit products, counts and reasons; original observation cannot be overwritten',()=>{
 let d=run('ventas_barras',c.blank(),{action:'sample',product:'Pedido',slot:'arranque',total:5,passed:4,note:'Forma de pago incorrecta'});
 assert.throws(()=>run('ventas_barras',d,{action:'sample',product:'Pedido',slot:'arranque',total:5,passed:5,note:''}),/original/);
 assert.throws(()=>run('ventas_barras',d,{action:'sample',product:'Pedido',slot:'comida',total:2,passed:2,note:''}),/menos casos/);
 assert.throws(()=>run('ventas_barras',d,{action:'sample',product:'Pedido',slot:'comida',total:5,passed:6}),/cantidades/);
 assert.equal(d.samples[0].passed,4);
});
test('extra requires agreement, outcome, independent supervision verifier',()=>{
 assert.throws(()=>run('supervision',c.blank(),{action:'extra-plan',choice:0,associate:'Nancy',expected:'Prevenir faltante'}),/Miguel/);
 let d=run('supervision',c.blank(),{action:'extra-plan',choice:0,associate:'Nancy',expected:'Prevenir faltante'},miguel);
 d=run('supervision',d,{action:'extra-verify',achieved:true,result:'Reposición anticipada verificada',evidence:''},miguel);assert.equal(d.extra.verifiedBy,'MIGUEL');
});
test('incidence keeps deadline and original failure after late resolution',()=>{
 let d=run('supervision',c.blank(),{action:'incident',description:'Falta producto',owner:'Nancy',due:'2026-10-21T12:15:00-06:00',critical:true});
 const due=d.incidents[0].due;assert.equal(c.summary(spec('supervision'),d,new Date('2026-10-21T18:20Z')).critical,true);
 d=run('supervision',d,{action:'resolve',id:d.incidents[0].id,note:'Abasto verificado'},nancy,new Date('2026-10-21T18:30Z'));
 assert.equal(d.incidents[0].due,due);assert.equal(c.summary(spec('supervision'),d,new Date('2026-10-21T18:31Z')).kpi,0);
});
test('closing freezes result, missing handoff blocks closure; reopen requires named manager and reason',()=>{
 let d=ready('freidoras');assert.throws(()=>run('freidoras',d,{action:'close'}),/sobrantes/);
 assert.throws(()=>run('freidoras',d,{action:'closing-note',note:'Entrega verificada'}),/separado/);
 d=run('freidoras',d,{action:'closing-note',note:'Vegetales y entrega verificados',raw:0,cooked:2});d=run('freidoras',d,{action:'close'});
 assert.equal(d.finalSummary.score,100);assert.throws(()=>run('freidoras',d,{action:'point',point:'1.1',status:'done'}),/cerrado/);
 assert.throws(()=>run('freidoras',d,{action:'reopen',reason:'Corrección de registro'}),/Miguel/);
 assert.equal(run('freidoras',d,{action:'reopen',reason:'Corrección de registro'},miguel).final,false);
});
test('reports omit cash and personal notes, distinguish provisional and final, and never claim delivery',()=>{
 const d=ready('ventas_barras');d.points['1.1'].note='SECRETO_PERSONAL';const rows=[{spec:spec('ventas_barras'),data:d}];
 const text=c.report(rows,'2026-10-21','avance',now);assert.match(text,/ASÍ VAMOS/);assert.match(text,/Provisional/);assert.doesNotMatch(text,/SECRETO_PERSONAL/);
 assert.throws(()=>c.report(rows,'2026-10-21','cierre',now),/cierre verificado/);
});
test('real PostgreSQL schema is idempotent, compare-and-swap atomic, snapshots immutable and incidents visible to supervision',async()=>{
 const db=new PGlite();try{
  await db.exec("CREATE TABLE locations(id int PRIMARY KEY,code text,name text,type text); INSERT INTO locations VALUES(1,'jojutla','Jojutla','tienda');CREATE TABLE untouched_history(id int);INSERT INTO untouched_history VALUES(9)");
  const query=async(s,p)=>(await db.query(s,p)).rows,service=store(query);await service.migrate();await service.migrate();
  const body={area:'ventas_barras',revision:0,command:{action:'point',point:'1.1',status:'done',note:''}};
  let v=await service.save(1,'2026-10-21',body,nancy,now);assert.equal(v.areas.find(r=>r.spec.code==='ventas_barras').revision,1);
  await assert.rejects(service.save(1,'2026-10-21',body,nancy,now),/actualizó/);
  await service.save(1,'2026-10-21',{area:'ventas_barras',revision:1,command:{action:'incident',description:'Atención en barra',owner:'Nancy',due:'2026-10-22T08:00:00-06:00',critical:true}},nancy,now);
  v=await service.get(1,'2026-10-21',now);const inc=v.areas.find(r=>r.spec.code==='supervision').data.incidents[0];assert.ok(inc);
  const next=new Date('2026-10-22T13:50:00Z');v=await service.get(1,'2026-10-22',next);assert.equal(v.areas.find(r=>r.spec.code==='supervision').data.incidents.length,1);
  await service.save(1,'2026-10-22',{area:'supervision',revision:0,command:{action:'resolve',id:inc.id,note:'Verificado al abrir'}},miguel,next);
  v=await service.get(1,'2026-10-22',new Date('2026-10-22T14:10Z'));assert.equal(v.areas.find(r=>r.spec.code==='supervision').summary.kpi,100);
  const r=await service.saveReport(1,'2026-10-21','ventas_barras','avance',nancy,now);
  await service.save(1,'2026-10-21',{area:'ventas_barras',revision:2,command:{action:'point',point:'1.2',status:'done',note:''}},nancy,now);
  const [saved]=await query('SELECT message FROM calibre_reports WHERE id=$1',[r.id]);assert.equal(saved.message,r.message);
  assert.deepEqual(await query('SELECT * FROM untouched_history'),[{id:9}]);assert.equal((await query('SELECT * FROM calibre_events')).length,4);
  await assert.rejects(service.save(1,'2026-10-20',body,nancy,now),/histórico/);
 }finally{await db.close();}
});
test('authenticated API rejects anonymous access, cross-site writes, stale revisions and historical mutation',async()=>{
 const db=new PGlite();const secret=crypto.randomBytes(48).toString('hex');process.env.INVENTORY_SESSION_SECRET=secret;
 const user={id:'nancy',name:'NANCY',role:'manager',hash:'fixture-hash'};process.env.INVENTORY_USERS_JSON=JSON.stringify([user]);
 const p=Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,v:crypto.createHash('sha256').update(user.hash+user.role).digest('hex')})).toString('base64url');
 const cookie='chickenia_inventory='+p+'.'+crypto.createHmac('sha256',secret).update(p).digest('base64url');
 try{
  await db.exec("CREATE TABLE locations(id int PRIMARY KEY,code text,name text,type text);INSERT INTO locations VALUES(1,'jojutla','Jojutla','tienda')");
  const q=async(s,p)=>(await db.query(s,p)).rows,h=require('../lib/supervision/calibre-handler').createHandler(q,()=>now);
  const call=async(method,body,headers={cookie,host:'localhost',origin:'http://localhost','content-type':'application/json'})=>{let result;const res={setHeader(){},status(s){this.code=s;return this;},json(d){result={status:this.code,data:d};}};await h({method,body,headers,query:{date:'2026-10-21'}},res);return result;};
  assert.equal((await call('GET',null,{})).status,401);
  const body={date:'2026-10-21',area:'ventas_barras',revision:0,command:{action:'point',point:'1.1',status:'done',note:''}};
  assert.equal((await call('POST',body,{cookie,host:'localhost',origin:'http://evil.test','content-type':'application/json'})).status,403);
  assert.equal((await call('POST',body)).status,200);assert.equal((await call('POST',body)).status,409);
  assert.equal((await call('POST',{...body,date:'2026-10-20'})).status,409);
  assert.equal((await call('GET')).data.areas.find(a=>a.spec.code==='ventas_barras').revision,1);
 }finally{await db.close();}
});
