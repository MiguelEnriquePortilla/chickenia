'use strict';
const previousCatalog=require('./control-points-catalog.json');
const CHANGE_DATE='2026-10-11';
const TIMES=['10:30','13:30','16:30','19:30'];
// Keep the original catalog for historical days; daily snapshots remain authoritative.
const catalog=previousCatalog.map((cut,i)=>({...cut,time:TIMES[i],videoRequired:true,areas:cut.areas.map(area=>({...area,points:area.points.map(point=>({...point,text:point.text.replace(/(A las |[Aa]ntes de las )10:00:/g,(_,prefix)=>prefix+'10:30:')}))}))}));
const AGREEMENTS_DATE='2026-10-12';
function withMeetingAgreements(cut,index){
 if(index>1)return cut;
 return {...cut,areas:cut.areas.map(area=>area.code!=='ventas_barras'?area:{...area,points:area.points.map((point,i)=>i!==0?point:{
  ...point,id:`ventas_barras-tanda-${index+1}`,
  text:index===0?'Primera tanda en barra: 25% de la producción desde las 9:30; verificar abastecimiento a las 10:30.':'Segunda tanda en barra: abastecer el 75% restante a las 13:30; verificar cantidad, temperatura, hidratación y presentación.'
 })})};
}
const meetingCatalog=catalog.map(withMeetingAgreements);
const catalogForDate=date=>date>=AGREEMENTS_DATE?meetingCatalog:date>=CHANGE_DATE?catalog:previousCatalog;
function upgradeCatalog(date,cuts,now){
 if(date<CHANGE_DATE)return cuts;
 return cuts.map((cut,i)=>{
  if(new Date(now).getTime()>=at(date,cut.time))return cut;
  const updated={...cut,time:TIMES[i],videoRequired:true};
  return date>=AGREEMENTS_DATE?withMeetingAgreements(updated,i):updated;
 });
}
const START='2026-10-12';
const day=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
const at=(date,time)=>new Date(`${date}T${time}:00-06:00`).getTime();
const videoPoint=code=>'_video:'+code;
const activeCut=(date,cuts,now)=>date===day(now)?cuts.findIndex(c=>new Date(now).getTime()<at(date,c.time)):-1;
function evaluate(date,cuts,events,now=new Date()){
 const stamp=new Date(now).getTime();
 return cuts.map((cut,index)=>{
  const deadline=at(date,cut.time),passed=stamp>=deadline;
  const latest=new Map(),original=new Map();
  for(const event of [...events].sort((a,b)=>new Date(a.recorded_at)-new Date(b.recorded_at)||Number(a.id)-Number(b.id))){
   if(event.cut_index!==index)continue;
   const recorded=new Date(event.recorded_at).getTime();
   if(recorded>stamp)continue;
   latest.set(event.point_id,event);
   if(cut.videoRequired?recorded<deadline:recorded<=deadline)original.set(event.point_id,event);
  }
  const areas=cut.areas.filter(area=>area.code!=='caja').map(area=>{
   const points=area.points.map(point=>({...point,done:!!latest.get(point.id)?.done,atCut:!!original.get(point.id)?.done}));
   const done=points.filter(p=>passed?p.atCut:p.done).length,total=points.length;
   const id=videoPoint(area.code),last=latest.get(id),onTime=original.get(id);
   const delivered=!!(passed?onTime:last)?.done;
   const video={required:!!cut.videoRequired,done:!!last?.done,atCut:!!onTime?.done,delivered,
    actor:last?.actor||null,recordedAt:last?.recorded_at||null,
    atCutActor:onTime?.actor||null,atCutRecordedAt:onTime?.recorded_at||null,
    history:events.filter(e=>e.cut_index===index&&e.point_id===id&&new Date(e.recorded_at).getTime()<=stamp).map(e=>({done:e.done,actor:e.actor,recordedAt:e.recorded_at}))};
   return {...area,points,done,total,video,score:cut.videoRequired&&!delivered?0:total?done*100/total:0};
  });
  return {...cut,passed,begun:stamp>=at(date,index?cuts[index-1].time:'00:00'),areas,
   done:areas.reduce((n,a)=>n+a.done,0),total:areas.reduce((n,a)=>n+a.total,0)};
 });
}
function validate(body,date,cuts,now){
 const fail=message=>{throw Object.assign(Error(message),{status:400});};
 if(date!==day(now))fail('Solo puedes palomear el día de hoy.');
 if(!Number.isInteger(body.cut)||!cuts[body.cut]||typeof body.done!=='boolean'||!Number.isSafeInteger(body.revision)||body.revision<0)fail('Revisión inválida.');
 if(typeof body.point==='string'&&body.point.startsWith('caja'))fail('Este módulo fue retirado.');
 const video=cuts[body.cut].videoRequired&&cuts[body.cut].areas.some(a=>videoPoint(a.code)===body.point);
 if(video){
  if(new Date(now).getTime()<at(date,body.cut?cuts[body.cut-1].time:'00:00'))fail('Este corte todavía no inicia.');
  return;
 }
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
   return {code:a.code,name:a.name,score:applicable.length?applicable.reduce((n,c)=>{const area=c.areas.find(r=>r.code===a.code);return n+area.score;},0)/applicable.length:null};
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
module.exports={START,CHANGE_DATE,AGREEMENTS_DATE,TIMES,catalog,meetingCatalog,previousCatalog,catalogForDate,upgradeCatalog,videoPoint,day,at,activeCut,evaluate,validate,history};
