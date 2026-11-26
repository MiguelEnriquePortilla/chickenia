'use strict';
const core=require('./calibre');

const CUTOVER='2026-11-25';
const SHEET='1wt9X9si6vuDK9Q1HX43BdHgOzuH5zrU5tBO0DjyBjG4';
const TAB=2601;
const NORMAL='Jojutla';
const TEST='PRUEBA - Jojutla';
const isAssignment=event=>event.kind==='assign'||event.kind==='reassign';
const isRevision=event=>event.kind==='revision'||event.kind==='reassign';
const format=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Mexico_City',dateStyle:'short',timeStyle:'medium'});
const sheets=require('../google-sheets').bind(null,SHEET);

function store(call=sheets){
 const employees=require('./db').SEED_EMPLOYEES.map((name,index)=>({id:index+1,name,active:true}));
 const location={id:1,name:NORMAL};

 async function read(mode){
  const sheet=await call('/values/'+encodeURIComponent('Revisiones!A2:M'));
  return (sheet.values||[]).filter(row=>row[2]===mode&&row[12]).map(row=>JSON.parse(row[12]));
 }

 async function append(mode,date,area,id,kind,activity,result,note,user,now,event,locks=[]){
  const key='cc_'+(mode===TEST?'test_':'')+date.replaceAll('-','_')+'_';
  const requests=locks.map(lock=>({addNamedRange:{namedRange:{name:key+lock,range:{sheetId:TAB,startRowIndex:0,endRowIndex:1,startColumnIndex:0,endColumnIndex:1}}}}));
  const values=[key+id,date,mode,area,core.VERSION,activity,result,note,event.responsible?.name||'',user.name,format.format(now),event.revision>1?key+area+'_v'+(event.revision-1):'',JSON.stringify({...event,date,area,kind,at:now.toISOString()})];
  requests.push({appendCells:{sheetId:TAB,rows:[{values:values.map(value=>({userEnteredValue:{stringValue:String(value)}}))}],fields:'userEnteredValue'}});
  try{await call(':batchUpdate',{requests});}catch(error){
   if(error.http===400&&locks.length){
    const events=await read(mode);
    if(events.some(e=>e.date===date&&locks.some(lock=>e.locks?.includes(lock))))core.fail('Otra persona actualizó esta revisión. Recarga y vuelve a intentar.',409);
   }
   throw error;
  }
 }

 function model(events,date,now){
  const revisions=new Map(),assigned=new Map();
  for(const event of events){
   const key=event.date+'/'+event.area;
   if(isAssignment(event))assigned.set(key,event.responsible);
   if(isRevision(event))revisions.set(key,event);
  }
  const rowsFor=day=>core.AREAS.map(spec=>{
   const event=revisions.get(day+'/'+spec.code),responsible=assigned.get(day+'/'+spec.code)||null;
   return {spec:event?.spec||spec,data:event?.data||core.blank(),revision:event?.revision||0,responsible};
  });
  const week=core.weekDates(date);
  const days=week.map(day=>rowsFor(day));
  const seen=[...revisions.values()].filter(e=>e.date<=date).sort((a,b)=>b.date.localeCompare(a.date));
  return {date,location,version:core.VERSION,assignmentStart:CUTOVER,feedbackStart:core.feedback.START,employees,
   assignments:rowsFor(date).filter(r=>r.responsible).map(r=>({...r.responsible,area:r.spec.code})),areas:rowsFor(date),
   canWrite:date===core.day(now),history:events.filter(e=>e.kind==='report'&&e.date<=date).reverse().slice(0,100),
   checklistHistory:seen.map(e=>({date:e.date,area:e.area,spec:e.spec,points:e.data.checklistPoints||e.data.points})),
   weekly:{dates:week,areas:core.AREAS.map((spec,i)=>({code:spec.code,name:spec.name,days:days.map((rows,j)=>{
    const row=rows[i];
    return {date:week[j],...core.checklistScore(row.spec,row.data),spec:row.spec,points:row.data.checklistPoints||row.data.points,
     extras:core.simpleExtras(row.data),feedback:row.data.feedback||null,feedbackStatus:core.feedback.status(week[j],row.data),responsible:row.responsible};
   })}))}};
 }

 return async function handle(req,date,user,now){
  const test=(req.method==='GET'?req.query?.test:req.body?.test)==='1';
  if(test&&user.name!=='MIGUEL')core.fail('Prueba disponible para Dirección.',403);
  const mode=test?TEST:NORMAL;
  const events=await read(mode);
  const view=model(events,date,now);
  if(req.method==='GET'){
   if(req.query.person){
    const id=Number(req.query.person),{from,to}=req.query;
    if(!core.dateOK(from)||!core.dateOK(to)||from>to||Date.parse(to)-Date.parse(from)>366*86400000)core.fail('Elige un periodo válido de hasta un año.');
    const person=employees.find(e=>e.id===id);if(!person)core.fail('Persona desconocida.',404);
    const assignments=new Map();
    for(const event of events.filter(e=>isAssignment(e)&&e.date>=from&&e.date<=to))assignments.set(event.date+'/'+event.area,event);
    const entries=[...assignments.values()].filter(e=>e.responsible.id===id).map(e=>{
     const last=events.findLast(r=>isRevision(r)&&r.date===e.date&&r.area===e.area);
     const spec=last?.spec||core.AREAS.find(a=>a.code===e.area),data=last?.data||core.blank();
     return {date:e.date,area:e.area,areaName:spec.name,assignedBy:e.responsible.actor,assignedAt:e.at,
      ...core.checklistScore(spec,data),points:data.checklistPoints||data.points,extras:core.simpleExtras(data),
      feedback:data.feedback||null,feedbackStatus:core.feedback.status(e.date,data),spec};
    }).reverse();
    const scored=entries.filter(e=>e.score!==null);
    return {person,from,to,entries,evaluated:scored.length,average:scored.length?scored.reduce((n,e)=>n+e.score,0)/scored.length:null};
   }
   return view;
  }
  const body=req.body;
  if(body.action==='report'){
   if(body.kind!=='simple')core.fail('Tipo de reporte inválido.');
   const rows=view.areas.filter(r=>body.scope==='general'||r.spec.code===body.scope);
   if(!rows.some(r=>r.revision))core.fail('Primero registra el avance del área.');
   const message=core.simpleReport(rows,date);
   await append(mode,date,body.scope,'report_'+now.getTime(),'report','reporte','Preparado','',user,now,{scope:body.scope,message});
   return {message,created_at:now.toISOString()};
  }
  if(!view.canWrite)core.fail('El histórico se conserva. Solo puedes registrar el día actual.',409);
  const row=view.areas.find(r=>r.spec.code===body.area);if(!row)core.fail('Área desconocida.');
  if(body.action==='assign'||body.action==='reassign'){
   const employee=employees.find(e=>e.id===body.employeeId);if(!employee)core.fail('Selecciona una persona activa.');
   const correction=body.action==='reassign';
   const reason=typeof body.reason==='string'?body.reason.trim():'';
   const previous=row.responsible;
   if(correction&&(!reason||reason.length>240))core.fail('Escribe un motivo de 1 a 240 caracteres.');
   if(previous?.id===employee.id){
    const last=events.findLast(e=>e.date===date&&e.area===body.area&&isAssignment(e));
    if(!correction||(last?.previous?.id===body.previousId&&last.reason===reason))return view;
    core.fail('Selecciona una persona distinta a la actual.');
   }
   if(correction&&(!previous||previous.id!==body.previousId||row.revision!==body.revision))core.fail('La asignación o revisión cambió. Recarga antes de corregir.',409);
   if((!correction&&previous)||view.assignments.some(a=>a.id===employee.id))core.fail('La persona o el área ya tiene una asignación para hoy.',409);
   const responsible={id:employee.id,name:employee.name,actor:user.name,assigned_at:now.toISOString()};
   const assignmentId='asignacion_'+(1+events.filter(e=>e.date===date&&isAssignment(e)).length);
   const locks=[assignmentId];
   if(correction){
    const revision=row.revision+1,id=body.area+'_v'+revision;
    locks.push(id);
    const data=structuredClone(row.data);
    delete data.feedback;
    await append(mode,date,body.area,id,'reassign','responsable','Corregido',previous.name+' → '+employee.name+' · '+reason,user,now,
     {revision,spec:row.spec,data,responsible,previous,reason,locks},locks);
   }else{
    await append(mode,date,body.area,assignmentId,'assign','responsable','Asignado','',user,now,{responsible,locks},locks);
   }
  }else{
   if(!row.responsible)core.fail('Asigna al responsable de hoy antes de evaluar.',409);
   if(body.revision!==row.revision)core.fail('Alguien actualizó esta área. Recarga antes de guardar.',409);
   const command=body.command||{};
   if(!['simple-point','simple-extra','feedback-save','feedback-close'].includes(command.action))core.fail('Actividad de supervisión desconocida.');
   const data=core.apply(row.spec,row.data,command,user,now,date,row.responsible);
   const revision=row.revision+1,id=body.area+'_v'+revision;
   const activity=command.point||(command.action==='simple-extra'?'extra-'+(command.choice+1):command.action);
   const note=command.note||[command.observation,command.recommendation].filter(Boolean).join(' / ');
   const result=typeof command.done==='boolean'?(command.done?'Verificada':'Pendiente'):command.action==='feedback-close'?'Cerrada':'Borrador';
   await append(mode,date,body.area,id,'revision',activity,result,note,user,now,{revision,spec:row.spec,data,responsible:row.responsible,locks:[id]},[id]);
  }
  return model(await read(mode),date,now);
 };
}
module.exports={store,CUTOVER};
