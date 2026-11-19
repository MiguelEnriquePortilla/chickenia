'use strict';
(()=>{
 const $=id=>document.getElementById(id),D=window.Payroll;
 const attendance=document.body.dataset.personnelView==='attendance';
 const mode=attendance?'attendance':'payroll',storageKey='chickenia-personnel-'+mode;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(n);
 const labels={A:'Asistencia',F:'Falta',D:'Descanso',V:'Vacaciones',P:'Permiso autorizado'};
 const paths={A:'M5 12l4 4L19 6',F:'M6 6l12 12 M18 6L6 18',D:'M8 5v14 M16 5v14',V:'M4 8h16v12H4z M9 8V4h6v4',P:'M12 3l8 4v5c0 5-8 9-8 9s-8-4-8-9V7z M8 12l3 3 5-6'};
 const icon=code=>`<span class="state-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[code]}"/></svg></span>`;
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 let saved={};try{saved=JSON.parse(sessionStorage.getItem(storageKey)||'{}');}catch{}
 const params=new URLSearchParams(location.search);
 let date=params.get(attendance?'date':'week')||saved.date||(attendance?today:D.monday(today));
 try{D.monday(date);}catch{date=attendance?today:D.monday(today);}
 let employeeId=Number(params.get('employee')||saved.employeeId)||null;
 let view=params.get('view')||saved.view||'person',filter=params.get('filter')||saved.filter||'all';
 if(!['person','team'].includes(view))view='person';if(!['all','pending','complete'].includes(filter))filter='all';
 let state,busy=false,dirty=false,pending=saved.pending||null,draft=saved.draft||null,returnTeam=!!saved.returnTeam,listScroll=saved.listScroll||0;
 if(attendance&&pending)view='person';
 let reportText='',reportScroll=0,printRequested=params.get('print')==='team';
 if(draft?.week)date=draft.week;
 $('date').value=date;
 const current=()=>state?.rows.find(r=>r.id===employeeId);
 const dayIndex=()=>Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(state.week+'T12:00:00Z'))/86400000);
 const nice=d=>new Date(d+'T12:00:00Z').toLocaleDateString('es-MX',{timeZone:'UTC',day:'numeric',month:'short'});
 const days=()=>Array.from({length:7},(_,i)=>{const d=new Date(state.week+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);});
 const period=()=>`${nice(state.week)} al ${nice(days()[6])}`;
 const missing=row=>row.days.filter(d=>!d).length;
 const canReady=()=>state.rows.every(r=>!missing(r))&&(!state.rows.some(r=>['petra','maricruz'].includes(D.key(r.name)))||state.rows.some(r=>r.fullTime));
 const approval=()=>state.approvedBy?'Autorizada por Lilian':state.readyBy?'Lista para revisión de Lilian':'Pendiente de revisión';
 function remember(){
  try{sessionStorage.setItem(storageKey,JSON.stringify({date,employeeId,view,filter,returnTeam,listScroll,pending,draft}));}catch{}
  const url=new URL(location.href);url.searchParams.set(attendance?'date':'week',date);
  if(employeeId)url.searchParams.set('employee',employeeId);else url.searchParams.delete('employee');
  url.searchParams.set('view',view);
  if(!attendance)url.searchParams.set('filter',filter);
  history.replaceState(null,'',url);
 }
 function message(text,error=false){$('status').textContent=text;$('status').parentElement.dataset.error=String(error);}
 function lock(){
  $('workspace').querySelectorAll('button,input,select,textarea').forEach(el=>{
   el.disabled=busy||!!pending||!!state?.approvedBy&&el.matches('[data-state],#full-time,#bonus,#discount,#reason,#save-adjustments');
   if(el.id==='mark-ready')el.disabled=busy||!!pending||dirty||!canReady();
   if(el.id==='approve')el.disabled=busy||!!pending||dirty||!state.readyBy;
  });
 }
 async function request(body,targetWeek){
  const selectedDate=attendance&&view==='team'?today:date;
  const week=targetWeek||(body?state.week:D.monday(selectedDate)),url='/api/payroll?week='+week+(attendance?'&view=attendance':'');
  const r=await fetch(url,{cache:'no-store',credentials:'same-origin',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  const data=await r.json().catch(()=>({error:'No se pudo leer la respuesta. Reintenta.'}));
  if(!r.ok)throw Object.assign(Error(data.error||'No se pudo completar la operación.'),{status:r.status});
  return data;
 }
 function weekList(row){return `<ul class="day-list">${days().map((d,i)=>`<li><span>${new Date(d+'T12:00:00Z').toLocaleDateString('es-MX',{timeZone:'UTC',weekday:'short',day:'numeric'})}</span><span>${esc(labels[row.days[i]]||'Sin marcar')}</span></li>`).join('')}</ul>`;}
 function breakdown(row){
  const r=D.calculate(row),complete=!missing(row);
  return `<dl class="breakdown"><div><dt>Sueldo semanal</dt><dd>${money(r.weekly)}</dd></div><div><dt>Días trabajados</dt><dd>${r.worked}</dd></div><div><dt>Pago calculado</dt><dd>${complete?money(r.pay):'Pendiente'}</dd></div><div><dt>Bono</dt><dd>${money(row.bonus)}</dd></div><div><dt>Descuento</dt><dd>${money(row.discount)}</dd></div>${row.discount?`<div><dt>Motivo</dt><dd>${esc(row.reason)}</dd></div>`:''}<div class="pay-total"><dt>Total a pagar</dt><dd>${complete?money(r.total):'Pendiente'}</dd></div></dl>`;
 }
 function renderPerson(){
  const row=current(),host=$('person-content');
  if(!row){host.innerHTML='<p class="empty-person">Selecciona una persona para '+(attendance?'registrar su día.':'revisar su semana.')+'</p>';return;}
  if(attendance){
   const status=pending?.employeeId===row.id&&pending.day===dayIndex()?pending.status:row.days[dayIndex()];
   const cashier=state.rows.find(r=>r.fullTime);
   host.innerHTML=`<div class="person-heading"><h2>${esc(row.name)}</h2><p class="quiet">${new Date(date+'T12:00:00Z').toLocaleDateString('es-MX',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'})}</p></div><p>${status?'Registrado: '+esc(labels[status]):'Este día está sin marcar.'}</p><div class="attendance-states" role="group" aria-label="Estado de asistencia">${Object.entries(labels).map(([code,label])=>`<button type="button" class="state-choice" data-state="${code}" aria-pressed="${status===code}">${icon(code)}${label}</button>`).join('')}</div>${['petra','maricruz'].includes(D.key(row.name))?`<section class="cashier-setting"><label class="switch-label"><input id="full-time" type="checkbox" ${row.fullTime?'checked':''}><span>Cajera de tiempo completo esta semana</span></label><p class="quiet">${esc(period())}${cashier?' · Asignada: '+esc(cashier.name):' · Pendiente de asignar'}</p></section>`:''}<details class="week-detail"><summary>Ver su semana</summary>${weekList(row)}</details>${state.approvedBy?'<p class="quiet">Semana autorizada. Lilian puede reabrirla desde Nómina para corregir.</p>':''}`;
  }else{
   const values=draft?.employeeId===row.id?draft:row;
   host.innerHTML=`<div class="person-heading"><h2>${esc(row.name)}</h2><p class="quiet">${row.fullTime?'Cajera de tiempo completo · ':''}${esc(period())}</p></div>${missing(row)?`<p class="quiet">Faltan ${missing(row)} días por marcar en Asistencias.</p>`:''}${breakdown(row)}<details class="week-detail"><summary>Asistencias de la semana</summary>${weekList(row)}</details><form id="adjustment-form" class="adjustment-form"><h3>Bonos y descuentos</h3><div class="money-fields"><label>Bono<input id="bonus" type="number" min="0" max="100000" step=".01" inputmode="decimal" value="${esc(values.bonus)}" required></label><label>Descuento<input id="discount" type="number" min="0" max="100000" step=".01" inputmode="decimal" value="${esc(values.discount)}" required></label></div><label>Motivo del descuento<textarea id="reason" maxlength="300" ${values.discount?'required':''}>${esc(values.reason)}</textarea></label><button class="primary" id="save-adjustments" type="submit">Guardar ajustes</button></form><div class="action-row"><button type="button" data-report="person">Compartir / imprimir / PDF</button></div>`;
  }
 }
 function personList(rows){return `<ul class="team-list">${rows.map(row=>`<li><button type="button" class="team-person" data-employee="${row.id}"><span class="name">${esc(row.name)}</span><span class="quiet">${missing(row)?missing(row)+' días pendientes':'Semana completa'}${row.fullTime?' · Cajera tiempo completo':''}</span></button></li>`).join('')}</ul>`;}
 function renderAttendanceTeam(){
  const dates=days();
  const headings=dates.map(d=>{
   const label=new Date(d+'T12:00:00Z').toLocaleDateString('es-MX',{timeZone:'UTC',weekday:'short',day:'numeric'});
   return `<th scope="col">${esc(label)}</th>`;
  }).join('');
  const rows=state.rows.map(row=>{
   const cells=dates.map((d,i)=>`<td>${esc(labels[row.days[i]]||(d>today?'Por transcurrir':'Sin marcar'))}</td>`).join('');
   return `<tr><th scope="row">${esc(row.name)}</th>${cells}</tr>`;
  }).join('');
  $('team-view').innerHTML='<h2 id="attendance-team-title">Asistencia del equipo</h2>'+
   (rows?`<div class="attendance-table-scroll" role="region" aria-labelledby="attendance-team-title" tabindex="0"><table class="attendance-table" aria-labelledby="attendance-team-title"><thead><tr><th scope="col">Persona</th>${headings}</tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="quiet">No hay personas para mostrar.</p>');
 }
 function renderTeam(){
  const complete=state.rows.filter(r=>!missing(r)),pendingRows=state.rows.filter(r=>missing(r));
  const totals=complete.reduce((t,r)=>{const v=D.calculate(r);t.pay+=v.total;t.bonus+=r.bonus;t.discount+=r.discount;return t;},{pay:0,bonus:0,discount:0});
  const rows=state.rows.filter(r=>filter==='all'||(filter==='pending'?missing(r):!missing(r)));
  $('team-view').innerHTML=`<section class="team-summary"><h2>Resumen del equipo</h2><dl class="breakdown"><div><dt>${pendingRows.length?'Total parcial':'Total a pagar'}</dt><dd>${money(totals.pay)}</dd></div><div><dt>Personas completas</dt><dd>${complete.length} de ${state.rows.length}</dd></div><div><dt>Días sin marcar</dt><dd>${state.rows.reduce((n,r)=>n+missing(r),0)}</dd></div></dl><p class="quiet">${pendingRows.length?'El total incluye únicamente personas con sus siete días marcados.':esc(approval())}</p></section><div class="filter-buttons" role="group" aria-label="Seguimiento del equipo">${[['all','Todos',state.rows.length],['pending','Pendientes',pendingRows.length],['complete','Completos',complete.length]].map(([value,label,count])=>`<button type="button" data-filter="${value}" aria-pressed="${filter===value}">${label} (${count})</button>`).join('')}</div><details class="team-section" open><summary>Asistencias</summary>${rows.length?personList(rows):'<p class="quiet">No hay personas en este grupo.</p>'}</details><details class="team-section"><summary>Pagos y ajustes</summary><dl class="breakdown"><div><dt>Bonos de filas completas</dt><dd>${money(totals.bonus)}</dd></div><div><dt>Descuentos de filas completas</dt><dd>${money(totals.discount)}</dd></div></dl><p class="quiet">Abre una persona para revisar sus importes y ajustes.</p>${personList(rows)}</details><div class="action-row"><button type="button" data-report="team">Reporte de equipo / compartir</button></div>`;
 }
 function renderApproval(){
  $('authorization').innerHTML=`<h3>${esc(approval())}</h3>${state.approvedAt?`<p class="quiet">${new Date(state.approvedAt).toLocaleString('es-MX',{timeZone:'America/Mexico_City'})}</p>`:`<p class="quiet">${canReady()?'Los siete días de cada persona están marcados.':'Completa los días pendientes y asigna la cajera semanal en Asistencias.'}</p>`}${state.approvedBy?(state.user==='LILIAN'?'<button type="button" id="reopen">Reabrir semana para corregir</button>':''):`${!state.readyBy?'<button type="button" id="mark-ready">Dejar lista para revisión</button>':''}${state.user==='LILIAN'?'<button type="button" class="primary" id="approve">Autorizar semana completa</button>':'<p class="quiet">Lilian autoriza la nómina final.</p>'}`}`;
 }
 function render(){
  $('workspace').hidden=false;$('login-panel').hidden=true;$('change-person').hidden=false;
  $('identity').textContent=state.user+' · '+(attendance?'Captura por persona':approval());
  $('period').textContent='Semana del '+period()+(!attendance?' · Pago el domingo':'');
  $('employee').innerHTML='<option value="">Selecciona una persona</option>'+state.rows.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('');
  $('employee').value=employeeId||'';
  $('person-view').hidden=view!=='person';$('team-view').hidden=view!=='team';
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
  if(!attendance||view==='person')renderPerson();
  if(attendance){
   $('date-label').hidden=view==='team';
   if(view==='team')renderAttendanceTeam();
  }
  if(!attendance){
   renderTeam();renderApproval();
   $('back-team').hidden=!returnTeam;
  }
  lock();remember();
 }
 async function load(){
  if(busy)return;busy=true;if(state)lock();$('retry').hidden=true;$('recover').hidden=true;message('Cargando…');
  try{
   state=await request();if(!attendance)date=state.week;$('date').value=date;
   if((!attendance||view==='person')&&employeeId&&!current())employeeId=null;
   dirty=!!draft;render();
   if(pending){message('Hay una captura sin confirmar. Reintenta o recupera lo guardado.',true);$('retry').hidden=false;$('recover').hidden=false;}
   else message(dirty?'Tienes ajustes sin guardar.':'Todo guardado.');
   if(printRequested&&!dirty&&!pending){
    printRequested=false;
    if(attendance){
     view='team';render();document.body.classList.add('print-attendance-team');
    }else showReport('team');
    requestAnimationFrame(()=>window.print());
   }
  }catch(e){
   message(e.message,true);state=null;$('workspace').hidden=true;if(e.status===401){$('login-panel').hidden=false;}else $('retry').hidden=false;
  }finally{busy=false;if(state)lock();}
 }
 async function send(command){
  if(busy)return;
  if(!state){await load();return;}
  if(dirty&&command.action!=='adjustment'){message('Guarda los ajustes antes de continuar.',true);return;}
  if(command.week&&command.week!==state.week){message('La captura pendiente pertenece a otra semana. Recupera los datos antes de continuar.',true);return;}
  pending=command.revision!==undefined?command:{...command,week:state.week,revision:state.revision};command=pending;
  remember();busy=true;lock();$('retry').hidden=true;$('recover').hidden=true;message('Guardando…');let committed=false;
  try{
   await request(command,command.week);committed=true;pending=null;draft=null;dirty=false;remember();
   state=await request(undefined,command.week);render();message(command.action==='approve'?'Semana autorizada por Lilian.':command.action==='ready'?'Lista para revisión de Lilian.':'Guardado.');
  }catch(e){
   if(committed){state=null;$('workspace').hidden=true;message('Guardado confirmado. No se pudo actualizar la vista; pulsa Reintentar.',true);$('retry').hidden=false;return;}
   if(e.status===401){state=null;$('workspace').hidden=true;$('login-panel').hidden=false;message('Inicia sesión para confirmar la captura pendiente. Tus datos se conservan.',true);return;}
   message(e.status===409?e.message+' Recupera los datos antes de continuar.':e.message,true);
   $('retry').hidden=e.status===409;$('recover').hidden=false;
  }finally{busy=false;if(state)lock();}
 }
 function safeToMove(){if(busy||pending||dirty){message(busy?'Espera la confirmación de guardado.':'Guarda o recupera tu captura antes de cambiar de persona o salir.',true);return false;}return true;}
 function setView(next){
  if(view===next||!safeToMove())return;
  view=next;
  if(attendance){remember();load();}else render();
 }
 $('date').addEventListener('change',()=>{if(!safeToMove()){$('date').value=date;return;}date=$('date').value;if(!attendance)date=D.monday(date);remember();load();});
 $('employee').addEventListener('change',()=>{if(!safeToMove()){$('employee').value=employeeId||'';return;}employeeId=Number($('employee').value)||null;renderPerson();lock();remember();});
 $('workspace').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.state){const r=current();if(r.days[dayIndex()]===b.dataset.state)return;send({action:'attendance',employeeId:r.id,day:dayIndex(),status:b.dataset.state});}
  if(b.dataset.view)setView(b.dataset.view);
  if(b.dataset.filter){filter=b.dataset.filter;renderTeam();remember();}
  if(b.dataset.employee&&safeToMove()){listScroll=window.scrollY;returnTeam=true;employeeId=Number(b.dataset.employee);view='person';render();window.scrollTo({top:0});}
  if(b.id==='back-team'&&safeToMove()){view='team';render();window.scrollTo({top:listScroll});}
  if(b.id==='mark-ready')send({action:'ready'});
  if(b.id==='approve')send({action:'approve'});
  if(b.id==='reopen')send({action:'reopen'});
  if(b.dataset.report&&safeToMove())showReport(b.dataset.report);
 });
 $('workspace').addEventListener('change',e=>{if(e.target.id==='full-time')send({action:'attendance',employeeId:current().id,fullTime:e.target.checked});});
 $('workspace').addEventListener('input',e=>{
  if(!['bonus','discount','reason'].includes(e.target.id))return;
  draft={employeeId:employeeId,week:state.week,bonus:$('bonus').value,discount:$('discount').value,reason:$('reason').value};dirty=true;remember();$('reason').required=Number(draft.discount)>0;lock();message('Ajustes sin guardar.');
 });
 $('workspace').addEventListener('submit',e=>{
  if(e.target.id!=='adjustment-form')return;e.preventDefault();
  send({action:'adjustment',employeeId,bonus:Number($('bonus').value),discount:Number($('discount').value),reason:$('reason').value});
 });
 $('login-form').addEventListener('submit',async e=>{
  e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;
  try{const r=await fetch('/api/inventory?action=login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:e.target.elements.username.value})});const d=await r.json();if(!r.ok)throw Error(d.error);await load();}catch(err){message(err.message,true);}finally{button.disabled=false;}
 });
 $('retry').onclick=()=>pending?send(pending):load();
 $('change-person').onclick=()=>{if(!safeToMove())return;$('workspace').hidden=true;$('login-panel').hidden=false;$('change-person').hidden=true;message('Selecciona quién está capturando.');};
 $('recover').onclick=()=>{if(!confirm('Se conservará la versión guardada y se descartará esta captura sin confirmar. ¿Continuar?'))return;pending=null;draft=null;dirty=false;remember();$('retry').hidden=true;$('recover').hidden=true;load();};
 document.addEventListener('click',e=>{const link=e.target.closest('a[href]');if(link&&!safeToMove()){e.preventDefault();e.stopImmediatePropagation();}},true);
 window.addEventListener('beforeunload',e=>{if(busy||pending||dirty){e.preventDefault();e.returnValue='';}});
 function showReport(scope){
  const rows=scope==='team'?state.rows:[current()];if(!rows[0])return;
  reportScroll=window.scrollY;
  $('workspace').hidden=true;$('share-preview').hidden=false;
  $('preview-title').textContent=scope==='team'?'Nómina del equipo':'Nómina individual';
  $('report-state').textContent=`${scope==='team'?'Equipo':rows[0].name} · ${period()} · ${approval()}`;
  const sum=rows.filter(r=>!missing(r)).reduce((total,r)=>total+D.calculate(r).total,0);
  const partial=rows.some(r=>missing(r));
  $('report-content').innerHTML=`${scope==='team'?`<dl class="breakdown"><div class="pay-total"><dt>${partial?'Total parcial':'Total del equipo'}</dt><dd>${money(sum)}</dd></div></dl>`:''}${rows.map(r=>`<section class="report-person"><h3>${esc(r.name)}</h3>${r.fullTime?'<p>Cajera de tiempo completo</p>':''}${breakdown(r)}<div class="report-status">${days().map((d,i)=>`<span>${nice(d)} · ${esc(labels[r.days[i]]||'Sin marcar')}</span>`).join('')}</div></section>`).join('')}`;
  reportText=`CHICKEN CHICANITO\nNómina · ${period()}\n${approval()}\n\n`+rows.map(r=>{const n=D.calculate(r);return `${r.name}${r.fullTime?' · Cajera tiempo completo':''}\n${days().map((d,i)=>nice(d)+': '+(labels[r.days[i]]||'Sin marcar')).join('\n')}\nSueldo semanal: ${money(n.weekly)}\nBono: ${money(r.bonus)}\nDescuento: ${money(r.discount)}${r.discount?' · '+r.reason:''}\nTotal: ${missing(r)?'Pendiente de completar asistencia':money(n.total)}`;}).join('\n\n')+(scope==='team'?`\n\n${partial?'TOTAL PARCIAL':'TOTAL EQUIPO'}: ${money(sum)}`:'');
  window.scrollTo({top:0});
 }
 if(!attendance){
  $('close-preview').onclick=()=>{$('share-preview').hidden=true;$('workspace').hidden=false;window.scrollTo({top:reportScroll});};
  $('whatsapp').onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent(reportText),'_blank','noopener,noreferrer');
  $('print').onclick=()=>window.print();$('pdf').onclick=()=>window.print();
 }
 load();
})();
