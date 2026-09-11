const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const base=require('../lib/supervision/db');
const catalogs=require('../lib/supervision/rastro-sucursal-routines').build(base.SEED_ACTIVITIES);
const migrate=require('../lib/supervision/rastro-sucursal-migration');
test('separates Rastro, Sucursal and verification without deleting earlier validated duties',()=>{
  assert.ok(catalogs.rastro.some(r=>r[0].includes('6:00')));
  assert.ok(catalogs.sucursal_apertura.some(r=>r[0].includes('pelotero')));
  assert.ok(!catalogs.rastro.some(r=>/cortina|pelotero|Autorizar.*pase/.test(r[0])));
  assert.ok(catalogs.rastro.some(r=>r[0]==='Registro de gastos de rastro'));
  assert.ok(catalogs.rastro.some(r=>r[0].includes('marinado para ROSTI')));
  assert.ok(catalogs.supervision.some(r=>r[0].startsWith('7:00')));
  assert.ok(catalogs.supervision.some(r=>r[0].startsWith('10:00')));
  assert.ok(!catalogs.supervision.some(r=>r[0].includes('conteo de proteínas')));
  const ledger=catalogs.supervision.findIndex(r=>r[0].includes('movimientos registrados de pollo'));
  const release=catalogs.supervision.findIndex(r=>r[0].includes('Autorizar y documentar el pase'));
  assert.ok(ledger<release);assert.match(catalogs.supervision[release][5],/no requiere conteo físico diario/);
});
for(const captured of [false,true])test(`atomic catalogue switch, preserved history, captured today=${captured}`,async()=>{
  const db=new PGlite();
  const sql=async(parts,...values)=>(await db.query(parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,''),values)).rows;
  try{
    await db.exec(`CREATE TABLE areas(id serial primary key,code text unique,name text,location_type text,order_index int,active boolean default true);
      INSERT INTO areas(code,name,location_type,order_index) VALUES('rastro','Rastro','tienda',1),('supervision','Supervision','tienda',8);
      CREATE TABLE activities(id serial primary key,area_id int,name text,criticality text,weight int,requires_quantity boolean,unit text,indicator_type text,target text,order_index int,active boolean default true);
      INSERT INTO activities(area_id,name,weight,criticality,order_index) VALUES(1,'Original Rastro',3,'media',1),(2,'Original Supervision',3,'media',1);
      CREATE TABLE activity_checks(activity_id int,location_id int,check_date date,done boolean,quantity numeric,quality_score int,notes text,checked_by text,checked_at timestamptz);
      INSERT INTO activity_checks VALUES(1,1,'2020-01-01',true,4,null,'historial','Nancy',now());`);
    await require('../lib/supervision/routine-migration')(sql,base.CRITICALITY_WEIGHT);
    if(captured)await sql`INSERT INTO activity_checks(activity_id,check_date,done) VALUES(2,(now() AT TIME ZONE 'America/Mexico_City')::date,true)`;
    await migrate(sql,base.CRITICALITY_WEIGHT,base.SEED_ACTIVITIES);
    await migrate(sql,base.CRITICALITY_WEIGHT,base.SEED_ACTIVITIES);
    assert.equal((await sql`SELECT count(*)::int n FROM activities`)[0].n,2+Object.values(catalogs).flat().length);
    assert.equal((await sql`SELECT count(*)::int n FROM checklist_catalog_versions`)[0].n,1);
    assert.equal((await sql`SELECT count(*)::int n FROM activity_checks WHERE notes='historial'`)[0].n,1);
    const dates=await sql`SELECT DISTINCT valid_from FROM activities WHERE valid_from IS NOT NULL`;
    assert.equal(dates.length,1);
    const offset=(await sql`SELECT effective_date-(now() AT TIME ZONE 'America/Mexico_City')::date AS days FROM checklist_catalog_versions`)[0].days;
    assert.equal(offset,captured?1:0);
    const old=await sql`SELECT name FROM activities WHERE valid_until IS NOT NULL ORDER BY id`;
    assert.deepEqual(old.map(r=>r.name),['Original Rastro','Original Supervision']);
    const current=await sql`SELECT ar.code,count(*)::int n FROM activities a JOIN areas ar ON ar.id=a.area_id WHERE a.valid_until IS NULL GROUP BY ar.code`;
    for(const row of current)assert.equal(row.n,catalogs[row.code].length);
  }finally{await db.close();}
});
