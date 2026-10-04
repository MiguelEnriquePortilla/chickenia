'use strict';
const {VERSION,CUTS,AREAS,requirements}=require('./kpi-catalog');
const {z}=require('zod');
const ZONE='America/Mexico_City';
const qty=z.number().finite().min(0).max(1000000).multipleOf(0.001).nullable();
const schema=z.object({
 checks:z.array(z.object({id:z.string(),status:z.enum(['pending','ready','issue']),note:z.string().trim().max(1000)}).strict()).max(40),
 products:z.array(z.object({id:z.string(),available:qty,quality:z.enum(['pending','approved','issue']),note:z.string().trim().max(1000),inProcess:qty,remainingDemand:qty,additional:qty,decision:z.enum(['pending','continue','reduce','stop'])}).strict()).max(100),
 notes:z.string().trim().max(2000)
}).strict();
const day=now=>new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
const validDate=date=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;
const deadline=(date,cut)=>new Date(`${date}T${cut.time}:00-06:00`);
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
function validate(data,cut,products){
 const result=schema.parse(data),expected=requirements(cut).map(r=>r.id);
 for(const [items,ids]of [[result.checks,expected],[result.products,products.filter(p=>p.active).map(p=>p.id)]]){
  if(items.length!==ids.length||new Set(items.map(r=>r.id)).size!==ids.length||items.some(r=>!ids.includes(r.id)))fail('El listado cambió. Recarga el corte antes de guardar.',409);
 }
 if(result.checks.some(r=>r.status==='issue'&&!r.note)||result.products.some(r=>r.quality==='issue'&&!r.note))fail('Describe cada incidencia y la acción para atenderla.');
 return result;
}
function evaluate(data,cut,sources){
 const specs=requirements(cut),areaResults=AREAS.filter(a=>a.requirements[cut]).map(a=>{
  const checks=specs.filter(s=>s.area===a.id).map(s=>({...s,...data.checks.find(c=>c.id===s.id)}));
  const missing=checks.filter(c=>!c.status||c.status==='pending').map(c=>c.label);
  const issues=checks.filter(c=>c.status==='issue').map(c=>c.label+': '+c.note);
  const products=sources.products.filter(p=>p.active&&(p.area===a.id||['ventas_barras','supervision'].includes(a.id)));
  for(const p of products){
   const r=data.products.find(r=>r.id===p.id);
   if(!r||r.available===null||r.quality==='pending')missing.push(p.name+': cantidad disponible y calidad');
   if(p.produced===null||!p.unit)missing.push(p.name+': producción y unidad en Producción Diaria');
   if(cut==='apertura'&&p.previous===null)missing.push(p.name+': sobrante anterior en Producción Diaria');
   if(cut==='apertura'&&p.planned==null)missing.push(p.name+': cantidad de la primera orden en Producción Diaria');
   if(cut==='apertura'&&p.planned>0&&p.produced<p.planned)issues.push(p.name+': producción inicial menor a la orden');
   if(['apertura','comida'].includes(cut)&&r?.available===0&&(p.planned>0||p.produced>0||p.previous>0))issues.push(p.name+': sin producto disponible para venta');
   if(cut==='cierre'&&r?.available!==null&&r?.available!==p.closing)issues.push(p.name+': el conteo no coincide con el sobrante de Producción Diaria');
   if(r?.quality==='issue')issues.push(p.name+': '+r.note);
   if(cut==='ajuste'&&(!r||[r.inProcess,r.remainingDemand,r.additional].some(v=>v===null)||r.decision==='pending'||!r.note))missing.push(p.name+': decisión y motivo de producción restante');
   if(cut==='ajuste'&&r?.decision==='stop'&&r.additional>0)issues.push(p.name+': se indicó detener, pero hay producción adicional acordada');
  }
  if(['cocina','rosticero','freidoras','ventas_barras','supervision'].includes(a.id)&&!sources.products.some(p=>p.active))missing.push('No hay productos aplicables definidos para evaluar');
  if(['cocina','rosticero','freidoras','ventas_barras','supervision'].includes(a.id)&&!sources.productionRevision)missing.push('Guardar Producción Diaria para identificar productos y cantidades');
  if(cut==='cierre'){
   if(['cocina','rosticero','freidoras','supervision'].includes(a.id)&&!sources.productionFinalized)missing.push('Finalizar Producción Diaria');
   if(['caja','supervision'].includes(a.id)){
    if(!sources.cashFinalized)missing.push('Finalizar Cierre de Caja');
    if(!sources.cashBalanced)issues.push('Cuadre de caja pendiente de comprobar o con diferencias');
   }
  }
  return {id:a.id,name:a.name,indicator:a.indicator,reviewed:missing.length===0,ready:missing.length===0&&issues.length===0,missing,issues};
 });
 return {reviewed:areaResults.every(a=>a.reviewed),ready:areaResults.every(a=>a.ready),areas:areaResults};
}
function summarize(date,events,activation,now){
 const active=date>=activation;
 const cuts=CUTS.map(c=>{
  const records=events.filter(e=>e.date===date&&e.cut===c.id).sort((a,b)=>a.revision-b.revision);
  const due=active&&new Date(now)>=deadline(date,c);
  // Last evidence before the deadline defines the result. Late corrections remain visible separately.
  const ontime=records.filter(e=>new Date(e.created_at)<=deadline(date,c)).at(-1);
  const latest=records.at(-1);
  const result=due?ontime:latest;
  const status=!active?'not_evaluated':!due?'upcoming':result?.evaluation.ready?'on_time':latest?.evaluation.ready?'late':latest?'incomplete':'missing';
  return {...c,due,status,revision:latest?.revision||0,atDeadline:ontime||null,latest:latest||null,evaluation:result?.evaluation||null,
   history:records.map(e=>({revision:e.revision,actor:e.actor_name,time:e.created_at,reviewed:e.evaluation.reviewed,ready:e.evaluation.ready,notes:e.data?.notes||''}))};
 });
 const due=cuts.filter(c=>c.due),met=due.filter(c=>c.status==='on_time');
 const areas=AREAS.map(a=>{
  const expected=due.filter(c=>a.requirements[c.id]);
  const completed=expected.filter(c=>c.atDeadline?.evaluation.areas.find(r=>r.id===a.id)?.ready);
  return {id:a.id,name:a.name,indicator:a.indicator,met:completed.length,due:expected.length,score:expected.length?Math.round(completed.length*100/expected.length):null};
 });
 // Supervision is the readiness of all areas at each cut, not just its own acknowledgments.
 Object.assign(areas.find(a=>a.id==='supervision'),{met:met.length,due:due.length,score:due.length?Math.round(met.length*100/due.length):null});
 return {date,active,cuts,met:met.length,due:due.length,score:due.length?Math.round(met.length*100/due.length):null,areas};
}
module.exports={VERSION,CUTS,AREAS,day,validDate,deadline,validate,evaluate,summarize,fail};
