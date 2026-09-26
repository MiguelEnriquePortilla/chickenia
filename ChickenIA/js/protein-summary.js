'use strict';
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.ChickenProteinSummary=factory();
})(typeof window==='object'?window:globalThis,()=>{
 const names={sucursal:'Sucursal',movil:'Móvil'};
 const fmt=v=>v==null?'Sin captura':new Intl.NumberFormat('es-MX',{maximumFractionDigits:3}).format(v);
 const sum=values=>values.reduce((n,v)=>n+Math.round(Number(v)*1000),0)/1000;
 function summarize(reports){
  return ['sucursal','movil'].map(inventory=>{
   const d=reports.find(d=>d.inventory===inventory);
   if(!d||d.unavailable)return {inventory,name:names[inventory],unavailable:true,rows:[],alerts:['Datos no disponibles']};
   const alerts=[];
   const rows=d.rows.map(r=>{
    const shipments=d.shipments.filter(s=>s.protein===r.protein),pending=shipments.filter(s=>!s.receipt);
    if(r.total==null)alerts.push(r.name+': sin captura inicial');
    if(pending.length)alerts.push(`${r.name}: ${fmt(sum(pending.map(s=>s.sent)))} pollos en ${pending.length} envío(s) por confirmar`);
    const differences=shipments.filter(s=>s.receipt?.date===d.date&&s.receipt.difference!==0);
    if(differences.length)alerts.push(`${r.name}: ${differences.length} recepción(es) con diferencia hoy`);
    for(const key of ['raw','marinated']){
     const c=r[key].count;
     if(c?.date===d.date&&c.difference!==0)alerts.push(`${r.name} ${key==='raw'?'sin marinar':'marinado'}: diferencia de conteo ${fmt(c.difference)}${c.movedSince?' (hubo movimientos posteriores)':''}`);
    }
    return {...r,pending:sum(pending.map(s=>s.sent)),pendingCount:pending.length};
   });
   const initialized=rows.some(r=>r.total!=null);
   return {...d,name:names[inventory],rows,alerts,sent:initialized?sum(rows.map(r=>r.sent)):null,pendingQuantity:initialized?sum(rows.map(r=>r.pending)):null};
  });
 }
 function lines(groups){
  const out=['PROTEÍNAS · pollos','En CEDIS: sin marinar / marinados'];
  for(const g of groups){
   out.push('',g.name.toUpperCase());
   if(g.unavailable){out.push('Datos no disponibles');continue;}
   for(const r of g.rows)out.push(`${r.name}: ${fmt(r.raw.current)} / ${fmt(r.marinated.current)}`);
   out.push(`Enviado hoy: ${fmt(g.sent)} · Por confirmar: ${fmt(g.pendingQuantity)}`);
   const missing=g.rows.filter(r=>r.total==null).length;
   const differences=g.alerts.filter(a=>a.includes('diferencia')).length;
   if(missing||differences)out.push('Revisar: '+[missing?`${missing} sin captura`:null,differences?`${differences} aviso(s) de diferencias`:null].filter(Boolean).join(' · '));
  }
  out.push('Por confirmar incluye días anteriores.');
  return out;
 }
 return {summarize,lines,fmt,sum};
});
