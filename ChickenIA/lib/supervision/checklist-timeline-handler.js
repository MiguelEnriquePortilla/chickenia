'use strict';
function createHandler(clock=()=>new Date()){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 try{
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Método no permitido'});
  let user;
  if(req.method==='POST'){
   user=require('../inventory-auth').authenticate(req);
   if(user.role!=='manager')return res.status(403).json({error:'Solo gerencia puede registrar días sin operación.'});
   let origin;try{origin=new URL(req.headers.origin);}catch{}
   if(!origin||origin.host!==req.headers.host||req.headers['sec-fetch-site']==='cross-site')return res.status(403).json({error:'Origen no permitido.'});
   if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).json({error:'Se requiere JSON.'});
   if(typeof req.body?.closed!=='boolean'||typeof req.body?.reason!=='string'||req.body.reason.trim().length<3||req.body.reason.length>300)return res.status(400).json({error:'Escribe un motivo de 3 a 300 caracteres.'});
  }
  const {date,location_id}=req.query;
  if(!require('./kpi').validDate(date)||!/^\d+$/.test(String(location_id)))return res.status(400).json({error:'Fecha o ubicación inválida'});
  const sql=await require('./db').ensureTables();
  const [loc]=await sql`SELECT id,name,type FROM locations WHERE id=${location_id}`;
  if(!loc||loc.type!=='tienda')return res.status(400).json({error:'Los cortes están disponibles para Sucursal.'});
  if(req.method==='POST')await require('./checklist-timeline-store').setClosed(sql,loc.id,date,req.body.closed,req.body.reason.trim(),user.name);
  return res.status(200).json(await require('./checklist-timeline-store').get(sql,loc.id,date,clock(req)));
 }catch(e){return res.status(e.status||500).json({error:e.status?e.message:'No se pudo cargar el historial de cortes. Reintenta.'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
