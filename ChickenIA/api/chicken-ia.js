'use strict';
const auth=require('../lib/inventory-auth');
const {InventoryError}=require('../lib/inventory-domain');
const {parse,answer}=require('../lib/chicken-query');
function createHandler(query=(sql,params)=>require('@neondatabase/serverless').neon(process.env.DATABASE_URL)(sql,params),authenticate=auth.authenticate){
  return async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    try{
      if(req.method!=='GET'){res.setHeader('Allow','GET');throw new InventoryError('Solo consultas.',405);}
      const user=authenticate(req);
      if(!['miguel','lilian'].includes(user.id))throw new InventoryError('Este piloto está disponible para Miguel y Lilian.',403);
      if(req.query.action==='session')return res.status(200).json({user});
      return res.status(200).json(await answer(parse(req.query),query));
    }catch(e){return res.status(e.status||500).json({error:e.status?e.message:'No se pudo consultar la fuente. Reintenta en un momento.'});}
  };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
