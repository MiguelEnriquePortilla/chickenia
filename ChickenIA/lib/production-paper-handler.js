'use strict';
const auth=require('./inventory-auth'),paper=require('./production-paper');
module.exports=async(req,res,queryOverride)=>{
 res.setHeader('Cache-Control','no-store');
 try{
  const user=auth.authenticate(req);
  const query=queryOverride||((s,p)=>require('@neondatabase/serverless').neon(process.env.DATABASE_URL)(s,p));
  const service=paper.service(query);
  if(req.method==='GET'&&req.query.action==='paper-get')return res.status(200).json(await service.get(req.query.date));
  if(req.method==='POST'&&req.query.action==='paper-save'){
   if(!String(req.headers['content-type']||'').startsWith('application/json'))throw Object.assign(Error('Se requiere JSON.'),{status:415});
   if(!req.headers.origin||new URL(req.headers.origin).host!==req.headers.host||req.headers['sec-fetch-site']==='cross-site')throw Object.assign(Error('Origen no permitido.'),{status:403});
   if(user.role!=='manager')throw Object.assign(Error('Sin permiso de captura.'),{status:403});
   if(Buffer.byteLength(JSON.stringify(req.body||{}))>30000)throw Object.assign(Error('Captura demasiado grande.'),{status:413});
   return res.status(200).json(await service.save(req.body,user.name));
  }
  return res.status(405).json({error:'Método no permitido.'});
 }catch(e){return res.status(e.status||400).json({error:e.message});}
};
