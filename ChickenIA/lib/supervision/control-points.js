'use strict';
const catalog=require('./control-points-catalog.json');
const START='2026-10-12';
const day=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
const at=(date,time)=>new Date(`${date}T${time}:00-06:00`).getTime();
const activeCut=(date,cuts,now)=>date===day(now)?cuts.findIndex(c=>new Date(now).getTime()<at(date,c.time)):-1;
function evaluate(date,cuts,events,now=new Date()){
 const stamp=new Date(now).getTime();
 return cuts.map((cut,index)=>{
  const deadline=at(date,cut.time),passed=stamp>=deadline;
  const latest=new Map(),original=new Map();
  for(const event of [...events].sort((a,b)=>new Date(a.recorded_at)-new Date(b.recorded_at)||Number(a.id)-Number(b.id))){
   if(event.cut_index!==index)continue;
   latest.set(event.point_id,event);
   if(new Date(event.recorded_at).getTime()<=Math.min(stamp,deadline))original.set(event.point_id,event);
  }
  const areas=cut.areas.map(area=>{
   const points=area.points.map(point=>({...point,done:!!latest.get(point.id)?.done,atCut:!!original.get(point.id)?.done}));
   return {...area,points,done:points.filter(p=>passed?p.atCut:p.done).length,total:points.length};
  });
  return {...cut,passed,begun:stamp>=at(date,index?cuts[index-1].time:'00:00'),areas,
   done:areas.reduce((n,a)=>n+a.done,0),total:areas.reduce((n,a)=>n+a.total,0)};
 });
}
function validate(body,date,cuts,now){
 const fail=message=>{throw Object.assign(Error(message),{status:400});};
 if(date!==day(now))fail('Solo puedes palomear el día de hoy.');
 if(!Number.isInteger(body.cut)||!cuts[body.cut]||typeof body.done!=='boolean'||!Number.isSafeInteger(body.revision)||body.revision<0)fail('Revisión inválida.');
 if(body.cut!==activeCut(date,cuts,now))fail('Este horario está cerrado. Solo puedes palomear el horario actual.');
 if(!cuts[body.cut].areas.some(a=>a.points.some(p=>p.id===body.point)))fail('El punto no corresponde a este horario.');
}
function history(days,events,end,now){
 const anchor=new Date(`${end}T12:00:00Z`),week=new Date(anchor);
 week.setUTCDate(week.getUTCDate()-(week.getUTCDay()+6)%7);
 const startWeek=week.toISOString().slice(0,10),startMonth=end.slice(0,7)+'-01';
 const records=days.map(d=>{
  const cuts=evaluate(d.date,d.catalog,events.filter(e=>e.date===d.date),now),final=cuts.every(c=>c.passed);
  return {date:d.date,final,active:d.active!==false,closed:!!d.closed,areas:cuts[0].areas.map(a=>{
   const applicable=cuts.filter(c=>c.passed);
   return {code:a.code,name:a.name,score:applicable.length?applicable.reduce((n,c)=>{const area=c.areas.find(r=>r.code===a.code);return n+area.done*100/area.total;},0)/applicable.length:null};
  })};
 });
 const periods=[['week',startWeek],['month',startMonth]].map(([id,start])=>{
  const eligible=records.filter(d=>d.date>=start&&d.date<=end&&d.final&&d.active&&!d.closed);
  const areas=(records.at(-1)?.areas||[]).map(area=>{
   const scores=eligible.map(d=>d.areas.find(a=>a.code===area.code)?.score).filter(s=>s!=null);
   const score=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null;
   return {code:area.code,name:area.name,score,days:scores.length,bonus:score!=null&&score>=85};
  });
  return {id,start,end,areas};
 });
 return {records,periods};
}
module.exports={START,catalog,day,at,activeCut,evaluate,validate,history};
