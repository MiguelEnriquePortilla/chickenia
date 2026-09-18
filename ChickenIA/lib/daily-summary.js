'use strict';
const cash=require('./cash-close'),production=require('./production-daily');
const money=v=>v===null?'pendiente':new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(v/100);
function describe(c,p){
  const result=[];
  if(!c?.revision)result.push('Cierre de Caja: sin captura.');
  else{
    const t=cash.calculate(c.data),status=c.finalized?'Finalizado':'Borrador (provisional)';
    result.push(`Cierre de Caja · ${status}.`);
    result.push(`Esperado: ${money(t.expected)} · Contado: ${money(t.counted)}.`);
    result.push(`Diferencia de caja: ${money(t.cashDifference)} · Pendiente de entrega: ${money(t.deliveryPending)}.`);
    result.push(`Gastos de caja: ${money(t.expenses)} · Tarjeta: ${money(t.cardTotal)} · Transferencia: ${money(t.transferTotal)}.`);
    if(t.warnings.length)result.push('Revisar: '+t.warnings.join('; ')+'.');
    if(!c.finalized)result.push('Completar la captura y comprobar la entrega antes de finalizar.');
  }
  if(!p?.revision)result.push('Producción: sin captura.');
  else{
    const t=production.calculate(p.data);
    result.push(`Producción · ${p.finalized?'Finalizada':'Borrador'} · ${t.pendingBatches} tandas pendientes de completar.`);
    for(const area of ['Cocina','Freidoras','Rosticero']){
      const lines=p.data.lines.filter(r=>r.active&&(!p.data.photo||['freidoras-4','rosti','costilla'].includes(r.id))&&production.catalog.find(c=>c.id===r.id)?.area===area);
      if(!lines.length)continue;
      const done=lines.filter(r=>r.done1!=null||r.done2!=null||r.done3!=null).length;
      const closing=lines.filter(r=>r.closingCooked!==null).length;
      result.push(`${area}: ${done}/${lines.length} productos con producción registrada; ${closing}/${lines.length} con sobrante registrado.`);
    }
    result.push(`Pollo producido: ${t.chickenPieces??'pendiente'} piezas · Costilla: ${t.costillaKg??'pendiente'} kg.`);
    for(const loss of (p.data.losses||[]).slice(0,5))result.push(`${loss.type}: ${production.catalog.find(c=>c.id===loss.productId)?.name} ${loss.state}, ${loss.quantity??'pendiente'} ${loss.unit||''}. ${loss.reason}`);
    if(t.missing.length)result.push('Completar cantidades o revisiones pendientes; sin dato no equivale a cero.');
  }
  return result;
}
async function snapshot(sql,date){
  const [tables]=await sql`SELECT to_regclass('public.cash_close_daily_live') AS cash, to_regclass('public.production_daily_live') AS production`;
  const c=tables.cash?(await sql`SELECT revision,data,finalized FROM cash_close_daily_live WHERE date=${date}::date`)[0]:null;
  const p=tables.production?(await sql`SELECT revision,data,finalized FROM production_daily_live WHERE date=${date}::date`)[0]:null;
  return {cash:c||null,production:p||null,lines:describe(c,p)};
}
module.exports={describe,snapshot};
