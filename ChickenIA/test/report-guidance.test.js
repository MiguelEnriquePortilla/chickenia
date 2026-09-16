'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { report, message, CUTS } = require('../lib/supervision/telegram');
const { classifications } = require('../lib/supervision/report-guidance');
const { SEED_ACTIVITIES } = require('../lib/supervision/db');

test('precierre carries opening criticals forward and excludes later closing criticals', () => {
  const rows = [
    { area_name:'Caja', area_code:'caja', name:'Cambio', routine_block:'apertura', weight:10, criticality:'critica', done:false },
    { area_name:'Supervisión', area_code:'supervision', name:'7:30pm — Envío de reporte de cierre (ventas, incidencias, inventario)', routine_block:'operacion', weight:10, criticality:'critica', done:false },
  ];
  const snapshot=report(rows,CUTS[3],'2026-09-16','Jojutla','2026-09-16T23:00:00Z');
  assert.match(snapshot.instruction,/Hay 1 actividad crítica pendiente de verificar en Caja/);
  assert.doesNotMatch(snapshot.instruction,/en Caja, Supervisión/);
  assert.equal(snapshot.areas[1].critical_pending,0);
  assert.match(report(rows,CUTS[4],'2026-09-16','Jojutla','2026-09-17T01:00:00Z').instruction,/Hay 1 actividad/);
  assert.match(report(rows,{...CUTS[4],time:'19:30'},'2026-09-16','Jojutla','2026-09-17T01:30:00Z').instruction,/Hay 2 actividades/);
});

test('empty catalog and rounded 100 percent do not claim completion', () => {
  const empty=report([],CUTS[3],'2026-09-16','Jojutla','2026-09-16T23:00:00Z');
  assert.match(message(empty),/sin datos/);
  const snapshot=report([
    {area_name:'Caja',weight:1000,done:true,routine_block:'operacion'},
    {area_name:'Caja',weight:1,done:false,routine_block:'operacion'},
  ],CUTS[3],'2026-09-16','Jojutla','2026-09-16T23:00:00Z');
  assert.equal(snapshot.overall_score,100);
  assert.match(snapshot.instruction,/Quedan actividades/);
});

test('classification preserves checks and weights and is idempotent', async () => {
  const {PGlite}=require('@electric-sql/pglite');
  const db=new PGlite();
  const sql=async(parts,...values)=>(await db.query(parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,''),values)).rows;
  try {
    await db.exec(`CREATE TABLE areas(id int,code text);
      CREATE TABLE activities(id int,area_id int,name text,weight int,routine_block text,active boolean,valid_until date);
      CREATE TABLE activity_checks(activity_id int,done boolean);
      CREATE TABLE checklist_catalog_versions(version text PRIMARY KEY,effective_date date);`);
    const records=classifications(SEED_ACTIVITIES);
    const codes=[...new Set(records.map(r=>r.area_code))];
    for (const [i,code] of codes.entries()) await sql`INSERT INTO areas VALUES(${i},${code})`;
    for (const [i,r] of records.entries()) {
      await sql`INSERT INTO activities VALUES(${i},${codes.indexOf(r.area_code)},${r.name},6,${r.area_code==='supervision'?'operacion':null},true,null)`;
      await sql`INSERT INTO activity_checks VALUES(${i},true)`;
    }
    const migrate=require('../lib/supervision/classification-migration');
    await migrate(sql,SEED_ACTIVITIES);
    await migrate(sql,SEED_ACTIVITIES);
    const result=await sql`SELECT a.id,a.routine_block,a.weight,c.done FROM activities a JOIN activity_checks c ON c.activity_id=a.id ORDER BY a.id`;
    assert.equal(result.length,records.length);
    result.forEach((r,i)=>{assert.equal(r.routine_block,records[i].routine_block);assert.equal(r.weight,6);assert.equal(r.done,true);});
    assert.equal((await sql`SELECT count(*)::int AS n FROM checklist_catalog_versions`)[0].n,1);
  } finally { await db.close(); }
});
