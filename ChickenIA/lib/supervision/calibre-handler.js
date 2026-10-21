'use strict';
const core=require('./calibre'),auth=require('../inventory-auth');
function createHandler(override,clock=()=>new Date()){
 let migration;
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   if(!['GET','POST'].includes(req.method))core.fail('Método no permitido.',405);
   const user=auth.authenticate(req);if(user.role!=='manager')core.fail('Supervisión verifica estos resultados.',403);
   if(req.method==='POST'){
    let origin;try{origin=new URL(req.headers.origin);}catch{}
    if(!origin||origin.host!==req.headers.host||req.headers['sec-fetch-site']==='cross-site')core.fail('Origen no permitido.',403);
    if(!String(req.headers['content-type']||'').startsWith('application/json'))core.fail('Se requiere JSON.',415);
    if(Buffer.byteLength(JSON.stringify(req.body||{}))>30000)core.fail('La captura es demasiado grande.',413);
   }
   const date=req.method==='GET'?req.query.date:req.body?.date;
   if(!core.dateOK(date))core.fail('Elige una fecha válida.');
   const query=override||((s,p)=>require('@neondatabase/serverless').neon(process.env.DATABASE_URL)(s,p));
   const [loc]=await query("SELECT id,name FROM locations WHERE code='jojutla' AND type='tienda'",[]);if(!loc)core.fail('No se encontró la sucursal Jojutla.',404);
   const service=require('./calibre-store').store(query);
   if(!migration)migration=service.migrate().catch(e=>{migration=null;throw e;});await migration;
   const now=clock();
   if(req.method==='POST'&&req.body.action==='report')return res.status(200).json(await service.saveReport(loc.id,date,req.body.scope,req.body.kind,user,now));
   const view=req.method==='GET'?await service.get(loc.id,date,now):await service.save(loc.id,date,req.body,user,now);
   return res.status(200).json({...view,actor:user.name,location:loc});
  }catch(e){return res.status(e.status||(e.name==='ZodError'?400:500)).json({error:e.status?e.message:e.name==='ZodError'?'Revisa los campos y cantidades antes de guardar.':'No se pudo guardar o consultar. Conserva tu captura y reintenta.'});}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
