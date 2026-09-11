const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const {parse,answer}=require('../lib/chicken-query');
const {createHandler}=require('../api/chicken-ia');
const {freshState}=require('../lib/inventory-domain');
const now=new Date('2026-09-11T18:00:00Z');
test('controlled questions preserve context, dates and reject writes/unknown questions',()=>{
  assert.equal(parse({question:'¿y Cocina?',previous:'critical'},now).intent,'critical');
  assert.equal(parse({question:'¿y Cocina?',previous:'critical'},now).area,'cocina');
  assert.equal(parse({question:'Resumen de ayer'},now).date,'2026-09-10');
  assert.equal(parse({question:'Autoriza la compra'},now).intent,'unsupported');
  assert.equal(parse({question:'Dime las ventas de Poster'},now).intent,'unsupported');
  assert.throws(()=>parse({question:'Resumen',date:'2026-02-30'},now));
  assert.throws(()=>parse({question:'Resumen',area:'fake'},now));
});
test('server rejects anonymous, Nancy manager, forged roles and writes before querying',async()=>{
  let reads=0;const query=async()=>{reads++;return [];};
  const call=async(handler,method='GET')=>{const res={setHeader(){},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};await handler({method,query:{action:'session'},headers:{}},res);return res;};
  assert.equal((await call(createHandler(query,()=>({id:'nancy',role:'manager'})))).code,403);
  assert.equal((await call(createHandler(query,()=>({id:'someone',role:'manager'})))).code,403);
  assert.equal((await call(createHandler(query,()=>({id:'lilian',role:'dispatch'})))).code,200);
  assert.equal((await call(createHandler(query,()=>({id:'miguel'})),'POST')).code,405);
  assert.equal((await call(createHandler(query))).code,503);
  assert.equal(reads,0);
});
test('actual SQL preserves weights, weekly schedules, historical catalogue and missing records',async()=>{
  const db=new PGlite();const query=async(s,p)=>(await db.query(s,p)).rows;
  try{
    await db.exec(`CREATE TABLE locations(id int,code text,type text,active boolean);INSERT INTO locations VALUES(1,'jojutla','tienda',true);
      CREATE TABLE areas(id int,code text,name text,location_type text,order_index int);INSERT INTO areas VALUES(1,'cocina','Cocina','tienda',1);
      CREATE TABLE activities(id int,area_id int,name text,weight int,criticality text,active boolean,frequency text,valid_from date,valid_until date,order_index int);
      INSERT INTO activities VALUES(1,1,'Completa',3,'media',true,'daily',null,null,1),(2,1,'Sin captura',10,'critica',true,'daily',null,null,2),(3,1,'Semanal',6,'alta',true,'weekly',null,null,3),(4,1,'Futura',10,'critica',true,'daily','2026-09-12',null,4);
      CREATE TABLE kitchen_plans(activity_id int,plan_date date);
      CREATE TABLE activity_checks(activity_id int,check_date date,location_id int,done boolean,checked_at timestamptz);
      INSERT INTO activity_checks VALUES(1,'2026-09-11',1,true,'2026-09-11T17:00Z');`);
    const result=await answer(parse({question:'Resumen del día'},now),query,now);
    assert.equal(result.title,'1 de 2 actividades con cumplimiento registrado.');
    assert.equal(result.rows[0][2],'23%');
    const critical=await answer(parse({question:'Pendientes críticos'},now),query,now);
    assert.deepEqual(critical.rows,[['Cocina: Sin captura','Sin captura']]);
    assert.match(critical.sources[0].href,/date=2026-09-11/);
    assert.match(critical.warnings[0],/no demuestra incumplimiento/);
    const comparison=await answer(parse({question:'Comparar con ayer'},now),query,now);
    assert.deepEqual(comparison.rows,[['Cocina','1 / 2 · 23%','0 / 2 · 0%']]);
    assert.equal(comparison.sources.length,2);
    await db.exec("INSERT INTO kitchen_plans VALUES(3,'2026-09-11')");
    assert.match((await answer(parse({question:'Resumen'},now),query,now)).title,/1 de 3/);
  }finally{await db.close();}
});
test('inventory keeps scaled quantities, unknown balances and physical verification distinct',async()=>{
  const s=freshState();s.initialized['sucursal:rosti-cocinado']=true;s.balances['sucursal:rosti-cocinado']=1250;
  const query=async()=>[{version:1,data:s,updated_at:now.toISOString()}];
  const result=await answer(parse({question:'Inventarios y compras',area:'cocina'},now),query,now);
  assert.equal(result.rows.length,1);assert.equal(result.rows[0][1],'1.25 pollos');assert.equal(result.rows[0][2],'Sin conteo');
  assert.ok(result.warnings.some(w=>w.includes('no se atribuyen')));
  let reads=0;const historical=await answer(parse({question:'Inventarios',date:'2026-09-10'},now),async()=>{reads++;},now);
  assert.equal(reads,0);assert.match(historical.title,/disponible para hoy/);
});
