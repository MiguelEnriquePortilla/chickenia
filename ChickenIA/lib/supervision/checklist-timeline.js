'use strict';
const {credit}=require('./measurement');
const {blockFor}=require('./report-guidance');
const START='2026-10-06';
const CUTS=[{id:'apertura',time:'10:00',label:'Apertura',block:'apertura'},{id:'comida',time:'12:00',label:'Comida',block:'operacion'},{id:'ajuste',time:'16:00',label:'Seguimiento',block:'operacion'},{id:'cierre',time:'19:00',label:'Cierre',block:'cierre'}];
const recurring=new Set([
 'Revisar y reponer productos de barra y adobos','Mantener salsa de adobo envasada disponible para venta',
 'Mantener barras y estaciones limpias y organizadas','Revisar consumibles y solicitar reposición a ventas/barras',
 'Limpiar mesas y barras de cocina durante el servicio','Producto suficiente para venta en caja (arroz y complementos)',
 'Barra caliente con calidad Chicanito (hidratada y abastecida)','Mantener publicidad/promociones visibles',
 'Productos ofrecidos activamente durante el día','Atención al cliente amable y constante',
 'Pedir productos cuando se requiera','Mantener productos hidratados todo el día, incluyendo ensaladas',
 'Atención al cliente según estándares Chicanito','Limpieza de vidrios (todo el día)',
 'Lavado de trastes','Mantener área de tarja limpia','Mantener pisos limpios'
]);
const afternoon=new Set(['Elaborar con Nancy la orden de producción del siguiente día','Integrar necesidades a la solicitud semanal de compras','Arqueo diario ágil (recepción, almacén, venta)']);
function day(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));}
const at=(date,time)=>new Date(`${date}T${time}:00-06:00`).getTime();
function schedule(row){
 const match=(row.name||'').match(/^(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\.?/i);
 if(match){
  const mins=(Number(match[1])%12+(match[3].toLowerCase()==='p'?12:0))*60+Number(match[2]);
  const index=CUTS.findIndex(c=>{const [h,m]=c.time.split(':').map(Number);return h*60+m>=mins;});
  // Tasks explicitly scheduled after 19:00 stay in the checklist, outside these four cuts.
  return {first:index<0?null:index,repeat:false,label:index<0?'Después de las 19:00 · fuera de estos cortes':`Antes de ${CUTS[index].time}`};
 }
 if(row.measurement==='bar-close')return {first:3,repeat:false,label:'Antes de 19:00'};
 const first=afternoon.has(row.name)?2:({apertura:0,operacion:1,cierre:3})[blockFor(row)];
 const repeat=first===1&&recurring.has(row.name);
 return {first:first??null,repeat,label:first==null?'Sin horario · no se califica':repeat?'Revisar a las 12:00 y 16:00':`Antes de ${CUTS[first].time}`};
}
function evaluate(catalog,events,date,now=new Date()){
 const nowMs=new Date(now).getTime(),active=date>=START;
 const groups=new Map();for(const row of catalog){if(!groups.has(row.area_code))groups.set(row.area_code,{code:row.area_code,name:row.area_name,items:[]});groups.get(row.area_code).items.push(row);}
 const ordered=[...events].sort((a,b)=>new Date(a.recorded_at)-new Date(b.recorded_at)||Number(a.id)-Number(b.id));
 const cuts=CUTS.map((cut,index)=>{
  const deadline=at(date,cut.time),due=active&&nowMs>=deadline;
  const begun=nowMs>=(index?at(date,CUTS[index-1].time):at(date,'00:00'));
  const limit=Math.min(nowMs,deadline),latest=new Map();
  for(const e of ordered)if(new Date(e.recorded_at).getTime()>=at(date,'00:00')&&new Date(e.recorded_at).getTime()<=limit)latest.set(Number(e.activity_id),e);
  const areas=[...groups.values()].map(group=>{
   const items=group.items.filter(r=>{const s=r.schedule||schedule(r);return s.first!==null&&s.first<=index;});
   let earned=0,total=0;const pending=[];
   for(const row of items){
    const s=row.schedule||schedule(row),event=latest.get(Number(row.id));
    // One-time tasks retain their check; continuing conditions need a fresh observation in the second service period.
    const fresh=!s.repeat||index<2||new Date(event?.verified_at).getTime()>at(date,'12:00');
    const amount=fresh?credit({...row,...event}):0,weight=Number(row.weight)||1;
    total+=weight;earned+=amount*weight;
    if(amount<1)pending.push({id:row.id,name:row.name,reason:!fresh?'Falta volver a verificar después de las 12:00':event?.done?'Cumplimiento parcial':'Sin verificar al corte'});
   }
   const complete=total>0&&earned===total;
   return {code:group.code,name:group.name,score:total?Math.min(complete?100:99,Math.round(earned*100/total)):null,complete,total:items.length,pending};
  });
  const applicable=areas.filter(a=>a.score!==null);
  return {...cut,due,begun,passed:nowMs>=deadline,status:!begun?'future':!active?'practice':due?'saved':'live',areas,complete:applicable.filter(a=>a.complete).length,total:applicable.length};
 });
 const areas=[...groups.values()].map(g=>{
  const scores=cuts.filter(c=>c.due).map(c=>c.areas.find(a=>a.code===g.code)?.score).filter(s=>s!=null);
  return {code:g.code,name:g.name,score:scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null,cuts:scores.length};
 });
 return {date,active,closed:false,cuts,areas,final:cuts.every(c=>c.due)};
}
function averages(days,end,span){
 const start=new Date(`${end}T12:00:00Z`);start.setUTCDate(start.getUTCDate()-span+1);
 const eligible=days.filter(d=>d.date>=start.toISOString().slice(0,10)&&d.date<=end&&d.final&&!d.closed&&d.active);
 const groups={};for(const d of eligible)for(const a of d.areas)if(a.score!==null){const g=groups[a.code]||(groups[a.code]={total:0,days:0});g.total+=a.score;g.days++;}
 return {span,days:eligible.length,areas:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,{score:Math.round(v.total/v.days),days:v.days}]))};
}
module.exports={START,CUTS,day,at,schedule,evaluate,averages};
