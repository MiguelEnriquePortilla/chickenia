/* Server-evaluated, immutable verification records. No inventory movements are created here. */
(()=>{
 const host=document.getElementById('kpi-panel');if(!host)return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const label={not_evaluated:'Práctica · sin calificación',upcoming:'Dentro de plazo',on_time:'Cumplido a tiempo',late:'Completo fuera de plazo',incomplete:'Con pendientes',missing:'Sin verificación'};
 const fmt=t=>new Date(t).toLocaleString('es-MX',{timeZone:'America/Mexico_City',hour12:false});
 const pct=(met,due)=>due?`${met}/${due} · ${Math.round(met*100/due)}%`:'Sin cortes exigibles';
 let state=null,selected=null,request=0,dirty=false,saving=false;
 const dateInput=document.getElementById('date-input');
 const date=()=>dateInput.value||new URLSearchParams(location.search).get('date')||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 async function api(options){const r=await fetch('/api/summary?kpi=1&date='+encodeURIComponent(date()),{cache:'no-store',...options});const d=await r.json();if(!r.ok)throw Error(d.error||'No se pudo conectar.');return d;}
 async function load(){
  const token=++request;host.setAttribute('aria-busy','true');
  try{const data=await api();if(token!==request)return;state=data;dirty=false;render();}
  catch(e){if(token===request)host.innerHTML=`<h2>Controles del día</h2><p role="alert">${esc(e.message)}</p><a href="/inventario.html?next=${encodeURIComponent(location.pathname+location.search)}">Entrar a ChickenIA</a> <button type="button" data-reload>Reintentar</button>`;}
  finally{if(token===request)host.removeAttribute('aria-busy');}
 }
 function render(){
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(state.serverTime));
  host.innerHTML=`<div class="kpi-heading"><div><p class="kpi-eyebrow">Hacer bien las cosas, todos los días</p><h2>Controles del día</h2></div><button type="button" data-reload>Actualizar</button></div>
   <p>Supervisión: <strong>${pct(state.met,state.due)}</strong> · Meta: 100% de los controles completos y a tiempo.</p>
   <p class="kpi-muted">Evaluación desde ${esc(state.activation)}. Horario de Ciudad de México. ${!state.active?'Esta fecha no afecta los indicadores.':''}</p>
   <div class="kpi-cuts">${state.cuts.map((c,i)=>{const future=i>0&&new Date(state.serverTime)<new Date(`${state.date}T${state.cuts[i-1].time}:00-06:00`);return `<article class="kpi-cut" data-status="${esc(c.status)}"><time>${esc(c.time)}</time><h3>${esc(c.label)}</h3><p>${esc(c.focus)}</p><strong>${esc(label[c.status])}</strong><p>${c.latest?`Última revisión: ${esc(c.latest.actor_name)} · ${esc(fmt(c.latest.created_at))}`:'Sin revisión registrada'}</p>${c.latest?`<p>Reporte ${c.latest.evaluation.reviewed?'completo':'incompleto'} · Operación ${c.latest.evaluation.ready?'lista':'con pendientes'}</p>`:''}<button type="button" data-cut="${esc(c.id)}">${state.date===today&&!future?'Revisar y registrar':'Ver detalle'}</button></article>`;}).join('')}</div>
   <div id="kpi-detail"></div>
   <details class="kpi-areas" open><summary>Primer indicador por área</summary><div class="kpi-table-wrap"><table><thead><tr><th>Área / indicador</th><th>Hoy</th><th>7 días</th><th>30 días</th></tr></thead><tbody>${state.areas.map(a=>`<tr><td><strong>${esc(a.name)}</strong><br>${esc(a.indicator)}</td><td>${pct(a.met,a.due)}</td>${state.periods.map(p=>`<td>${pct(p.areas[a.id].met,p.areas[a.id].due)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p>Se cuentan solo controles vencidos desde la activación. Revisiones tardías conservan su retraso. La verificación de Supervisión requiere que todas las áreas estén listas.</p></details>
   <details class="kpi-areas"><summary>Chicanito Móvil · indicadores por activar</summary>${state.catalog.MOBILE.map(a=>`<h3>${esc(a.name)}</h3><p><strong>${esc(a.indicator)}</strong>. ${esc(a.note)}</p>`).join('')}</details>`;
  if(selected)detail(selected);
 }
 function detail(id){
  selected=id;const c=state.cuts.find(c=>c.id===id),idx=state.cuts.indexOf(c),box=host.querySelector('#kpi-detail');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(state.serverTime));
  const writable=state.date===today&&(idx===0||new Date(state.serverTime)>=new Date(`${state.date}T${state.cuts[idx-1].time}:00-06:00`));
  const source=writable?state.sources:c.latest?.sources||state.sources,data=c.latest?.data;
  const reqs=state.catalog.AREAS.flatMap(a=>(a.requirements[id]||[]).map((text,i)=>({id:`${a.id}:${i}`,area:a.name,text})));
  const options=(values,value)=>values.map(([k,v])=>`<option value="${k}" ${k===value?'selected':''}>${v}</option>`).join('');
  const input=(key,val,caption)=>`<label>${esc(caption)}<input data-field="${key}" type="number" min="0" max="1000000" step="0.001" value="${val??''}" inputmode="decimal"></label>`;
  box.innerHTML=`<form id="kpi-form" class="kpi-form"><h3>${esc(c.time)} · ${esc(c.label)}</h3>
   <p>Verifica con cada responsable. Registrar una incidencia permite atenderla; el área queda pendiente hasta resolverla.</p>
   ${c.atDeadline?`<p><strong>Al vencer el corte:</strong> reporte ${c.atDeadline.evaluation.reviewed?'completo':'incompleto'}, operación ${c.atDeadline.evaluation.ready?'lista':'con pendientes'}. ${esc(fmt(c.atDeadline.created_at))}.</p>`:''}
   ${c.latest?`<p>Revisión ${c.latest.revision} · ${esc(c.latest.actor_name)} · ${esc(fmt(c.latest.created_at))}. Se conserva cada revisión.</p>`:''}
   ${!writable?'<p>Consulta de solo lectura. Solo se registra el día actual cuando inicia este control.</p>':''}
   <fieldset ${!writable?'disabled':''}><legend>Revisión por área</legend>${reqs.map(r=>{const check=data?.checks.find(d=>d.id===r.id);return `<div class="kpi-check" data-check="${r.id}"><label><strong>${esc(r.area)}</strong> · ${esc(r.text)}<select data-field="status">${options([['pending','Por verificar'],['ready','Verificado · listo'],['issue','Verificado · hay pendiente']],check?.status||'pending')}</select></label><label>Incidencia y acción / observación<input data-field="note" maxlength="1000" value="${esc(check?.note||'')}"></label></div>`;}).join('')}</fieldset>
   <p>Producción registrada: versión ${source.productionRevision}. <a href="/captura.html?mode=production&format=digital&date=${esc(state.date)}" target="_blank" rel="noopener">Abrir Producción Diaria</a> · <a href="/captura.html?mode=close&date=${esc(state.date)}" target="_blank" rel="noopener">Abrir Cierre de Caja</a>. Guarda allí las cantidades y después actualiza este control.</p>
   <p>Las cantidades producidas se recuperan del reporte guardado. Aquí registras la existencia verificada al corte y su calidad; no se crea otra producción ni movimiento de inventario.</p>
   <fieldset ${!writable?'disabled':''}><legend>Productos aplicables del día · ${source.products.filter(p=>p.active).length}</legend>
   ${source.products.filter(p=>p.active).map(p=>{let r=data?.products.find(d=>d.id===p.id);if(writable&&c.latest?.sources.productionRevision!==source.productionRevision)r=undefined;return `<details class="kpi-product" data-product="${p.id}"><summary>${esc(p.name)} · ${esc(p.unit||'unidad pendiente')} · ${r?.quality==='approved'&&r.available!==null?'Revisado':'Por revisar'}</summary><p>Sobrante anterior: ${p.previous??'—'} · Producción registrada al momento: ${p.produced??'—'}${id==='cierre'?' · Sobrante final del reporte: '+(p.closing??'—'):''}</p><div class="kpi-fields">${input('available',r?.available,'Cantidad disponible verificada ('+(p.unit||'define unidad en Producción')+')')}<label>Calidad<select data-field="quality">${options([['pending','Por revisar'],['approved','Revisada · aprobada'],['issue','Revisada · hay incidencia']],r?.quality||'pending')}</select></label>${id==='ajuste'?`${input('inProcess',r?.inProcess,'Cantidad en proceso')}${input('remainingDemand',r?.remainingDemand,'Venta restante estimada')}${input('additional',r?.additional,'Producción adicional acordada')}<label>Decisión<select data-field="decision">${options([['pending','Por decidir'],['continue','Continuar'],['reduce','Reducir'],['stop','Detener / no producir más']],r?.decision||'pending')}</select></label>`:''}<label>Motivo y acción ${id==='ajuste'?'(obligatorio)':''}<input data-field="note" maxlength="1000" value="${esc(r?.note||'')}"></label></div></details>`;}).join('')}</fieldset>
   <label>Observaciones del corte<textarea id="kpi-notes" maxlength="2000" ${!writable?'disabled':''}>${esc(data?.notes||'')}</textarea></label>
   ${writable?`<p>Verifica: <strong>${esc(state.actor)}</strong>. La hora se guarda automáticamente. ${!state.active?'Registro de práctica, sin calificación.':''}</p><button type="submit">Guardar verificación del corte</button>`:''}
   <p id="kpi-feedback" role="status" aria-live="polite"></p>
   ${c.history?.length?`<details><summary>Historial de revisiones (${c.history.length})</summary><ul>${c.history.map(r=>`<li>Revisión ${r.revision} · ${esc(r.actor)} · ${esc(fmt(r.time))}: reporte ${r.reviewed?'completo':'incompleto'}, operación ${r.ready?'lista':'con pendientes'}. ${esc(r.notes)}</li>`).join('')}</ul></details>`:''}
   ${c.latest?`<details><summary>Pendientes de la última revisión</summary>${c.latest.evaluation.areas.filter(a=>a.missing.length||a.issues.length).map(a=>`<h4>${esc(a.name)}</h4><ul>${[...a.missing,...a.issues].map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`).join('')||'<p>Sin pendientes.</p>'}</details>`:''}</form>`;
  box.querySelector('form').addEventListener('submit',save);
 }
 async function save(e){
  e.preventDefault();if(saving)return;saving=true;
  const form=e.target,feedback=form.querySelector('#kpi-feedback'),button=form.querySelector('[type=submit]'),c=state.cuts.find(c=>c.id===selected);
  const val=(el,key)=>el.querySelector(`[data-field="${key}"]`)?.value;
  const number=(el,key)=>{const v=val(el,key);return v==null||v===''?null:Number(v);};
  const data={checks:[...form.querySelectorAll('[data-check]')].map(el=>({id:el.dataset.check,status:val(el,'status'),note:val(el,'note')})),products:[...form.querySelectorAll('[data-product]')].map(el=>({id:el.dataset.product,available:number(el,'available'),quality:val(el,'quality'),note:val(el,'note'),inProcess:number(el,'inProcess'),remainingDemand:number(el,'remainingDemand'),additional:number(el,'additional'),decision:val(el,'decision')||'pending'})),notes:form.querySelector('#kpi-notes').value};
  button.disabled=true;feedback.textContent='Guardando verificación…';
  try{await api({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:state.date,cut:selected,revision:c.revision,sourceRevision:state.sources.productionRevision,cashRevision:state.sources.cashRevision,data})});dirty=false;await load();host.querySelector('#kpi-feedback').textContent='Verificación guardada con responsable y hora. Revisa los pendientes debajo.';}
  catch(e){feedback.textContent=e.message;button.disabled=false;}
  finally{saving=false;}
 }
 host.addEventListener('input',()=>{dirty=true;});
 host.addEventListener('click',e=>{if(saving)return;const cut=e.target.closest('[data-cut]');if(cut){if(dirty){host.querySelector('#kpi-feedback').textContent='Guarda esta revisión antes de cambiar de corte, o usa Actualizar para descartarla.';return;}detail(cut.dataset.cut);host.querySelector('#kpi-detail').scrollIntoView({behavior:'smooth',block:'start'});}if(e.target.closest('[data-reload]'))load();});
 dateInput.addEventListener('change',e=>{if(saving||dirty){e.stopImmediatePropagation();dateInput.value=state.date;const feedback=host.querySelector('#kpi-feedback');if(feedback)feedback.textContent='Guarda la revisión o usa Actualizar antes de cambiar de fecha.';return;}selected=null;load();},true);
 window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
 load();
})();
