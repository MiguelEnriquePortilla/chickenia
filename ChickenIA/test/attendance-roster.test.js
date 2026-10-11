'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {migrate}=require('../lib/supervision/attendance-roster');
test('roster replaces active names once, preserving employee IDs and attendance history',async()=>{
 const {PGlite}=require('@electric-sql/pglite'),db=new PGlite();
 const sql=async(parts,...values)=>(await db.query(parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,''),values)).rows;
 try{
  await db.exec(`CREATE TABLE employees(id SERIAL PRIMARY KEY,name TEXT UNIQUE NOT NULL,active BOOLEAN DEFAULT true,order_index INT);
   INSERT INTO employees(name,order_index) VALUES ('Herman Melo',9),('Rocío Mata',10),('Nancy Rentería',12);
   CREATE TABLE attendance_checks(employee_id INT REFERENCES employees(id),entrada TIMESTAMPTZ);
   INSERT INTO attendance_checks VALUES(1,'2026-10-10T09:00:00-06:00'),(2,'2026-10-10T09:15:00-06:00');`);
  const before=(await db.query('SELECT * FROM attendance_checks ORDER BY employee_id')).rows;
  await migrate(sql);await migrate(sql);
  assert.deepEqual((await db.query('SELECT name FROM employees WHERE active ORDER BY order_index')).rows.map(r=>r.name),['Diana','Silvia Najera','Nancy Rentería']);
  assert.deepEqual((await db.query('SELECT * FROM attendance_checks ORDER BY employee_id')).rows,before);
  assert.deepEqual((await db.query('SELECT id,active FROM employees WHERE id IN (1,2) ORDER BY id')).rows,[{id:1,active:false},{id:2,active:false}]);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM employees')).rows[0].n,5);
  await db.exec("UPDATE employees SET active=false WHERE name='Diana'");await migrate(sql);
  assert.equal((await db.query("SELECT active FROM employees WHERE name='Diana'")).rows[0].active,false);
 }finally{await db.close();}
});
