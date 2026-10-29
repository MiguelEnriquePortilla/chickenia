'use strict';
const production=require('./production-daily');
const money=v=>v===null?'pendiente':new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(v/100);
function describe(c,p){
  const result=[];
  if(!p?.revision)result.push('Producción: sin captura.');
  else{
    p={...p,data:production.chickens(p.data)};
    const t=production.calculate(p.data);
    result.push(`Producción · ${p.finalized?'Finalizada':'Borrador'} · ${t.pendingBatches} tandas pendientes de completar.`);
    for(const area of ['Cocina','Freidoras','Rosticero']){
      const lines=p.data.lines.filter(r=>r.active&&(!p.data.photo||['freidoras-4','rosti','costilla'].includes(r.id))&&production.catalog.find(c=>c.id===r.id)?.area===area);
      if(!lines.length)continue;
      const done=lines.filter(r=>r.done1!=null||r.done2!=null||r.done3!=null).length;
      const closing=lines.filter(r=>r.closingCooked!==null).length;
      result.push(`${area}: ${done}/${lines.length} productos con producción registrada; ${closing}/${lines.length} con sobrante registrado.`);
    }
    result.push(`Pollo producido: ${t.chickenTotal??'pendiente'} pollos · Costilla: ${t.costillaKg??'pendiente'} kg.`);
    for(const loss of (p.data.losses||[]).slice(0,5))result.push(`${loss.type}: ${production.catalog.find(c=>c.id===loss.productId)?.name} ${loss.state}, ${loss.quantity??'pendiente'} ${loss.unit||''}. ${loss.reason}`);
    if(t.missing.length)result.push('Completar cantidades o revisiones pendientes; sin dato no equivale a cero.');
  }
  return result;
}
async function snapshot(sql,date){
  const [tables]=await sql`SELECT to_regclass('public.production_daily_live') AS production`;
  const p=tables.production?(await sql`SELECT revision,data,finalized FROM production_daily_live WHERE date=${date}::date`)[0]:null;
  return {production:p||null,lines:describe(null,p)};
}
module.exports={describe,snapshot};
