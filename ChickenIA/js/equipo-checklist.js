(()=>{
'use strict';
const root=document.getElementById('calibre-app');if(!root)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let date=new URLSearchParams(location.search).get('date')||today(),view,selected='rastro',pending=new Map(),saving=false,failed=false,timer,loadSequence=0,assigning=false,closingFeedback=false;
const areaNames = [
 ['rastro','Rastro y Apertura de Sucursal'], ['cocina','Cocina'], ['rosticero','Rosticero'],
 ['freidoras','Freidoras'], ['ventas_barras','Barras / Ventas'], ['caja','Caja'],
 ['trastes','Lavado de Trastes'], ['ayudante_general','Ayudante General'], ['supervision','Supervisión']
];
const historyMode = new URLSearchParams(location.search).get('view') === 'history';
const requested=new URLSearchParams(location.search).get('area');
const testMode=new URLSearchParams(location.search).get('test')==='1';
const testQuery=testMode?'&test=1':'';
let browsingAreas=!historyMode&&!requested;
let returnToAreaIndex=false;
const areaIcons={
 rastro:'<path d="M3 20h26M5 20V9l11-5 11 5v11M10 20v-8h12v8M10 16h12"/>',
 cocina:'<path d="M6 15h20v5a6 6 0 0 1-6 6h-8a6 6 0 0 1-6-6zM3 16h3m20 0h3M8 11h16m-8-4v4"/>',
 rosticero:'<rect x="4" y="7" width="24" height="19" rx="3"/><path d="M4 12h24M9 19h14m-11 0a4 3 0 1 0 8 0 4 3 0 1 0-8 0"/>',
 freidoras:'<path d="M5 14h21l-3 12H8zM26 14l3-4M12 18v4m4-4v4m4-4v4M11 10c-2-2 2-3 0-5m6 5c-2-2 2-3 0-5"/>',
 ventas_barras:'<path d="M4 23h24M6 20h20a10 10 0 0 0-20 0zm10-10V7m-2 0h4"/>',
 caja:'<rect x="4" y="8" width="24" height="17" rx="3"/><path d="M4 14h24M9 20h4m4 0h6"/>',
 trastes:'<circle cx="16" cy="17" r="10"/><circle cx="16" cy="17" r="6"/><path d="M26 4v6m-3-3h6"/>',
 ayudante_general:'<path d="M16 5v8m-4-4h8M5 22l5-5h8a2 2 0 0 1 0 4h-4m5-1 5-4a2 2 0 0 1 3 3l-7 7H9z"/>',
 supervision:'<rect x="7" y="6" width="18" height="22" rx="3"/><path d="M12 5h8v4h-8zM12 18l3 3 6-7"/>'
};
root.innerHTML=`<div class="supervision-heading"><h1>Supervisión de áreas</h1><nav class="supervision-tabs" aria-label="Vista de supervisión">
 <a id="equipo-today">Hoy</a><a id="equipo-history-link">Historial</a></nav></div>
 <section id="supervision-directory" aria-label="Áreas de trabajo"><p id="supervision-directory-status" role="status"></p><nav id="supervision-index" aria-label="Acceso rápido a las áreas"></nav><div id="supervision-cards"></div></section>
 <div class="supervision-layout">
  <aside class="supervision-areas"><h2>Áreas</h2><div id="equipo-area-list"></div><label class="supervision-mobile-area">Área<select id="equipo-area"></select></label></aside>
  <div class="supervision-detail">
   <button type="button" id="supervision-back">Todas las áreas</button>
   <div class="equipo-controls"><div><p class="supervision-sheet-label">Ficha de área</p><h2 id="equipo-selection"></h2></div><label>Fecha<input id="calibre-date" type="date" value="${esc(date)}"></label></div>
   <div id="equipo-notice"><p id="equipo-status" role="status" aria-live="polite">Cargando…</p><button id="equipo-retry" type="button" hidden>Reintentar guardado</button><button id="equipo-reload" type="button" hidden>Volver a cargar</button></div>
   <section id="equipo-responsible"></section><section id="equipo-sheet"></section>
   <details class="supervision-options" hidden><summary>Reportes y seguimiento</summary>
    <div class="equipo-share-tools"><button type="button" data-equipo-share="area">Compartir esta área</button><button type="button" data-equipo-share="general">Compartir todo el equipo</button></div>
    <a id="equipo-weekly-report" target="_blank" rel="noopener">Ver reporte semanal para retroalimentación</a>
    <section id="equipo-person-history"></section>
   </details>
   <section class="equipo-history" hidden><h3>Revisiones guardadas</h3><div id="equipo-history"></div></section>
  </div>
 </div>`;
const sheet=root.querySelector('#equipo-sheet'),status=root.querySelector('#equipo-status'),dateInput=root.querySelector('#calibre-date'),areaInput=root.querySelector('#equipo-area'),retry=root.querySelector('#equipo-retry');
const areaList=root.querySelector('#equipo-area-list'), reloadButton=root.querySelector('#equipo-reload');
const history=root.querySelector('.equipo-history'), reportOptions=root.querySelector('.supervision-options');
const todayLink=root.querySelector('#equipo-today'), historyLink=root.querySelector('#equipo-history-link');
const directory=root.querySelector('#supervision-directory'), layout=root.querySelector('.supervision-layout');
const cards=root.querySelector('#supervision-cards'), back=root.querySelector('#supervision-back');
const areaIndex=root.querySelector('#supervision-index');
back.hidden=historyMode;
(historyMode?historyLink:todayLink).setAttribute('aria-current','page');

function showWorkspace(){
 directory.hidden=!browsingAreas;
 layout.hidden=browsingAreas;
}

function renderAreas(){
 const focusedArea=document.activeElement?.dataset.supervisionArea;
 const labels=view?.areas.map(({spec})=>[spec.code,spec.name])||areaNames;
 if(!labels.some(([code])=>code===selected))selected=labels[0][0];
 areaInput.innerHTML=labels.map(([code,name])=>`<option value="${esc(code)}">${esc(name)}</option>`).join('');
 areaInput.value=selected;
 areaList.innerHTML=labels.map(([code,name])=>{
  const row=view?.areas.find(({spec})=>spec.code===code);
  const progress=row?.revision ? tally(row).replace(' actividades verificadas','') : view&&!view.catalogOnly ? 'Sin revisión' : '';
  return `<button type="button" data-supervision-area="${esc(code)}" data-area-tone="${esc(code)}" aria-pressed="${code===selected}">
   <span class="supervision-area-icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${areaIcons[code]||areaIcons.supervision}</svg></span>
   <span class="supervision-area-name">${esc(name)}${progress?`<small>${esc(progress)}</small>`:''}</span>
  </button>`;
 }).join('');
 if(focusedArea)Array.from(areaList.children).find(button=>button.dataset.supervisionArea===focusedArea)?.focus({preventScroll:true});
 root.querySelector('#equipo-selection').textContent=labels.find(([code])=>code===selected)[1];
 layout.querySelector('.supervision-detail').dataset.areaTone=selected;
 areaInput.closest('label').dataset.areaTone=selected;
 const area=encodeURIComponent(selected);
 todayLink.href=testMode?'?test=1':'?';
 historyLink.href=`?view=history&area=${area}${testQuery}`;
 areaIndex.innerHTML=labels.map(([code,name])=>`<button type="button" data-directory-area="${esc(code)}" data-area-tone="${esc(code)}">${esc(code==='rastro'?'Rastro':name)}</button>`).join('');
 cards.innerHTML=labels.map(([code,name])=>{
  const row=view?.areas.find(({spec})=>spec.code===code);
  const count=row?.revision?tally(row):row?`${row.spec.points.length} actividades`:'';
  const artId=`area-art-${esc(code)}`;
  return `<button type="button" class="supervision-card" data-directory-area="${esc(code)}" data-area-tone="${esc(code)}">
   <span class="supervision-card-copy"><strong>${esc(name)}</strong>${count?`<small>${esc(count)}</small>`:''}</span>
   <span class="supervision-card-art" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <defs><linearGradient id="${artId}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="var(--tile-light)"/><stop offset="1" stop-color="var(--tile-figure)"/></linearGradient></defs>
    <defs><g id="${artId}-symbol" stroke-width="2.35">${areaIcons[code]||areaIcons.supervision}</g></defs>
    <use href="#${artId}-symbol" stroke="var(--tile-depth)" transform="translate(0 1.1)"/>
    <use href="#${artId}-symbol" stroke="url(#${artId})"/>
   </svg></span>
   <span class="supervision-card-open" aria-hidden="true">Abrir ficha</span></button>`;
 }).join('');
 showWorkspace();
}
async function request(body){const r=await fetch(`/api/summary?calibre=1&date=${encodeURIComponent(date)}${testQuery}`,{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date,...body,...(testMode?{test:"1"}:{})})}:{})});const d=await r.json();if(!r.ok){if(r.status===401)location.replace('/inventario.html?next='+encodeURIComponent(location.pathname+location.search));throw Object.assign(Error(d.error||'No se pudo guardar.'),{status:r.status,catalog:r.status===503?d.catalog:undefined});}return d;}
const points=row=>row.data.checklistPoints||row.data.points;
function extras(row){return row.data.simpleExtras||(row.data.extra?.verifiedAt&&row.data.extra.achieved?{[row.data.extra.choice]:{done:true,note:row.data.extra.result||''}}:{});}
function tally(row){const all=points(row),done=row.spec.points.filter(p=>all[p.id]?.status==='done').length;const bonus=done===row.spec.points.length&&Object.values(extras(row)).some(e=>e.done);return `${done} de ${row.spec.points.length} actividades verificadas${bonus?' · 120% · ¡Calibre Chicanito!':''}`;}
function render(){
 const row=view.areas.find(r=>r.spec.code===selected)||view.areas[0];selected=row.spec.code;renderAreas();let last='';
 const canEvaluate=!historyMode&&view.canWrite&&(date<view.assignmentStart||!!row.responsible);
 sheet.classList.toggle('supervision-catalog',Boolean(view.catalogOnly));
 if(!view.catalogOnly&&(!historyMode||view.date!==today()))renderResponsible(row);
 root.querySelector("#equipo-weekly-report").href="/evaluacion-semanal.html?date="+encodeURIComponent(date)+"&area="+encodeURIComponent(selected);
 sheet.innerHTML=`<header class="equipo-sheet-head"><h2>${esc(row.spec.name)}</h2><p id="equipo-progress">${tally(row)}</p></header>${row.spec.points.map(p=>{const section=p.id.split('.')[0],heading=last!==section?`<h3>${esc(row.spec.blocks[Number(section)-1])}</h3>`:'';last=section;const saved=points(row)[p.id]||{};return `${heading}<div class="equipo-point" data-point="${p.id}"><label class="equipo-task"><input type="checkbox" ${saved.status==='done'?'checked':''} ${canEvaluate?'':'disabled'}><span><strong>${esc(p.id)} · ${esc(p.title)}</strong><span>${esc(p.text)}</span></span></label><details class="supervision-note" ${saved.note?'open':''}><summary>Nota</summary><label class="equipo-note">Nota de la actividad<input type="text" maxlength="1200" value="${esc(saved.note||'')}" ${canEvaluate?'':'readonly'}></label></details></div>`;}).join('')}<h3 class="equipo-extra-heading">¡Vamos por el 120%!</h3><p>Marca las actividades adicionales realizadas. Con tu ficha completa y al menos una actividad extra verificada, llegas al 120%.</p>${row.spec.extras.map((e,i)=>{const saved=extras(row)[i]||{};return `<div class="equipo-point equipo-extra" data-extra="${i}"><label class="equipo-task"><input type="checkbox" ${saved.done?'checked':''} ${canEvaluate?'':'disabled'}><span><strong>${esc(e.title)}</strong><span>${esc(e.text)}</span></span></label><details class="supervision-note" ${saved.note?'open':''}><summary>Comentario</summary><label class="equipo-note">Comentario de la actividad<input type="text" maxlength="1200" value="${esc(saved.note||'')}" ${canEvaluate?'':'readonly'}></label></details></div>`;}).join('')}`;
 sheet.insertAdjacentHTML('beforeend',feedbackForm(row,canEvaluate));
 root.querySelector('#equipo-history').innerHTML=(view.checklistHistory||[]).filter(h=>h.area===selected).map(h=>{const ps=h.points||h.original_points||{},done=h.spec.points.filter(p=>ps[p.id]?.status==='done').length;return `<p><a href="?view=history&date=${esc(h.date)}&area=${selected}${testQuery}">${esc(h.date)}</a> · ${done}/${h.spec.points.length} verificadas</p>`;}).join('')||'<p>Todavía no hay revisiones guardadas para esta área.</p>';
 root.querySelector('#equipo-history').insertAdjacentHTML('beforeend',(view.history||[]).filter(h=>h.scope===selected||h.scope==='general').map(h=>`<details><summary>Reporte preparado · ${esc(h.date)} · ${h.scope==='general'?'Todo el equipo':esc(row.spec.name)}</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(h.message)}</pre></details>`).join(''));
 const showReview=view.catalogOnly ? !historyMode : !historyMode || new URLSearchParams(location.search).has('date') || date!==today();
 sheet.hidden=!showReview;
 root.querySelector('#equipo-responsible').hidden=!showReview;
 history.hidden=!historyMode||view.catalogOnly;
 reportOptions.hidden=historyMode||view.catalogOnly;
 if(view.catalogOnly){
  root.querySelector('#equipo-progress').textContent=`${row.spec.points.length} actividades · ${row.spec.extras.length} adicionales`;
  sheet.querySelector('#feedback-state')?.closest('section').remove();
  status.textContent=historyMode
   ? 'El historial está temporalmente fuera de servicio.'
   : 'Modo consulta. Guardado e historial temporalmente no disponibles.';
  return;
 }
 status.textContent=!showReview?'Selecciona una revisión para ver su detalle.':!historyMode&&view.canWrite
   ? (canEvaluate?'Cada actividad se guarda al marcarla.':'Guarda al responsable de hoy para comenzar.')
   : 'Consulta de la revisión guardada.';
}
function feedbackForm(row,canEvaluate){
 if(date<(view.feedbackStart||'2026-11-09'))return '<p>Retroalimentación diaria obligatoria a partir del 9 de noviembre de 2026.</p>';
 const f=row.data.feedback||{};
 return '<section class="equipo-feedback"><h3>Retroalimentación para '+esc(row.responsible?.name||'el responsable del día')+'</h3><p id="feedback-state">'+(f.closedAt?'Evaluación cerrada · '+esc(f.closedBy):'Retroalimentación pendiente')+'</p><p>Escribe un hecho concreto y una acción para mantener o mejorar. Ambos campos son obligatorios al cerrar.</p><label>Observación del día<textarea id="feedback-observation" maxlength="180" rows="3" '+(canEvaluate?'':'readonly')+'>'+esc(f.observation||'')+'</textarea></label><label>Recomendación al asociado<textarea id="feedback-recommendation" maxlength="180" rows="3" '+(canEvaluate?'':'readonly')+'>'+esc(f.recommendation||'')+'</textarea></label><p>Máximo 180 caracteres por campo. Los borradores se guardan automáticamente.</p>'+(canEvaluate?'<button type="button" id="feedback-close">Cerrar evaluación del día</button>':'')+(f.actor?'<p>Registró: '+esc(f.actor)+'</p>':'')+'</section>';
}
function feedbackState(row){const el=sheet.querySelector('#feedback-state');if(el)el.textContent=row.data.feedback?.closedAt?'Evaluación cerrada · '+row.data.feedback.closedBy:'Retroalimentación pendiente';}
function invalidateFeedback(row){if(row.data.feedback)row.data.feedback={...row.data.feedback,closedAt:null,closedBy:null};feedbackState(row);}
function renderResponsible(row){
 const host=root.querySelector('#equipo-responsible');
 if(row.responsible){host.innerHTML='<p><strong>Responsable del día: '+esc(row.responsible.name)+'</strong></p>';return;}
 if(historyMode||!view.canWrite){host.innerHTML='<p>Responsable: sin identificar en este registro.</p>';return;}
 const occupied=new Map((view.assignments||[]).map(a=>[a.id,a.area]));
 const options=(view.employees||[]).filter(e=>e.active).map(e=>{
  const area=occupied.get(e.id),areaName=view.areas.find(r=>r.spec.code===area)?.spec.name||area;
  return '<option value="'+e.id+'"'+(occupied.has(e.id)?' disabled':'')+'>'+esc(e.name)+(occupied.has(e.id)?' · Ya asignada/o a '+esc(areaName):'')+'</option>';
 }).join('');
 host.innerHTML='<label>Responsable de hoy<select id="equipo-responsible-select"><option value="">Seleccionar persona</option>'+options+'</select></label><p>Las personas asignadas a otra área aparecen deshabilitadas. Cada persona tiene una sola área por día.</p><p>Al guardar, la persona y el área quedan asignadas para todo el día. No se podrán cambiar.</p><button type="button" id="equipo-assign">Guardar responsable del día</button>';
 host.querySelector('button').addEventListener('click',async()=>{
  if(assigning||saving||pending.size)return;const employeeId=Number(host.querySelector('select').value);if(!employeeId){status.textContent='Selecciona una persona.';return;}
  assigning=true;dateInput.disabled=true;areaInput.disabled=true;host.querySelector('button').disabled=true;host.querySelector('select').disabled=true;status.textContent='Guardando responsable…';
  try{view=await request({action:'assign',area:selected,employeeId});render();status.textContent='Responsable guardado para toda la jornada.';}catch(e){status.textContent=e.message+' Puedes reintentar guardar.';host.querySelector('button').disabled=false;host.querySelector('select').disabled=false;}finally{assigning=false;dateInput.disabled=false;areaInput.disabled=false;}
 });
}
async function load(){
 const token=++loadSequence;
 status.textContent='Cargando…';view=null;sheet.innerHTML='';history.hidden=true;reportOptions.hidden=true;
 reloadButton.hidden=true;
 root.querySelector('#equipo-notice').classList.remove('supervision-unavailable');
 root.querySelector('#equipo-responsible').innerHTML='';
 root.querySelector('#equipo-person-history').innerHTML='';
 renderAreas();
 root.querySelector('#supervision-directory-status').textContent='Cargando actividades…';
 try{
  const response=await request();
  if(token!==loadSequence)return;
  view=response;render();
  root.querySelector('#supervision-directory-status').textContent='';
  window.ChickenPersonHistory?.mount(root.querySelector('#equipo-person-history'),view.employees||[],date);
 }catch(error){
  if(token!==loadSequence)return;
  if(error.catalog?.length){
   view={date,canWrite:false,catalogOnly:true,areas:error.catalog.map(spec=>({spec,data:{points:{}}}))};
   render();
   root.querySelector('#supervision-directory-status').textContent='Modo consulta. Guardado e historial temporalmente no disponibles.';
   reloadButton.hidden=false;
   return;
  }
  status.textContent=error.message;
  root.querySelector('#supervision-directory-status').textContent=error.message;
  root.querySelector('#equipo-notice').classList.add('supervision-unavailable');
  reloadButton.hidden=false;
 }
}
function enqueue(el){
 if(el.matches('#feedback-observation,#feedback-recommendation')){
  const row=view.areas.find(r=>r.spec.code===selected),command={action:'feedback-save',observation:sheet.querySelector('#feedback-observation').value,recommendation:sheet.querySelector('#feedback-recommendation').value};
  pending.set(selected+':feedback',{area:selected,command});row.data.feedback={...row.data.feedback,observation:command.observation,recommendation:command.recommendation,closedAt:null,closedBy:null};feedbackState(row);status.textContent='Guardando…';return;
 }
 const item=el.closest('[data-point],[data-extra]');if(!item)return;const row=view.areas.find(r=>r.spec.code===selected),isExtra=item.hasAttribute('data-extra'),done=item.querySelector('[type=checkbox]').checked,note=item.querySelector('[type=text]').value;
 const command=isExtra?{action:'simple-extra',choice:Number(item.dataset.extra),done,note}:{action:'simple-point',point:item.dataset.point,done,note};
 pending.set(`${selected}:${isExtra?'extra:'+command.choice:command.point}`,{area:selected,command});
 if(isExtra){row.data.simpleExtras??=structuredClone(extras(row));row.data.simpleExtras[command.choice]={done,note};}else{row.data.checklistPoints??=structuredClone(row.data.points);row.data.checklistPoints[command.point]={status:done?'done':'pending',note};}
 invalidateFeedback(row);
 root.querySelector('#equipo-progress').textContent=tally(row);status.textContent='Guardando…';}

let activeFlush;
function flush(){if(saving)return activeFlush;activeFlush=performFlush();return activeFlush;}
async function performFlush(){if(saving||failed||!pending.size)return;saving=true;dateInput.disabled=true;areaInput.disabled=true;
 try{while(pending.size){const [key,item]=pending.entries().next().value,row=view.areas.find(r=>r.spec.code===item.area),sent=JSON.stringify(item.command);const response=await request({area:item.area,revision:row.revision,command:item.command});const saved=response.areas.find(r=>r.spec.code===item.area);row.revision=saved.revision;view.checklistHistory=response.checklistHistory;if(JSON.stringify(pending.get(key)?.command)===sent){pending.delete(key);if(!pending.has(item.area+':feedback'))row.data.feedback=saved.data.feedback;}feedbackState(row);}renderAreas();status.textContent='¡Guardado!';retry.hidden=true;}
 catch(e){failed=true;status.textContent=e.message+' Tu selección sigue aquí.';retry.hidden=false;if(e.status===409){try{const latest=await request();for(const row of view.areas)row.revision=latest.areas.find(r=>r.spec.code===row.spec.code).revision;status.textContent='Otra persona actualizó esta área. Revisa tu selección y pulsa Reintentar guardado.';}catch{}}}
 finally{saving=false;dateInput.disabled=!!pending.size;areaInput.disabled=!!pending.size;}
}
sheet.addEventListener('input',e=>{if(e.target.matches('[type=text],textarea')){enqueue(e.target);dateInput.disabled=true;areaInput.disabled=true;clearTimeout(timer);timer=setTimeout(flush,700);}});
sheet.addEventListener('change',e=>{enqueue(e.target);flush();});
retry.addEventListener('click',()=>{failed=false;flush();});
dateInput.addEventListener('change',()=>{if(dateInput.value){date=dateInput.value;load();}});
function selectArea(code){if(pending.size||assigning||closingFeedback)return;selected=code;if(view)render();else renderAreas();}
areaInput.addEventListener('change',()=>selectArea(areaInput.value));
areaList.addEventListener('click',event=>{const button=event.target.closest('[data-supervision-area]');if(button)selectArea(button.dataset.supervisionArea);});
reloadButton.addEventListener('click',load);
root.querySelector('.supervision-tabs').addEventListener('click',event=>{if(pending.size||assigning||closingFeedback)event.preventDefault();});
document.querySelector('.supervision-brand')?.addEventListener('click',()=>{try{sessionStorage.setItem('chickenia_internal_home',String(Date.now()));}catch{}});
window.addEventListener('beforeunload',e=>{if(pending.size||assigning||closingFeedback){e.preventDefault();e.returnValue='';}});
if(requested&&requested!=='general')selected=requested==='sucursal_apertura'?'rastro':requested;
directory.addEventListener('click',event=>{
 const card=event.target.closest('[data-directory-area]');
 if(!card)return;
 returnToAreaIndex=areaIndex.contains(card);
 browsingAreas=false;
 selectArea(card.dataset.directoryArea);
 window.scrollTo(0,0);
 back.focus({preventScroll:true});
});
back.addEventListener('click',()=>{
 if(pending.size||assigning||closingFeedback)return;
 browsingAreas=true;
 showWorkspace();
 const origin=returnToAreaIndex?areaIndex:cards;
 Array.from(origin.children).find(card=>card.dataset.directoryArea===selected)?.focus();
});
window.ChickenEquipoCanShare=()=>!!view&&!view.catalogOnly&&!pending.size&&!saving&&!assigning&&!closingFeedback;
sheet.addEventListener('click',async e=>{
 if(!e.target.closest('#feedback-close')||closingFeedback||failed)return;
 closingFeedback=true;clearTimeout(timer);await flush();if(saving||pending.size||failed){closingFeedback=false;return;}
 const row=view.areas.find(r=>r.spec.code===selected),observation=sheet.querySelector('#feedback-observation').value.trim(),recommendation=sheet.querySelector('#feedback-recommendation').value.trim();
 if(!observation||!recommendation){closingFeedback=false;status.textContent='Completa la observación y la recomendación antes de cerrar.';sheet.querySelector(!observation?'#feedback-observation':'#feedback-recommendation').focus();return;}
 closingFeedback=true;dateInput.disabled=true;areaInput.disabled=true;sheet.querySelectorAll('input,textarea,button').forEach(el=>el.disabled=true);status.textContent='Cerrando evaluación…';
 try{view=await request({area:selected,revision:row.revision,command:{action:'feedback-close',observation,recommendation}});render();status.textContent='Evaluación cerrada con retroalimentación para '+row.responsible.name+'.';}
 catch(err){status.textContent=err.message;sheet.querySelectorAll('input,textarea,button').forEach(el=>el.disabled=false);}
 finally{closingFeedback=false;dateInput.disabled=false;areaInput.disabled=false;}
});
root.querySelector('#equipo-weekly-report').addEventListener('click',e=>{if(!window.ChickenEquipoCanShare()){e.preventDefault();status.textContent='Espera la confirmación de guardado antes de abrir el reporte.';}});
load();
})();
