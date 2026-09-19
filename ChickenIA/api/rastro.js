'use strict';
const auth=require('../lib/inventory-auth'),domain=require('../lib/rastro');
function createHandler(connect){return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');let db;
  try{
    const user=auth.authenticate(req);
    if(!['manager','processor','dispatch'].includes(user.role))throw Object.assign(Error('Sin permiso para Inventario de Rastro.'),{status:403});
    if(!['GET','POST'].includes(req.method))throw Object.assign(Error('Método no permitido.'),{status:405});
    if(req.method==='POST'){
      let origin;try{origin=new URL(req.headers.origin);}catch{}
      if(!origin||origin.host!==req.headers.host||req.headers['sec-fetch-site']==='cross-site')throw Object.assign(Error('Origen no permitido.'),{status:403});
      if(!String(req.headers['content-type']||'').startsWith('application/json')||Buffer.byteLength(JSON.stringify(req.body||{}))>20000)throw Object.assign(Error('Solicitud inválida.'),{status:400});
    }
    db=await connect();const query=async(s,p)=>(await db.query(s,p)).rows;
    await query('BEGIN ISOLATION LEVEL READ COMMITTED');
    if(req.method==='GET')await query("SELECT id FROM locations WHERE code='rastro' FOR SHARE");
    const result=req.method==='GET'?await domain.read(query,req.query.date):await domain.save(query,req.body,user);
    await query('COMMIT');return res.status(200).json(result);
  }catch(e){if(db)await db.query('ROLLBACK').catch(()=>{});return res.status(e.status||(e.name==='ZodError'?400:500)).json({error:e.status?e.message:e.name==='ZodError'?'Revisa fecha y cantidades.':'No se pudo guardar. Conserva los datos y recarga para comprobar el estado.'});}
  finally{if(db)db.release();}
};}
let pool;
module.exports=createHandler(async()=>{pool??=new(require('@neondatabase/serverless').Pool)({connectionString:process.env.DATABASE_URL});return pool.connect();});
module.exports.createHandler=createHandler;
