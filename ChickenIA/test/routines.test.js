const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const migrate = require('../api/lib/routine-migration');
const routines = require('../api/lib/rosticero-routines');

test('routine migration is repeatable and preserves historical catalogue and checks', async () => {
  const db = new PGlite();
  const sql = async (parts, ...values) => (await db.query(parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,''), values)).rows;
  await db.exec(`CREATE TABLE areas(id serial primary key, code text, name text, location_type text, order_index int, active boolean default true);
    INSERT INTO areas VALUES (1,'rosticero','Rosticero','tienda',1,true),(2,'cocina','Cocina','tienda',2,true);
    CREATE TABLE activities(id serial primary key, area_id int, name text, criticality text, weight int,
      requires_quantity boolean, unit text, indicator_type text, target text, order_index int, active boolean default true);
    INSERT INTO activities(area_id,name,criticality,weight,order_index) VALUES (1,'Anterior','critica',10,1),(2,'Cocina original','media',3,1);
    CREATE TABLE locations(id int, code text, name text, type text);
    INSERT INTO locations VALUES(1,'jojutla','Jojutla','tienda');
    CREATE TABLE activity_checks(activity_id int, location_id int, check_date date, done boolean, quantity numeric, quality_score int, notes text, checked_by text, checked_at timestamptz);
    INSERT INTO activity_checks VALUES(1,1,'2026-01-01',true,20,null,'histórico','Nancy',now());`);
  try {
    await sql`INSERT INTO activity_checks(activity_id, location_id, check_date, done) VALUES (1,1,(now() AT TIME ZONE 'America/Mexico_City')::date,true)`;
    await migrate(sql,{baja:1,media:3,alta:6,critica:10});
    await migrate(sql,{baja:1,media:3,alta:6,critica:10});
    assert.equal((await sql`SELECT count(*)::int AS n FROM activities`)[0].n,routines.length+2);
    assert.equal((await sql`SELECT count(*)::int AS n FROM activity_checks WHERE activity_id=1`)[0].n,2);
    assert.equal((await sql`SELECT valid_until FROM activities WHERE id=2`)[0].valid_until,null);
    const dbModule = require('../api/lib/db');
    dbModule.ensureTables=async()=>sql;
    const areas=require('../api/areas');
    const summary=require('../api/summary');
    const call=async(handler,query)=>{let result;const res={status(n){assert.equal(n,200);return this;},json(v){result=v;}};await handler({query},res);return result;};
    const old=await call(areas,{location_type:'tienda',date:'2026-01-01'});
    assert.deepEqual(old[0].activities.map(a=>a.name),['Anterior']);
    const today=await call(areas,{location_type:'tienda'});
    assert.deepEqual(today[0].activities.map(a=>a.name),['Anterior']);
    const current=await call(areas,{location_type:'tienda',date:'2099-01-01'});
    assert.equal(current[0].activities.length,routines.length);
    assert.deepEqual([...new Set(current[0].activities.map(a=>a.routine_block))],['apertura','operacion','cierre']);
    const oldSummary=await call(summary,{location_id:1,date:'2026-01-01'});
    assert.equal(oldSummary.areas[0].score,100);
    assert.equal(oldSummary.areas[0].total_items,1);
    const currentSummary=await call(summary,{location_id:1,date:'2099-01-01'});
    assert.equal(currentSummary.areas[0].total_items,routines.length);
  } finally {await db.close();}
});
