'use strict';
const {PGlite}=require('@electric-sql/pglite');
async function fixture(){
 const db=new PGlite(),sql=async(parts,...values)=>(await db.query(parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,''),values)).rows;
 await db.exec(`CREATE TABLE locations(id int primary key,code text,name text,type text);INSERT INTO locations VALUES(1,'jojutla','Jojutla','tienda'),(2,'moto','Móvil','moto');
 CREATE TABLE areas(id int primary key,code text,name text,location_type text,active boolean default true,order_index int);
 INSERT INTO areas VALUES(1,'cocina','Cocina','tienda',true,1),(2,'ventas_barras','Ventas / Barras','tienda',true,2),(3,'caja','Caja','tienda',true,3);
 CREATE TABLE activities(id serial primary key,area_id int,name text,weight int default 3,criticality text default 'media',routine_block text,measurement text,active boolean default true,frequency text default 'daily',valid_from date,valid_until date,order_index int default 1,requires_quantity boolean default false,unit text,target text,indicator_type text);
 CREATE TABLE kitchen_plans(activity_id int,plan_date date,kg numeric);
 CREATE TABLE activity_checks(activity_id int,location_id int,check_date date,done boolean,quality_score int,quantity numeric,notes text,checked_by text,checked_at timestamptz,closure jsonb,UNIQUE(activity_id,location_id,check_date));`);
 const rows=[['Preparar cocina',1,'apertura',null],['Cierre cocina',1,'cierre',null],['Mantener productos hidratados todo el día, incluyendo ensaladas',2,'operacion','percentage'],['Fondo de caja',3,'apertura',null],['Cierre caja',3,'cierre',null]];
 for(const [name,area,block,measurement] of rows)await sql`INSERT INTO activities(name,area_id,routine_block,measurement) VALUES(${name},${area},${block},${measurement})`;
 await require('../lib/supervision/checklist-timeline-store').migrate(sql);
 return {db,sql};
}
module.exports={fixture};
