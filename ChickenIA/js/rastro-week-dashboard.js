'use strict';
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./protein-summary'));
 else root.ChickenProteinDashboard=factory(root.ChickenProteinSummary);
})(typeof window==='object'?window:globalThis,model=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=v=>v==null?'Sin captura':model.fmt(v);
 const add=values=>values.some(v=>v==null)?null:model.sum(values);
 const label=v=>new Date(v+'T12:00:00Z').toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});
 function daily(report,date,protein){
  const r=report.week?.find(w=>w.date===date)?.rows?.find(r=>r.protein===protein);
  if(!r||r.total==null)return null;
  const shipments=(report.shipments||[]).filter(s=>s.date===date&&s.protein===protein);
  const slot=key=>model.sum(shipments.filter(s=>s.slot===key).map(s=>s.sent));
  return {...r,previous:add([r.raw.previous,r.marinated.previous]),morning:slot('morning'),noon:slot('noon'),other:model.sum(shipments.filter(s=>!['morning','noon'].includes(s.slot)).map(s=>s.sent))};
 }
 function table(report,protein,name,date){
  const days=report.week||[],rows=days.map(w=>daily(report,w.date,protein));
  const other=rows.some(r=>r?.other),changes=rows.some(r=>r&&(r.waste||r.adjustment));
  const keys=['previous','entries','morning','noon',...(other?['other']:[]),'sent',...(changes?['waste','adjustment']:[]),'total'];
  const labels=['Había al iniciar','Llegó proveedor','Salió mañana','Salió mediodía',...(other?['Otras salidas']:[]),'Total enviado',...(changes?['Merma','Rectificación']:[]),'Quedó en Rastro'];
  const valid=rows.filter(Boolean),last=valid.at(-1);
  const totals=k=>valid.length?model.sum(valid.map(r=>r[k]||0)):null;
  return `<section class="rw-history"><h3>${name} · Histórico semanal</h3><div class="rw-scroll" tabindex="0" role="region" aria-label="Histórico semanal de ${name}"><table class="rw-table"><caption>${days.length?esc(label(days[0].date)+' al '+label(days.at(-1).date)):''} · pollos</caption><thead><tr><th scope="col">Día</th>${labels.map(l=>`<th scope="col">${l}</th>`).join('')}</tr></thead><tbody>${days.map((w,i)=>{const r=rows[i];return `<tr${w.date===date?' class="rw-selected"':''}><th scope="row">${esc(label(w.date))}</th>${r?keys.map(k=>`<td>${fmt(r[k])}</td>`).join(''):`<td colspan="${keys.length}">${w.date>date?'Posterior a la fecha consultada':'Sin captura'}</td>`}</tr>`;}).join('')}</tbody><tfoot><tr><th scope="row">Acumulado al ${esc(label(date))}</th>${keys.map(k=>`<td>${k==='previous'?'—':k==='total'?fmt(last?.total):fmt(totals(k))}</td>`).join('')}</tr></tfoot></table></div>${changes?'<p class="rw-note">Las mermas y rectificaciones también modifican la existencia.</p>':''}</section>`;
 }
 function render(reports,date){
  // "sucursal" identifies the Rastro ledger allocated for the store,
  // not stock physically received or cooked in the store.
  const report=reports.find(r=>r.inventory==='sucursal');
  if(!report||report.unavailable)return '<h2>Proteínas en Rastro</h2><p role="alert">No se pudo consultar Rastro. Recarga para volver a intentar; no se muestran saldos en cero.</p>';
  const products=[['rosti','Rosti'],['cruji','Cruji']];
  return `<div class="rw-heading"><div><p class="rw-eyebrow">Rastro</p><h2>Proteínas · semana</h2><p>Existencias y movimientos al ${esc(label(date))} · pollos</p></div><a class="rw-source" href="/proteinas.html?date=${encodeURIComponent(date)}">Ver movimientos de Rastro</a></div>
   ${products.map(([protein,name])=>{const r=report.rows.find(r=>r.protein===protein),d=daily(report,date,protein);return `<section class="rw-product" aria-label="${name} en Rastro"><h3>${name}</h3><div class="rw-kpis">${[['Había al iniciar',d?.previous,'start'],['Llegó del proveedor',r?.total==null?null:r.entries,'entry'],['Salió a Sucursal',r?.total==null?null:r.sent,'sent'],['Queda en Rastro',r?.total,'remaining']].map(([title,value,color])=>`<article class="rw-kpi rw-kpi-${color}"><h4>${title}</h4><strong>${fmt(value)}</strong><span>pollos</span></article>`).join('')}</div></section>`;}).join('')}
   <p class="rw-note">Sin marinar y marinados que siguen en Rastro. Los envíos ya están descontados. No incluye existencias en Sucursal ni el inventario independiente de Móvil.</p>
   ${products.map(([p,n])=>table(report,p,n,date)).join('')}
   <p class="rw-note">Se suman entradas y salidas de la semana, no existencias de distintos días. «Quedó» muestra el último saldo disponible. Los días sin captura no se cuentan como cero.</p>
   <p class="rw-footer">Última captura: ${report.lastRecordedAt?esc(new Date(report.lastRecordedAt).toLocaleString('es-MX',{timeZone:'America/Mexico_City',dateStyle:'short',timeStyle:'short'})):'Sin captura'} · Horas CDMX · Consulta actualizada al cargar.</p>`;
 }
 function mount(host,reports,date){host.innerHTML=render(reports,date);}
 return {mount,render,daily};
});
