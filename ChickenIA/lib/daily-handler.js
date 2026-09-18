'use strict';
const auth=require('./inventory-auth');
const cash=require('./cash-close'),production=require('./production-daily');
function fail(message,status){throw Object.assign(Error(message),{status});}
module.exports=async function dailyHandler(req,res,queryOverride){
  res.setHeader('Cache-Control','no-store');
  try{
    if(!['GET','POST'].includes(req.method))fail('Método no permitido.',405);
    const user=auth.authenticate(req);
    if(!['manager','kitchen','processor'].includes(user.role))fail('Sin permiso de captura.',403);
    if(req.method==='POST'){
      if(!String(req.headers['content-type']||'').startsWith('application/json'))fail('Se requiere JSON.',415);
      let origin;try{origin=new URL(req.headers.origin);}catch{fail('Origen requerido.',403);}
      if(origin.host!==req.headers.host||req.headers['sec-fetch-site']==='cross-site')fail('Origen no permitido.',403);
      if(Buffer.byteLength(JSON.stringify(req.body||{}))>100000)fail('Captura demasiado grande.',413);
    }
    const action=req.query?.action;
    const mode=req.method==='GET'?req.query?.mode:req.body?.mode;
    if(action!=='daily-overview'&&!['close','production'].includes(mode))fail('Captura inválida.',400);
    if(action!=='daily-overview'&&mode==='close'&&user.role!=='manager')fail('El cierre financiero requiere Supervisión.',403);
    const actor={...user,business:'chicanito',environment:'production',canWrite:true};
    const query=queryOverride||((s,p)=>require('@neondatabase/serverless').neon(process.env.DATABASE_URL)(s,p));
    if(action==='daily-overview'&&req.method==='GET'){
      const date=req.query.date;
      const p=await production.service(query,actor).get(date);
      const c=user.role==='manager'?await cash.cashService(query,actor).get(date):null;
      return res.status(200).json({date,location:'Jojutla Mercado',cash:c,production:p});
    }
    const domain=mode==='close'?cash:production;
    if(action==='daily-calculate'&&req.method==='POST')return res.status(200).json({totals:domain.calculate(req.body.data)});
    const service=mode==='close'?cash.cashService(query,actor):production.service(query,actor);
    if(action==='daily-get'&&req.method==='GET')return res.status(200).json(await service.get(req.query.date));
    if(action==='daily-save'&&req.method==='POST')return res.status(200).json(await service.save(req.body));
    fail('Acción o método no permitido.',405);
  }catch(e){return res.status(e.status|| (e.name==='ZodError'?400:500)).json({error:e.status?e.message:e.name==='ZodError'?'Revisa los datos: cantidades válidas y campos completos.':'No se pudo recuperar o guardar la captura. Conserva los datos y reintenta.'});}
};
