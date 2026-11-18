'use strict';
const auth=require('../lib/inventory-auth');
const domain=require('../lib/payroll');
function createHandler(query,initialize=async()=>{}){
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
   const week=domain.monday(req.query?.week);
   await initialize();
   await query(`CREATE TABLE IF NOT EXISTS payroll_weeks (week date PRIMARY KEY, rows jsonb NOT NULL, revision integer NOT NULL DEFAULT 1, approved_by text, approved_at timestamptz, updated_by text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`,[]);
   await query('ALTER TABLE payroll_weeks ADD COLUMN IF NOT EXISTS ready_by text',[]);
   const [existing]=await query('SELECT * FROM payroll_weeks WHERE week=$1',[week]);
   const people=await query('SELECT id,name FROM employees WHERE active=true ORDER BY order_index',[]);
   let effectiveRows=existing?.rows,suggested=false;
    if(!existing?.approved_by){
     const marks=await query(`SELECT DISTINCT a.employee_id, (a.check_date-$1::date)::integer AS day FROM attendance_checks a JOIN locations l ON l.id=a.location_id WHERE l.code='jojutla' AND a.check_date BETWEEN $1::date AND $1::date+6 AND a.entrada IS NOT NULL`,[week]);
     if(!effectiveRows)effectiveRows=people.map(p=>({...p,fullTime:false,meal:'',bonus:domain.key(p.name)==='nancy'?1000:0,discount:0,reason:'',days:Array(7).fill('')}));
     effectiveRows=effectiveRows.map(row=>({...row,days:row.days.map((d,i)=>{if(!d&&marks.some(m=>m.employee_id===row.id&&m.day===i)){suggested=true;return 'A';}return d;})}));
    }
   if(req.method==='GET'){
    const rows=effectiveRows;
    const visible=req.query?.view==='attendance'?rows.map(({id,name,days,fullTime,meal})=>({id,name,days,fullTime,meal})):rows.map(domain.withRates);
    return res.status(200).json({week,rows:visible,suggested,revision:existing?.revision||0,approvedBy:existing?.approved_by||null,approvedAt:existing?.approved_at||null,readyBy:existing?.ready_by||null,user:user.name});
   }
   const body=req.body||{},action=body.action||'save';
   if(!['save','attendance','adjustment','ready','approve','reopen'].includes(action))return res.status(400).json({error:'Acción inválida.'});
   if(['approve','reopen'].includes(action)&&user.name!=='LILIAN')return res.status(403).json({error:'Solo Lilian puede autorizar o reabrir la nómina.'});
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
   const approved=action==='approve'?user.name:null;
   let result;
   if(existing){
    const ready=action==='ready'?user.name:action==='approve'?existing.ready_by:null;
    result=await query(`UPDATE payroll_weeks SET rows=$2::jsonb,revision=revision+1,approved_by=$3,approved_at=CASE WHEN $3::text IS NULL THEN NULL ELSE now() END,updated_by=$4,updated_at=now(),ready_by=$6 WHERE week=$1 AND revision=$5 RETURNING revision`,[week,JSON.stringify(rows),approved,user.name,body.revision,ready]);
   }else{
    result=await query(`INSERT INTO payroll_weeks(week,rows,updated_by) VALUES($1,$2::jsonb,$3) ON CONFLICT DO NOTHING RETURNING revision`,[week,JSON.stringify(rows),user.name]);
   }
   if(!result.length)return res.status(409).json({error:'La semana cambió. Recarga antes de guardar.'});
   return res.status(200).json({ok:true,revision:result[0].revision});
  }catch(e){return res.status(e.status||400).json({error:e.message});}
 };
}
let handler;
module.exports=async(req,res)=>{
 if(!handler){const query=(s,p)=>require('@neondatabase/serverless').neon(process.env.DATABASE_URL)(s,p);handler=createHandler(query,()=>require('../lib/supervision/db').ensureTables());}
 return handler(req,res);
};
module.exports.createHandler=createHandler;
