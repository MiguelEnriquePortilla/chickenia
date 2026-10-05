(()=>{
 const host=document.getElementById('checklist-timeline');if(!host)return;
 const dashboard=host.dataset.view==='dashboard';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const percent=n=>n==null?'—':`${Math.round(n)}%`;
 let request=0,view=null,context=null;
 async function refresh(summary){
  context=summary;if(summary.location?.type==='moto'){host.hidden=true;return;}host.hidden=false;
  const token=++request;
  try{
   const response=await fetch(`/api/summary?timeline=1&location_id=${encodeURIComponent(summary.location.id)}&date=${encodeURIComponent(summary.date)}`,{cache:'no-store'});
   const data=await response.json();if(token!==request)return;if(!response.ok)throw Error(data.error);
   view=data;render();
  }catch(e){if(token===request)host.innerHTML=`<p role="alert">${esc(e.message||'No se pudieron cargar los cortes.')}</p><button type="button" data-retry>Reintentar</button>`;}
 }
 function render(){
  const historyOpen=host.querySelector('.timeline-history')?.open;
  if(view.missing){host.innerHTML='<p>Sin historial de estos cortes para la fecha elegida. La nueva evaluación empieza el 6 de octubre de 2026; los reportes anteriores se conservan.</p>';return;}
  const next=view.cuts.find(c=>!c.passed),last=[...view.cuts].reverse().find(c=>c.passed);
  const practice=!view.active?' Hoy es transición, sin calificación. Evaluación desde el 6 de octubre.':'';
  if(!dashboard){
   host.innerHTML=`<p><strong>${next?`Próximo corte: ${esc(next.time)}`:'Cortes del día registrados'}</strong> · 10:00 · 12:00 · 16:00 · 19:00</p><p>Palomea aquí al verificar. Los cortes se guardan automáticamente; no hay otra lista que llenar.${practice}</p><p class="timeline-muted">${last?`Al corte de ${last.time}: ${last.complete} de ${last.total} áreas al 100%. `:''}<a href="/dashboard.html?date=${esc(view.date)}">Ver gráfico e historial</a></p>`;
   return;
  }
  const current=last||view.cuts.find(c=>c.begun)||view.cuts[0];
  host.innerHTML=`<div class="timeline-title"><div><p class="timeline-eyebrow">Seguimiento del checklist</p><h2>Áreas a tiempo</h2></div><button type="button" data-retry>Actualizar</button></div>
   <p class="timeline-lead">${last?`Al corte de ${last.time}`:'Avance antes del primer corte'}: <strong>${current.complete} de ${current.total} áreas al 100%</strong></p>
   <p>100% = todo lo que correspondía hasta esa hora. Cada tramo conserva el resultado al corte.${practice}</p>
   ${view.closed?`<p><strong>Día sin operación: excluido de promedios.</strong> ${esc(view.closedReason)}</p>`:''}
   <div class="timeline-legend"><span>🟢 Completo</span><span>🟡 Con pendientes</span><span>◌ En curso / próximo</span></div>
   <div class="timeline-scroll"><div class="timeline-chart" role="table" aria-label="Cumplimiento por área a lo largo del día">
    <div class="timeline-row timeline-axis" role="row"><span role="columnheader">Área / hora →</span>${view.cuts.map(c=>`<span role="columnheader">${esc(c.time)}<small>${esc(c.label)}</small></span>`).join('')}</div>
    ${view.areas.map(area=>`<div class="timeline-row" role="row"><strong role="rowheader">${esc(area.name)}</strong>${view.cuts.map((c,i)=>{const a=c.areas.find(a=>a.code===area.code);const future=c.status==='future';const tone=future?'future':a.score==null?'na':a.complete?'complete':'pending';return `<div role="cell"><button type="button" class="timeline-segment ${tone} ${c.due?'':'provisional'}" data-area="${esc(area.code)}" data-index="${i}" aria-label="${esc(area.name)} ${c.time}: ${future?'próximo':percent(a.score)}${c.due?' al corte':' provisional'}" ${future?'disabled':''}><span>${future?'Próximo':percent(a.score)}</span><small>${future?'':c.due?'Al corte':view.active?'En curso':'Transición'}</small></button></div>`;}).join('')}</div>`).join('')}
   </div></div><p class="timeline-muted">Toca un tramo para consultar lo que faltaba. Las palomitas tardías no cambian los cortes anteriores.</p><div id="timeline-detail" aria-live="polite"></div>
   <details class="timeline-history" ${historyOpen?'open':''}><summary>Calificaciones diarias y promedios de 7 y 30 días</summary><p>La nota diaria es el promedio de los cortes aplicables del área. Los promedios incluyen solo días completos con historial desde el inicio de evaluación; hoy es provisional hasta las 19:00.</p>
    <div class="timeline-scroll"><table><thead><tr><th>Área</th><th>${view.final?'Día':'Día parcial'}</th><th>7 días</th><th>30 días</th></tr></thead><tbody>${view.areas.map(a=>`<tr><th>${esc(a.name)}</th><td>${percent(a.score)}</td>${view.periods.map(p=>`<td>${percent(p.areas[a.code]?.score)}<small>${p.areas[a.code]?.days||0} días</small></td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <h3>Historial de días</h3><div class="timeline-days">${view.history.filter(d=>d.active).reverse().map(d=>`<a href="/dashboard.html?date=${esc(d.date)}">${esc(d.date)}${d.closed?' · sin operación':d.final?'':' · parcial'}</a>`).join('')||'<p>Todavía no hay días evaluados.</p>'}</div>
    <p>Gerencia: si no se trabajó esta fecha, puede excluirse de los promedios conservando los registros y el motivo.</p><button type="button" data-calendar>${view.closed?'Marcar como día con operación':'Marcar día sin operación'}</button></details>`;
 }
 host.addEventListener('click',async e=>{
  if(e.target.closest('[data-calendar]')){
   const reason=prompt(`Motivo para ${view.closed?'incluir':'excluir'} el día ${view.date} de los promedios:`);if(!reason)return;
   const button=e.target.closest('[data-calendar]');button.disabled=true;
   try{const r=await fetch(`/api/summary?timeline=1&location_id=${encodeURIComponent(context.location.id)}&date=${encodeURIComponent(view.date)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({closed:!view.closed,reason})});const d=await r.json();if(!r.ok)throw Error(d.error);view=d;render();}catch(error){alert(error.message);button.disabled=false;}return;
  }
  if(e.target.closest('[data-retry]')){if(context)refresh(context);return;}
  const button=e.target.closest('[data-area]');if(!button)return;
  const cut=view.cuts[Number(button.dataset.index)],area=cut.areas.find(a=>a.code===button.dataset.area);
  document.getElementById('timeline-detail').innerHTML=`<div class="timeline-detail"><h3>${esc(area.name)} · ${cut.time} · ${percent(area.score)}</h3><p>${cut.due?'Resultado conservado al corte.':'Avance provisional.'}</p>${area.pending.length?`<ul>${area.pending.map(p=>`<li>${esc(p.name)} <small>${esc(p.reason)}</small></li>`).join('')}</ul>`:'<p>Sin pendientes para este corte.</p>'}</div>`;
 });
 window.ChickenTimeline={refresh};
})();
