'use strict';
const {z}=require('zod');
const {AREAS,VERSION}=require('./calibre-catalog');
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const day=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const dateOK=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
function checklistScore(spec,data){
 const points=data.checklistPoints||data.points||{},reviewed=Object.keys(points).some(id=>spec.points.some(p=>p.id===id));
 const done=spec.points.filter(p=>points[p.id]?.status==='done').length,total=spec.points.length;
 const extraPoints=simpleExtras(data),extras=Object.values(extraPoints).filter(p=>p.done).length;
 const base=reviewed&&total?done*100/total:null,bonus=base===100&&extras>0?20:0;
 return {done,total,base,extras,bonus,score:base===null?null:base+bonus};
}
function simpleExtras(data){if(data.simpleExtras)return data.simpleExtras;return data.extra?.verifiedAt&&data.extra.achieved?{[data.extra.choice]:{done:true,note:data.extra.result||'',actor:data.extra.verifiedBy,at:data.extra.verifiedAt}}:{};}
function weekDates(date){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return Array.from({length:7},(_,i)=>new Date(d.getTime()+i*86400000).toISOString().slice(0,10));}
const text=z.string().trim().min(3).max(1200),short=z.string().trim().min(2).max(160);
const command=z.discriminatedUnion('action',[
 z.object({action:z.literal('simple-point'),point:z.string(),done:z.boolean(),note:z.string().trim().max(1200).default('')}),
 z.object({action:z.literal('simple-extra'),choice:z.number().int().min(0).max(2),done:z.boolean(),note:z.string().trim().max(1200).default('')}),
 z.object({action:z.literal('point'),point:z.string(),status:z.enum(['done','issue','na','pending']),note:z.string().trim().max(1200).default('')}),
 z.object({action:z.literal('sample'),product:short,slot:z.enum(['arranque','comida','precierre']),total:z.number().int().min(1).max(100),passed:z.number().int().min(0),note:z.string().trim().max(1200).default('')}),
 z.object({action:z.literal('no-cases'),reason:text}),
 z.object({action:z.literal('short-sample'),reason:text}),
 z.object({action:z.literal('incident'),description:text,owner:short,due:z.string().datetime({offset:true}),critical:z.boolean()}),
 z.object({action:z.literal('resolve'),id:z.string(),note:text}),
 z.object({action:z.literal('extra-plan'),choice:z.number().int().min(0).max(2),associate:short,expected:text}),
 z.object({action:z.literal('extra-verify'),result:text,achieved:z.boolean(),evidence:z.string().trim().max(1000).default('')}),
 z.object({action:z.literal('closing-note'),note:text,raw:z.number().min(0).max(100000).nullable().optional(),cooked:z.number().min(0).max(100000).nullable().optional()}),
 z.object({action:z.literal('close')}),z.object({action:z.literal('reopen'),reason:text})
]);
function blank(){return {version:VERSION,points:{},samples:[],incidents:[],extra:null,noCases:null,shortSample:null,closing:null,final:false};}
function summary(spec,data,now=new Date(),date=day(now)){
 const points=spec.points.map(p=>({...p,...data.points[p.id]}));
 const applicable=points.filter(p=>p.status!=='na'),done=applicable.filter(p=>p.status==='done').length;
 const ficha=applicable.length?done*100/applicable.length:null;
 const samples=spec.code==='supervision'?data.incidents.filter(i=>day(new Date(i.due))===date&&new Date(i.due)<=now).map(i=>({total:1,passed:i.resolvedAt&&new Date(i.resolvedAt)<=new Date(i.due)?1:0})):data.samples;
 const total=samples.reduce((s,r)=>s+r.total,0),passed=samples.reduce((s,r)=>s+r.passed,0),kpi=total?passed*100/total:null;
 const critical=points.some(p=>p.critical&&p.status==='issue')||data.incidents.some(i=>i.critical&&!i.resolvedAt);
 const expected=spec.code==='supervision'?true:spec.products.every(p=>new Set(data.samples.filter(s=>s.product===p).map(s=>s.slot)).size>=spec.expected)||!!data.shortSample||!!data.noCases;
 const complete=applicable.length>0&&points.every(p=>['done','na'].includes(p.status))&&expected;
 const base=ficha==null?null:kpi==null?ficha:(ficha+kpi)/2;
 const extra=complete&&base===100&&kpi!==null&&!critical&&data.extra?.achieved===true&&!!data.extra?.verifiedAt?20:0;
 const provisional=!data.final||kpi===null||!expected;
 const score=base===null?null:base+extra;
 const level=critical?'¡Atención prioritaria!':kpi===null?(data.noCases?'Sin casos para evaluar':'Pendiente de verificar'):!expected?'Pendiente de verificar':score===120?'Calibre Chicanito':score===100?'Aceptable':score>=85?'Mínimo':'¡Vamos a levantarlo!';
 return {ficha,kpi,total,passed,base,extra,score,level,critical,complete,provisional,expected,done,applicable:applicable.length,noCases:!!data.noCases,products:spec.products.map(product=>{const rows=data.samples.filter(s=>s.product===product),n=rows.reduce((a,s)=>a+s.total,0);return {product,total:n,passed:rows.reduce((a,s)=>a+s.passed,0)};})};
}
function apply(spec,source,raw,user,now=new Date(),date=day(now)){
 const c=command.parse(raw),data=structuredClone(source),stamp=now.toISOString();
 if(c.action==='simple-extra'){
  if(!spec.extras[c.choice])fail('Actividad de 120% desconocida.');
  if(spec.code==='supervision'&&!['MIGUEL','LILIAN'].includes(user.name))fail('Lilian o Miguel verifican el 120% de Supervisión.',403);
  data.simpleExtras??=structuredClone(simpleExtras(data));
  data.simpleExtras[c.choice]={done:c.done,note:c.note,actor:user.name,at:stamp};return data;
 }
 if(c.action==='simple-point'){
  if(!spec.points.some(p=>p.id===c.point))fail('Actividad desconocida.');
  // Separate checklist overlay: existing KPI, final evaluations and report snapshots stay unchanged.
  data.checklistPoints??=structuredClone(data.points);
  data.checklistPoints[c.point]={status:c.done?'done':'pending',note:c.note,actor:user.name,at:stamp};
  return data;
 }
 if(data.final&&c.action!=='reopen')fail('Así cerramos: este resultado ya está cerrado. Miguel o Lilian pueden reabrir con motivo.',409);
 if(c.action==='reopen'){
  if(!['MIGUEL','LILIAN'].includes(user.name))fail('Miguel o Lilian deben reabrir el resultado.',403);
  if(!data.final)fail('El resultado ya está abierto.',409);data.final=false;data.reopen={reason:c.reason,actor:user.name,at:stamp};return data;
 }
 if(c.action==='point'){
  const p=spec.points.find(p=>p.id===c.point);if(!p)fail('Actividad desconocida.');
  if(['na','issue'].includes(c.status)&&c.note.length<3)fail('Anota el motivo para continuar.');
  data.points[c.point]={status:c.status,note:c.note,actor:user.name,at:stamp};
 }
 if(c.action==='sample'){
  if(spec.code==='supervision'||!spec.products.includes(c.product)||c.passed>c.total)fail('Revisa producto y cantidades de la muestra.');
  const max=spec.code==='ventas_barras'?5:spec.code==='cocina'?3:1;
  if(c.total>max||(['rastro','rosticero','freidoras'].includes(spec.code)&&c.total!==1))fail('La cantidad no corresponde a la muestra acordada.');
  if(spec.code==='cocina'&&c.slot==='precierre')fail('Cocina se revisa en arranque y comida.');
  if(spec.code!=='rastro'&&data.samples.some(s=>s.slot===c.slot&&s.product===c.product))fail('Esta revisión ya está registrada; conserva el resultado original.',409);
  if(c.passed<c.total&&c.note.length<3)fail('Anota qué faltó o qué necesitas corregir.');
  if(c.total<max&&c.note.length<3)fail('Si hubo menos casos, anota cuántos hubo y el motivo.');
  data.noCases=null;data.samples.push({...c,id:require('node:crypto').randomUUID(),actor:user.name,at:stamp});
 }
 if(c.action==='no-cases'){
  if(data.samples.length||data.incidents.length)fail('Ya hay casos registrados; no corresponde marcar sin casos.');
  data.noCases={reason:c.reason,actor:user.name,at:stamp};
 }
 if(c.action==='short-sample')data.shortSample={reason:c.reason,actor:user.name,at:stamp};
 if(c.action==='incident'){
  if(!Number.isFinite(Date.parse(c.due))||new Date(c.due)<now)fail('Acuerda la hora límite desde que detectas la incidencia.');
  data.noCases=null;data.incidents.push({...c,id:require('node:crypto').randomUUID(),actor:user.name,at:stamp});
 }
 if(c.action==='resolve'){
  const i=data.incidents.find(i=>i.id===c.id);if(!i||i.resolvedAt)fail('La incidencia no está pendiente.',409);
  i.resolvedAt=stamp;i.resolvedBy=user.name;i.resolution=c.note;
 }
 if(c.action==='extra-plan'){
  if(data.extra)fail('La actividad del día ya fue acordada; conserva su seguimiento.',409);
  if(spec.code==='supervision'&&!['MIGUEL','LILIAN'].includes(user.name))fail('Lilian o Miguel acuerdan el 120% de Supervisión.',403);
  data.extra={...c,actor:user.name,at:stamp};
 }
 if(c.action==='extra-verify'){
  if(!data.extra||data.extra.verifiedAt)fail('Primero acuerda una actividad pendiente de verificar.',409);
  if(spec.code==='supervision'&&!['MIGUEL','LILIAN'].includes(user.name))fail('Lilian o Miguel verifican el 120% de Supervisión.',403);
  data.extra={...data.extra,result:c.result,achieved:c.achieved,evidence:c.evidence,verifiedBy:user.name,verifiedAt:stamp};
 }
 if(c.action==='closing-note'){
  if(spec.code==='freidoras'&&(c.raw==null||c.cooked==null))fail('Registra por separado pollo crudo y Cruji frito; cero es una cantidad válida.');
  data.closing={note:c.note,raw:c.raw??null,cooked:c.cooked??null,actor:user.name,at:stamp};
 }
 if(c.action==='close'){
  const s=summary(spec,data,now,date);
  if(!spec.points.every(p=>['done','issue','na'].includes(data.points[p.id]?.status)))fail('Revisa todas las actividades antes de cerrar.');
  if(!s.expected||(s.kpi===null&&!data.noCases))fail('Completa las revisiones o registra por qué no hubo casos suficientes.');
  if(['rosticero','freidoras'].includes(spec.code)&&!data.closing)fail('Registra sobrantes y entrega de turno antes de cerrar.');
  if(data.extra&&!data.extra.verifiedAt)fail('Verifica el resultado de la actividad de 120% antes de cerrar.');
  data.final=true;data.finalBy=user.name;data.finalAt=stamp;data.finalSummary=summary(spec,{...data,final:true},now,date);
 }
 return data;
}
const pct=n=>n==null?'Sin medición':`${Math.floor(n*10)/10}%`;
function report(rows,date,kind,now=new Date()){
 if(kind==='cierre'&&rows.some(r=>!r.data.final))fail('Para «Así cerramos», todas las áreas elegidas deben tener cierre verificado.');
 return `🐔 ¡ASÍ ${kind==='cierre'?'CERRAMOS':'VAMOS'}, CHICANITO!\n📅 ${date}\n`+rows.map(r=>{
  const s=r.data.final?r.data.finalSummary:summary(r.spec,r.data,now,date);
  // Group reports deliberately exclude free text, cash, personnel notes and incident details.
  return `\n${r.spec.name.toUpperCase()}\n✅ Mi ficha: ${pct(s.ficha)}\n🎯 ${r.spec.kpi}: ${pct(s.kpi)} (${s.passed}/${s.total})\n⭐ Actividad de 120%: ${r.data.extra?.verifiedAt?(r.data.extra.achieved?'Lograda y verificada':'Revisada · resultado por mejorar'):r.data.extra?'En marcha':'Por acordar'}${r.data.extra?.verifiedAt&&r.data.extra.achieved?'\n🙌 Hoy destacamos: '+r.spec.extras[r.data.extra.choice].title:''}\n${s.critical?'🚩':'🏆'} ${pct(s.score)} · ${s.level}${s.provisional?' · Provisional':''}\n➡️ ${s.critical?'Resolver y verificar atención prioritaria':s.kpi===null?'Completar medición del indicador':s.score===120?'¡A mantener el Calibre Chicanito!':'Completar la base y verificar nuestra actividad de 120%'}`;
 }).join('\n')+'\n\n¡Haz de tu día, un día Very Sabrosito!';
}
function simpleReport(rows,date){
 return `🐔 ¡ASÍ VAMOS, EQUIPO CHICANITO!\n📅 ${date}\n`+rows.map(r=>{const s=checklistScore(r.spec,r.data),extras=simpleExtras(r.data);return `\n${r.spec.name.toUpperCase()}\n✅ Ficha: ${s.done}/${s.total} actividades\n🎯 Avance: ${s.score===null?'Sin revisión':Math.floor(s.score*10)/10+'%'}${s.score===120?' · ¡Calibre Chicanito!':''}\n⭐ Actividades para llegar al 120%:\n${r.spec.extras.map((e,i)=>`${extras[i]?.done?'☑':'☐'} ${e.title}`).join('\n')}${s.extras&&s.base!==100?'\n➡️ Completemos la ficha para sumar los 20 puntos extra.':''}`;}).join('\n')+'\n\n¡Haz de tu día, un día Very Sabrosito!';
}
module.exports={AREAS,VERSION,day,dateOK,blank,summary,apply,report,fail,checklistScore,weekDates,simpleExtras,simpleReport};
