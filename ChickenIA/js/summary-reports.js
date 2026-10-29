/* Read-only report formatting; no database writes or automatic delivery. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ChickenSummaryReports=factory();})(typeof window==='object'?window:globalThis,()=>{
 const fmt=v=>v==null?'Sin captura':new Intl.NumberFormat('es-MX',{maximumFractionDigits:3}).format(v);
 function build(type,data,date,item){
  const titles={evaluation:'EVALUACIONES',proteins:'PROTEÍNAS',cedis:'INVENTARIO CEDIS',production:'PRODUCCIÓN'};
  const lines=['*CHICANÍA · '+titles[type]+'*',date.split('-').reverse().join('/'),''];
  if(type==='evaluation'){
   const areas=data.weekly.areas.filter(a=>!item||a.code===item);
   for(const a of areas){const d=a.days.find(x=>x.date===date);lines.push('*'+a.name+'*',d?.score==null?'Sin revisión':`${fmt(Math.floor(d.score*10)/10)}% · ${d.done}/${d.total} verificadas`,...(d?.score!=null?[d.done===d.total?'Ficha completa':`${d.total-d.done} pendiente(s)`,...(d.score>100?['Actividad extra verificada']:[])]:[]),'');}
  }else if(type==='proteins'){
   for(const report of data){
    const destination=report.inventory==='movil'?'Móvil':'Sucursal';
    const rows=(report.rows||[]).filter(r=>!item||item===report.inventory+':'+r.protein);
    if(report.unavailable){if(!item||item.startsWith(report.inventory+':'))lines.push('*Destino: '+destination+'*','Datos no disponibles','');continue;}
    for(const r of rows){const day=report.week?.find(w=>w.date===date)?.rows.find(x=>x.protein===r.protein),previous=day&&day.raw.previous!=null&&day.marinated.previous!=null?day.raw.previous+day.marinated.previous:null;
     lines.push('*'+r.name+' · Destino: '+destination+'*',`Había: ${fmt(previous)} pollos`,`Llegó proveedor: ${fmt(r.total==null?null:r.entries)}`,`Salió a ${destination}: ${fmt(r.total==null?null:r.sent)}`,...(r.waste?['Merma: '+fmt(r.waste)]:[]),...(r.adjustment?['Rectificación: '+fmt(r.adjustment)]:[]),`*Quedan en CEDIS: ${fmt(r.total)} pollos*`,`Sin marinar: ${fmt(r.raw.current)} · Marinados: ${fmt(r.marinated.current)}`,'');}
   }
   lines.push('Existencias en CEDIS por destino.');
  }else if(type==='cedis'){
   for(const p of data.lines.filter(p=>!item||String(p.id)===item)){const r=data.days.find(d=>d.date===date)?.lines.find(x=>x.id===p.id)||p;lines.push('*'+p.name+'*',`Había: ${fmt(r.previous)} · Llegó: ${fmt(r.entry)} · Salió: ${fmt(r.exit)}`,...(r.adjustment?['Rectificación: '+fmt(r.adjustment)]:[]),`*Quedan: ${fmt(r.final)} ${p.unit}*`,'');}
  }else if(type==='production'){
   const p=data.production;
   if(!p?.revision)lines.push('Sin captura para esta fecha.');
   else{const t=p.totals;lines.push(p.finalized?'Finalizado':'Borrador · Provisional',`Productos del día: ${fmt(t.active)}`,`Tandas pendientes: ${fmt(t.pendingBatches)}`,`Datos o revisiones pendientes: ${fmt(t.missing?.length)}`,`Pollo producido: ${fmt(t.chickenTotal)} pollos`,`Costilla: ${fmt(t.costillaKg)} kg`);}
  }
  return lines.join('\n').trim();
 }
 return {build};
});
