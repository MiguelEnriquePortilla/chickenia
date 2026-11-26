'use strict';
const auth=require('../lib/inventory-auth');
const domain=require('../lib/payroll');
function createHandler(store){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  try{
   const user=auth.authenticate(req);
   if(!['NANCY','LILIAN','MIGUEL','ANA'].includes(user.name))return res.status(403).json({error:'Acceso no permitido.'});
   if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Método no permitido.'});
   if(req.method==='POST'){
    if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).json({error:'Se requiere JSON.'});
    if(req.headers['sec-fetch-site']==='cross-site'||req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return res.status(403).json({error:'Origen no permitido.'});
    if(Buffer.byteLength(JSON.stringify(req.body||{}))>100000)return res.status(413).json({error:'Demasiados datos.'});
   }
   const body=req.body||{},action=body.action||'save';
   const attendanceView=req.query?.view==='attendance';
   if(req.method==='POST'&&action==='unlock'){
    res.setHeader('Set-Cookie',auth.unlockPayroll(req,user));
    return res.status(200).json({ok:true});
   }
   if(req.method==='GET'?!attendanceView:action!=='attendance')auth.requirePayroll(req,user);
   const week=domain.monday(req.query?.week);
   const test=req.query?.test==='1';
   if(!test&&week<'2026-11-23')return res.status(409).json({error:'El historial anterior al 23 de noviembre está pendiente de importar.'});
   const {existing,people,marks=[]}=await store.load(week,test);
   let effectiveRows=existing?.rows,suggested=false;
   if(!existing?.approved_by){
    if(!effectiveRows)effectiveRows=people.map(p=>({...p,fullTime:false,meal:'',bonus:domain.key(p.name)==='nancy'?1000:0,discount:0,reason:'',days:Array(7).fill('')}));
    effectiveRows=effectiveRows.map(row=>({...row,days:row.days.map((d,i)=>{if(!d&&marks.some(m=>m.employee_id===row.id&&m.day===i)){suggested=true;return 'A';}return d;})}));
   }
   if(req.method==='GET'){
    const rows=effectiveRows;
    const visible=attendanceView?rows.map(({id,name,days,fullTime,meal})=>({id,name,days,fullTime,meal})):rows.map(domain.withRates);
    return res.status(200).json({week,rows:visible,suggested,revision:existing?.revision||0,approvedBy:existing?.approved_by||null,approvedAt:existing?.approved_at||null,readyBy:existing?.ready_by||null,user:user.name});
   }
   if(!['save','attendance','adjustment','ready','approve','reopen'].includes(action))return res.status(400).json({error:'Acción inválida.'});
   if(existing?.approved_by&&action!=='reopen')return res.status(409).json({error:'Nómina autorizada. Lilian debe reabrirla antes de editar.'});
   if(action==='approve'&&!existing?.ready_by)return res.status(400).json({error:'Deja la nómina lista para revisión antes de autorizar.'});
   if(body.revision!==(existing?.revision||0))return res.status(409).json({error:'Otra persona actualizó esta semana. Recarga antes de guardar.'});
   let rows;
   if(action==='save'){
    if(!Array.isArray(body.rows))throw Error('Lista de personal inválida.');
    const roster=existing?.rows||people;
    if(body.rows.length!==roster.length)throw Error('La lista de personal cambió; recarga la semana.');
    rows=body.rows.map(r=>{const p=roster.find(p=>p.id===r.id);if(!p)throw Error('Empleado inválido.');return {id:p.id,name:p.name,days:r.days,fullTime:r.fullTime,meal:r.meal,bonus:r.bonus,discount:r.discount,reason:r.reason};});
    domain.validateWeek(rows,{complete:false});
   }else if(['attendance','adjustment'].includes(action)){
    rows=structuredClone(effectiveRows);
    const row=rows.find(r=>r.id===body.employeeId);if(!row)throw Error('Empleado inválido.');
    if(action==='attendance'){
     if(body.fullTime!==undefined){
      if(typeof body.fullTime!=='boolean'||!['petra','maricruz'].includes(domain.key(row.name)))throw Error('Selección de cajera inválida.');
      if(body.fullTime)rows.forEach(r=>r.fullTime=r.id===row.id);else row.fullTime=false;
     }
     if(body.day!==undefined){if(!Number.isInteger(body.day)||body.day<0||body.day>6||!domain.STATES.includes(body.status))throw Error('Marca un estado válido para ese día.');row.days[body.day]=body.status;}
     if(body.meal!==undefined)row.meal=body.meal;
    }else{row.bonus=body.bonus;row.discount=body.discount;row.reason=body.reason;}
    domain.validateWeek(rows,{complete:false});
   }else{
    if(!existing)return res.status(400).json({error:'Guarda la semana primero.'});
    rows=effectiveRows;domain.validateWeek(rows,{complete:['approve','ready'].includes(action)});
   }
   const revision=body.revision+1;
   const record={
    week,rows,revision,approved_by:action==='approve'?user.name:null,
    approved_at:action==='approve'?new Date().toISOString():null,
    ready_by:action==='ready'?user.name:action==='approve'?existing.ready_by:null,
    updated_by:user.name,updated_at:new Date().toISOString(),action
   };
   if(!await store.save(record,test))return res.status(409).json({error:'La semana cambió. Recarga antes de guardar.'});
   return res.status(200).json({ok:true,revision});
  }catch(e){return res.status(e.status||(e.http?503:400)).json({error:e.http?'No se pudo acceder a Google Sheets. Reintenta.':e.message});}
 };
}
module.exports=createHandler(require('../lib/payroll-sheets').createStore());
module.exports.createHandler=createHandler;
