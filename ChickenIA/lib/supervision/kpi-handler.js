'use strict';
const auth=require('../inventory-auth'),kpi=require('./kpi'),catalog=require('./kpi-catalog');
function createHandler(queryOverride,clock=()=>new Date()){
 let migration;
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{
   if(!['GET','POST'].includes(req.method))kpi.fail('Método no permitido.',405);
   const user=auth.authenticate(req);
   if(user.role!=='manager')kpi.fail('La verificación de indicadores requiere Supervisión.',403);
   if(req.method==='POST'){
    let origin;try{origin=new URL(req.headers.origin);}catch{}
    if(!origin||origin.host!==req.headers.host||req.headers['sec-fetch-site']==='cross-site')kpi.fail('Origen no permitido.',403);
    if(!String(req.headers['content-type']||'').startsWith('application/json'))kpi.fail('Se requiere JSON.',415);
    if(Buffer.byteLength(JSON.stringify(req.body||{}))>100000)kpi.fail('Captura demasiado grande.',413);
   }
   const date=req.method==='GET'?req.query.date:req.body?.date;
   if(!kpi.validDate(date))kpi.fail('Fecha inválida.');
   const query=queryOverride||((s,p)=>require('@neondatabase/serverless').neon(process.env.DATABASE_URL)(s,p));
   const location=Number(req.query.location_id||1);
   // Daily production and cash currently belong to Jojutla only. Never attribute them to another site.
   const [loc]=await query("SELECT id,name FROM locations WHERE id=$1 AND code='jojutla' AND type='tienda'",[location]);
   if(!loc)kpi.fail('Estos controles están habilitados para Jojutla. Móvil requiere configurar sus horarios.',400);
   const service=require('./kpi-store').store(query);
   if(!migration)migration=service.migrate().catch(e=>{migration=null;throw e;});
   await migration;
   const now=clock();
   if(req.method==='POST')return res.status(200).json(await service.save(location,req.body,user,now));
   return res.status(200).json({...await service.get(location,date,now),catalog,location:loc,serverTime:now.toISOString(),actor:user.name});
  }catch(e){return res.status(e.status||(e.name==='ZodError'?400:500)).json({error:e.status?e.message:e.name==='ZodError'?'Revisa las cantidades y campos de la verificación.':'No se pudieron recuperar o guardar los indicadores. Conserva la captura y reintenta.'});}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
