'use strict';
window.ChickenProteinDashboard=(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const model=window.ChickenProteinSummary,fmt=model.fmt;
 const time=v=>v?new Date(v).toLocaleString('es-MX',{timeZone:'America/Mexico_City',dateStyle:'short',timeStyle:'short'}):'Sin captura';
 function mount(host,reports,date){
  const filter=host.querySelector('[data-inventory]')?.value||'all';
  const protein=host.querySelector('[data-product]')?.value||'all';
  const groups=model.summarize(reports);
  host.innerHTML=`<div class="pd-heading"><div><p class="pd-eyebrow">CONTROL DE ABASTECIMIENTO</p><h2>Proteínas</h2><p>Existencias en CEDIS · ${esc(date)} · pollos</p></div><div class="pd-filters"><label>Inventario<select data-inventory><option value="all">Ambos</option><option value="sucursal">Sucursal</option><option value="movil">Móvil</option></select></label><label>Proteína<select data-product><option value="all">Todas</option><option value="rosti">Rostizado</option><option value="cruji">Crujiente</option></select></label></div></div><div data-content></div>`;
  const inventorySelect=host.querySelector('[data-inventory]'),productSelect=host.querySelector('[data-product]');
  inventorySelect.value=filter;productSelect.value=protein;
  function render(){
   const chosen=groups.filter(g=>inventorySelect.value==='all'||g.inventory===inventorySelect.value);
   const rows=chosen.flatMap(g=>g.rows.filter(r=>productSelect.value==='all'||r.protein===productSelect.value).map(r=>({...r,group:g.name,inventory:g.inventory})));
   const alerts=chosen.flatMap(g=>g.alerts.map(a=>`${g.name} · ${a}`));
   const link=(r)=>`/${r.inventory==='movil'?'proteinas-movil':'proteinas'}.html?date=${encodeURIComponent(date)}`;
   const max=Math.max(1,...rows.map(r=>r.total||0));
   const week=chosen.find(g=>g.week)?.week||[];
   const days=week.map(w=>{
    const values=chosen.filter(g=>!g.unavailable).flatMap(g=>(g.week.find(x=>x.date===w.date)?.rows||[]).filter(r=>productSelect.value==='all'||r.protein===productSelect.value));
    const captured=values.filter(r=>r.total!=null);
    return {date:w.date,entries:model.sum(captured.map(r=>r.entries)),sent:model.sum(captured.map(r=>r.sent)),available:captured.length>0,future:w.date>date};
   });
   const maxDay=Math.max(1,...days.flatMap(d=>[d.entries,d.sent]));
   const cell=(label,value)=>`<td data-label="${label}">${fmt(value)}</td>`;
   host.querySelector('[data-content]').innerHTML=`${alerts.length?`<details class="pd-alerts"><summary>Requiere atención · ${alerts.length} aviso(s) en los inventarios seleccionados</summary><ul>${alerts.map(a=>`<li>${esc(a)}</li>`).join('')}</ul></details>`:'<p class="pd-clear">Sin recepciones pendientes ni diferencias registradas hoy.</p>'}
    <div class="pd-table-wrap"><table class="pd-table"><caption class="pd-sr">Resumen de proteínas en pollos</caption><thead><tr><th>Inventario / proteína</th><th>Sin marinar</th><th>Marinados</th><th>Enviado hoy</th><th>Por confirmar</th></tr></thead><tbody>${rows.map(r=>`<tr><th><a href="${link(r)}">${esc(r.group)} <span>${esc(r.name)}</span></a></th>${cell('Sin marinar',r.raw.current)}${cell('Marinados',r.marinated.current)}${cell('Enviado hoy',r.total==null?null:r.sent)}<td data-label="Por confirmar"><button type="button" data-detail="${r.inventory}:${r.protein}" class="pd-number ${r.pending?'pd-pending':''}" aria-label="Ver entregas de ${esc(r.group+' '+r.name)}">${fmt(r.pending)}</button></td></tr>`).join('')||'<tr><td colspan="5">No hay proteínas para esta selección.</td></tr>'}</tbody></table></div>
    <p class="pd-note">Por confirmar: pollos enviados sin recepción confirmada, incluidos días anteriores. Marinados no significa cocinados.</p>
    <div class="pd-charts"><section><h3>Existencias en CEDIS</h3><p class="pd-legend"><span class="pd-dot pd-raw"></span>Sin marinar <span class="pd-dot pd-mar"></span>Marinados</p>${rows.map(r=>`<button type="button" class="pd-stock" data-detail="${r.inventory}:${r.protein}" aria-label="${esc(r.group+' '+r.name)}: ${fmt(r.raw.current)} sin marinar, ${fmt(r.marinated.current)} marinados"><span class="pd-bar-label">${esc(r.group+' · '+r.name)}<strong>${fmt(r.total)}</strong></span><span class="pd-track"><span class="pd-raw" style="width:${100*(r.raw.current||0)/max}%"></span><span class="pd-mar" style="width:${100*(r.marinated.current||0)/max}%"></span></span></button>`).join('')}<p class="pd-note">Toca una barra para ver sus entregas.</p></section>
    <section><h3>Movimientos de la semana</h3><p class="pd-legend"><span class="pd-dot pd-raw"></span>Proveedor <span class="pd-dot pd-mar"></span>Envíos</p><div class="pd-week">${days.map(d=>`<button type="button" class="pd-day" data-day="${d.date}" ${d.future?'disabled':''} aria-label="${d.date}: ${d.future?'fecha posterior':!d.available?'sin captura':`${fmt(d.entries)} proveedor, ${fmt(d.sent)} enviados`}"><span class="pd-columns"><span class="pd-raw" style="height:${100*d.entries/maxDay}%"></span><span class="pd-mar" style="height:${100*d.sent/maxDay}%"></span></span><span>${['dom','lun','mar','mié','jue','vie','sáb'][new Date(d.date+'T12:00:00Z').getUTCDay()]}</span><small>${d.future?'—':d.available?fmt(d.entries)+' / '+fmt(d.sent):'Sin dato'}</small></button>`).join('')}</div><p class="pd-note">Toca un día para consultar sus movimientos.${chosen.some(g=>g.unavailable)?' Totales parciales: falta un inventario.':''}</p></section></div>
    <section data-detail-panel hidden class="pd-detail" tabindex="-1"></section>
    <div class="pd-footer">${chosen.map(g=>`<span>${esc(g.name)} · Última captura: ${g.unavailable?'No disponible':esc(time(g.lastRecordedAt))}</span>`).join('')}<span>Horas CDMX · Consulta actualizada al cargar.</span></div>`;
   host.querySelectorAll('[data-detail]').forEach(button=>button.addEventListener('click',()=>{
    const [inventory,protein]=button.dataset.detail.split(':'),g=groups.find(g=>g.inventory===inventory),r=g.rows.find(r=>r.protein===protein);
    const shipments=g.shipments.filter(s=>s.protein===protein).slice().reverse();
    detail(`${g.name} · ${r.name}`,`<p>${fmt(r.raw.current)} sin marinar · ${fmt(r.marinated.current)} marinados en CEDIS.</p><p>Hoy: proveedor ${fmt(r.entries)} · marinado ${fmt(r.prepared)} · enviado ${fmt(r.sent)} · merma ${fmt(r.waste)} · rectificación ${fmt(r.adjustment)}.</p>${shipments.length?`<ul>${shipments.slice(0,8).map(s=>`<li>${esc(s.date)} · ${fmt(s.sent)} enviados · ${s.receipt?`${fmt(s.receipt.amount)} recibidos (diferencia ${fmt(s.receipt.difference)})`:'Recepción pendiente'}<br><small>Entregó ${esc(s.actor)} · ${esc(time(s.at))}${s.receipt?` · Recibió ${esc(s.receipt.actor)} · ${esc(time(s.receipt.at))}`:''}</small></li>`).join('')}</ul>`:'<p>Sin envíos registrados.</p>'}<a href="${link(r)}">Ver historial completo y conteos</a>`);
   }));
   host.querySelectorAll('[data-day]').forEach(button=>button.addEventListener('click',()=>{
    const day=button.dataset.day;
    const lines=chosen.filter(g=>!g.unavailable).flatMap(g=>(g.week.find(w=>w.date===day)?.rows||[]).filter(r=>productSelect.value==='all'||r.protein===productSelect.value).map(r=>`<li>${esc(g.name+' · '+r.name)}: ${r.total==null?'Sin captura':`proveedor ${fmt(r.entries)} · enviados ${fmt(r.sent)} · merma ${fmt(r.waste)} · rectificación ${fmt(r.adjustment)}`}</li>`));
    detail('Movimientos · '+day,`<ul>${lines.join('')}</ul>`);
   }));
  }
  function detail(title,body){const panel=host.querySelector('[data-detail-panel]');panel.hidden=false;panel.innerHTML=`<button type="button" class="pd-close">Cerrar detalle</button><h3>${esc(title)}</h3>${body}`;panel.querySelector('button').onclick=()=>{panel.hidden=true;inventorySelect.focus();};panel.focus();}
  inventorySelect.onchange=()=>{productSelect.querySelector('[value="cruji"]').disabled=inventorySelect.value==='movil';if(inventorySelect.value==='movil'&&productSelect.value==='cruji')productSelect.value='all';render();};productSelect.onchange=render;
  inventorySelect.onchange();
 }
 return {mount};
})();
