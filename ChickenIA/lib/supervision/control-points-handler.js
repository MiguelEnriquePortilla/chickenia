'use strict';
const core=require('./control-points');
async function migrate(sql){
 await sql`CREATE TABLE IF NOT EXISTS supervision_point_settings(location_id INT PRIMARY KEY REFERENCES locations(id),start_date DATE NOT NULL)`;
 await sql`CREATE TABLE IF NOT EXISTS supervision_point_days(location_id INT NOT NULL REFERENCES locations(id),date DATE NOT NULL,catalog JSONB NOT NULL,revision INT NOT NULL DEFAULT 0,created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(location_id,date))`;
 await sql`CREATE TABLE IF NOT EXISTS supervision_point_events(id BIGSERIAL PRIMARY KEY,location_id INT NOT NULL,date DATE NOT NULL,cut_index INT NOT NULL,point_id TEXT NOT NULL,done BOOLEAN NOT NULL,actor TEXT NOT NULL,recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp())`;
 await sql`CREATE INDEX IF NOT EXISTS supervision_point_events_day ON supervision_point_events(location_id,date,id)`;
}
function createHandler({clock=()=>new Date(),authenticate=req=>require('../inventory-auth').authenticate(req),getSql=()=>require('./db').ensureTables()}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{
   if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Método no permitido.'});
   const user=authenticate(req),now=clock();
   const {date,location_id}=req.query||{};
   if(!require('./kpi').validDate(date)||!/^\d+$/.test(String(location_id)))return res.status(400).json({error:'Fecha o ubicación inválida.'});
   if(req.method==='POST'){
    if(user.role!=='manager')return res.status(403).json({error:'Solo Supervisión puede palomear.'});
    let origin;try{origin=new URL(req.headers.origin);}catch{}
    if(origin?.host!==req.headers.host||req.headers['sec-fetch-site']==='cross-site')return res.status(403).json({error:'Origen no permitido.'});
    if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).json({error:'Formato inválido.'});
   }
   const sql=await getSql();
   const [loc]=await sql`SELECT id,name,type FROM locations WHERE id=${location_id}`;
   if(loc?.type!=='tienda')return res.status(400).json({error:'Disponible para Sucursal.'});
   await migrate(sql);
   await sql`INSERT INTO supervision_point_settings(location_id,start_date) VALUES(${loc.id},${core.START}::date) ON CONFLICT DO NOTHING`;
   await sql`UPDATE supervision_point_settings SET start_date=${core.START}::date WHERE location_id=${loc.id} AND start_date<${core.START}::date`;
   const [settings]=await sql`SELECT start_date::text FROM supervision_point_settings WHERE location_id=${loc.id}`;
   if(date===core.day(now))await sql`INSERT INTO supervision_point_days(location_id,date,catalog) VALUES(${loc.id},${date}::date,${JSON.stringify(core.catalog)}::jsonb) ON CONFLICT DO NOTHING`;
   let [row]=await sql`SELECT catalog,revision FROM supervision_point_days WHERE location_id=${loc.id} AND date=${date}::date`;
   if(!row)return res.status(200).json({missing:true,date});
   if(req.method==='POST'){
    const b=req.body||{};core.validate(b,date,row.catalog,clock());
    const changed=await sql`WITH updated AS (UPDATE supervision_point_days SET revision=revision+1 WHERE location_id=${loc.id} AND date=${date}::date AND revision=${b.revision} RETURNING revision)
     INSERT INTO supervision_point_events(location_id,date,cut_index,point_id,done,actor)
     SELECT ${loc.id},${date}::date,${b.cut},${b.point},${b.done},${user.name} FROM updated RETURNING id`;
    if(!changed.length)return res.status(409).json({error:'La revisión cambió. Se actualizó la lista; vuelve a palomear.'});
    [row]=await sql`SELECT catalog,revision FROM supervision_point_days WHERE location_id=${loc.id} AND date=${date}::date`;
   }
   const events=await sql`SELECT id,date::text,cut_index,point_id,done,actor,recorded_at FROM supervision_point_events WHERE location_id=${loc.id} AND date BETWEEN ${date}::date-40 AND ${date}::date ORDER BY id`;
   const days=await sql`SELECT p.date::text,p.catalog,COALESCE(t.closed,false) AS closed FROM supervision_point_days p LEFT JOIN checklist_timeline_days t ON t.location_id=p.location_id AND t.date=p.date WHERE p.location_id=${loc.id} AND p.date BETWEEN ${date}::date-40 AND ${date}::date ORDER BY p.date`;
   return res.status(200).json({date,serverTime:new Date(now).toISOString(),activeCut:core.activeCut(date,row.catalog,now),start:settings.start_date,active:date>=settings.start_date,location:loc,revision:row.revision,actor:user.name,canWrite:user.role==='manager'&&date===core.day(now),cuts:core.evaluate(date,row.catalog,events.filter(e=>e.date===date),now),...core.history(days.map(d=>({...d,active:d.date>=settings.start_date})),events,date,now)});
  }catch(e){return res.status(e.status||500).json({error:e.status?e.message:'No se pudo guardar o cargar la revisión. Reintenta.'});}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;module.exports.migrate=migrate;
