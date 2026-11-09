'use strict';
const START='2026-11-09',MAX=180;
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
function status(date,data){return date<START?'legacy':data.feedback?.closedAt?'closed':'pending';}
function invalidate(data){if(data.feedback?.closedAt)data.feedback={...data.feedback,closedAt:null,closedBy:null};return data;}
function apply(spec,source,command,user,now,date,responsible){
 if(date<START)fail('La retroalimentación aplica desde el 9 de noviembre de 2026.');
 if(!responsible?.id)fail('Asigna al responsable del día antes de registrar la retroalimentación.',409);
 const close=command.action==='feedback-close';
 const fields={};for(const [key,label] of [['observation','observación'],['recommendation','recomendación']]){
  if(typeof command[key]!=='string')fail('Escribe la '+label+'.');
  fields[key]=command[key].trim();
  if(fields[key].length>MAX)fail('La '+label+' admite máximo 180 caracteres.');
  if(close&&!fields[key])fail('Escribe la '+label+' antes de cerrar la evaluación.');
 }
 const points=source.checklistPoints||source.points||{};
 if(close&&!spec.points.some(p=>Object.hasOwn(points,p.id)))fail('Registra al menos una actividad antes de cerrar la evaluación.');
 const stamp=now.toISOString(),data=structuredClone(source);
 data.feedback={...fields,employeeId:responsible.id,employeeName:responsible.name,actor:user.name,at:stamp,closedAt:close?stamp:null,closedBy:close?user.name:null};
 return data;
}
module.exports={START,MAX,status,invalidate,apply};
