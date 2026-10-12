(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function request(url,body){const r=await fetch(url,{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw Object.assign(Error(d.error||'No se pudo guardar.'),{status:r.status});return d;}
 const url=(id,date)=>`/api/summary?points=1&location_id=${encodeURIComponent(id)}&date=${encodeURIComponent(date)}`;
 const stamp=v=>v?new Date(v).toLocaleString('es-MX',{timeZone:'America/Mexico_City',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}):'';
 const areaScore=a=>a.score??a.done*100/a.total;
 const score=n=>n==null?'—':`${Math.floor(n*10)/10}%`;
 function bar(value,label){return `<div class="points-segment" title="${esc(label)}"><i class="points-fill ${value>=85?'points-green':value>=50?'points-amber':'points-red'}" style="width:${value??0}%"></i><span>${value==null?'—':score(value)}</span></div>`;}
 function dashboard(host,data){
  const current=data.records.find(d=>d.date===data.date),open=host.querySelector('.points-history')?.open;
  host.innerHTML=`<section class="points-dashboard"><h2>Supervisión</h2><p class="points-state">${current?.final?'Resultado del día':'Avance del día'} · ${data.legacy?'Checklist anterior':'Meta de bono: 85%'}</p><div class="points-axis">${data.cuts.map(c=>`<span>${c.time}</span>`).join('')}</div>${data.cuts[0].areas.map(area=>{
   const daily=current?.areas.find(a=>a.code===area.code)?.score;
   return `<div class="points-bar-row"><div class="points-bar-title"><strong>${esc(area.name)}</strong><span>${score(daily)}</span></div><div class="points-track">${data.cuts.map(c=>{const a=c.areas.find(a=>a.code===area.code);return bar(c.begun?areaScore(a):null,`${area.name} · ${c.time} · ${a.done}/${a.total}${a.video?.required?` · Video ${a.video.delivered?'entregado':'pendiente'}`:''}${c.passed?' al corte':' en curso'}`);}).join('')}</div></div>`;
  }).join('')}${data.cuts.some(c=>c.videoRequired)?`<details class="points-evidence-history"><summary>Videos de evidencia por área y corte</summary><p>Sin entrega marcada antes del corte: 0%. El video se entrega en el grupo de Supervisión.</p>${data.cuts.filter(c=>c.videoRequired).map(c=>`<h3>${esc(c.time)}</h3>${c.areas.map(a=>`<p><strong>${esc(a.name)}</strong> · ${a.video?.delivered?'Entregado a tiempo':c.passed?'Sin evidencia al corte · 0%':'Video pendiente'}${a.video?.recordedAt?`<br>${esc(a.video.actor)} · ${esc(stamp(a.video.recordedAt))}${c.passed&&!a.video.atCut&&a.video.done?' · Marcado después del corte':''}`:''}</p>`).join('')}`).join('')}</details>`:''}<details class="points-history" ${open?'open':''}><summary>${data.legacy?'Historial anterior':'Historial y bono'}</summary><p>${data.legacy?'Resultados del checklist anterior; conservan su cálculo original y no se mezclan con los puntos nuevos.':'Promedio de días completos: semana de lunes a domingo y mes calendario. 85% o más alcanza la meta; periodos en curso son provisionales. Días sin operación excluidos.'}</p>${data.periods.map(period=>`<h3>${({week:'Semana',month:'Mes',last7:'Últimos 7 días',last30:'Últimos 30 días'})[period.id]}${data.legacy?'':` · desde ${period.start}`}</h3>${period.areas.map(a=>`<div class="points-bar-row"><div class="points-bar-title"><span>${esc(a.name)} · ${a.days} días</span><span>${score(a.score)}</span></div><div class="points-track">${bar(a.score,a.name)}</div>${a.bonus?'<span class="points-bonus">Meta de 85% alcanzada</span>':''}</div>`).join('')}`).join('')}<div class="points-day-links">${data.records.slice().reverse().map(d=>`<a href="/dashboard.html?date=${d.date}">${d.date}${d.closed?' · sin operación':d.final?'':' · en curso'}</a>`).join('')}</div></details></section>`;
 }
 window.ChickenPoints={request,url,dashboard};
 if(!document.getElementById('points-list'))return;
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const dateInput=document.getElementById('point-date'),host=document.getElementById('points-list'),status=document.getElementById('point-status'),tabs=document.getElementById('point-tabs');
 let date=today(),locationId,view,selected=0,loading=0,busy=false,serverStamp=0,receivedAt=0,currentSlot=-1;
 const syncClock=data=>{serverStamp=new Date(data.serverTime).getTime();receivedAt=performance.now();};
 function tick(){
  if(!view||view.missing||!Number.isFinite(serverStamp))return;
  const now=new Date(serverStamp+performance.now()-receivedAt);
  document.getElementById('point-clock').textContent=now.toLocaleTimeString('es-MX',{timeZone:'America/Mexico_City',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const slot=date===new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)?view.cuts.findIndex(c=>now.getTime()<new Date(`${date}T${c.time}:00-06:00`).getTime()):-1;
  document.getElementById('point-window').textContent=slot<0?' · Revisiones cerradas':` · Antes de ${view.cuts[slot].time}`;
  if(slot!==currentSlot){currentSlot=slot;selected=slot<0?3:slot;render();if(locationId&&!busy)load();}
 }
 setInterval(tick,1000);
 dateInput.value=date;
 async function load(){
  const token=++loading;status.textContent='Cargando…';host.innerHTML='';
  try{const data=await request(url(locationId,date));if(token!==loading)return;view=data;
   if(view.missing){host.textContent='Sin revisión para esta fecha.';status.textContent='';tabs.innerHTML='';return;}
   syncClock(view);currentSlot=view.activeCut;selected=currentSlot<0?3:currentSlot;
   render();tick();status.textContent=view.active?'':`Práctica. Evaluación desde ${view.start}.`;
  }catch(e){if(token===loading){status.textContent=e.message;if(e.status===401)location.replace('/inventario.html?next='+encodeURIComponent(location.pathname));}}
 }
 function render(){
  const opened=new Set([...host.querySelectorAll('details[open]')].map(d=>d.dataset.area));
  tabs.innerHTML=view.cuts.map((c,i)=>`<button type="button" data-cut="${i}" role="tab" aria-selected="${i===selected}" ${busy||!c.begun?'disabled':''}>${c.time}</button>`).join('');
  const cut=view.cuts[selected];
  const weekday=new Date(`${date}T12:00:00-06:00`).getUTCDay();
  const reminder=area=>{
   if(date<'2026-10-12')return '';
   const notes=[];
   if(area.code==='supervision'){
    if([0,2,5].includes(weekday))notes.push('Pedidos · Contar las proteínas y dejar establecido el pedido del día siguiente.');
    if(selected===2)notes.push('16:30 · Definir el rol, el área y el horario de entrada de mañana; comunicar antes de las 17:00.');
   }
   if(area.code==='sucursal_apertura'&&selected===0){
    notes.push('Limpiar peloteros todos los días.');
    if([1,3,5].includes(weekday))notes.push('Hoy: lavar la banqueta.');
   }
   return notes.length?`<aside class="points-reminder" aria-label="Recordatorios de ${esc(area.name)}">${notes.map(note=>`<p>${esc(note)}</p>`).join('')}</aside>`:'';
  };
  host.innerHTML=cut.areas.map(area=>`<details class="points-area" data-area="${area.code}" ${opened.has(area.code)?'open':''}><summary>${esc(area.name)}<span>${area.done}/${area.total} · ${score(areaScore(area))}</span></summary>${reminder(area)}${cut.videoRequired?`<div class="points-video"><label class="points-check"><input type="checkbox" data-video="${esc(area.code)}" ${area.video.done?'checked':''} ${!view.canWrite||!cut.begun||busy?'disabled':''}><span><strong>Video de evidencia entregado en el grupo de Supervisión</strong></span></label><p>${area.video.recordedAt?`${area.video.done?'Entrega marcada':'Entrega desmarcada'} por ${esc(area.video.actor)} · <time>${esc(stamp(area.video.recordedAt))}</time>`:'Entrega pendiente · Sin video al corte, este reporte obtiene 0%.'}</p>${cut.passed?`<p>${area.video.atCut?'Video marcado a tiempo.':'Sin entrega marcada al corte: 0%. Una marca tardía no cambia esta nota.'}</p>`:''}${area.video.history.length?`<details><summary>Historial de evidencia</summary>${area.video.history.map(v=>`<p>${v.done?'Entregado':'Desmarcado'} · ${esc(v.actor)} · ${esc(stamp(v.recordedAt))}</p>`).join('')}</details>`:''}</div>`:''}${area.points.map(point=>`<label class="points-check"><input type="checkbox" data-point="${point.id}" ${point.done?'checked':''} ${!view.canWrite||selected!==currentSlot||currentSlot<0||busy?'disabled':''}><span>${esc(point.text)}</span></label>`).join('')}</details>`).join('');
 }
 tabs.addEventListener('click',e=>{const b=e.target.closest('[data-cut]');if(!b||b.disabled||busy)return;selected=Number(b.dataset.cut);render();});
 host.addEventListener('change',async e=>{
  if(!e.target.matches('[data-point],[data-video]')||busy)return;
  const input=e.target,cut=selected,point=input.dataset.video?'_video:'+input.dataset.video:input.dataset.point,done=input.checked;tick();
  if(!input.dataset.video&&(currentSlot!==cut||currentSlot<0)){render();return;}busy=true;
  host.querySelectorAll('input').forEach(i=>i.disabled=true);dateInput.disabled=true;status.textContent='Guardando…';
  try{view=await request(url(locationId,date),{cut,point,done,revision:view.revision});syncClock(view);status.textContent='Guardado';}
  catch(error){status.textContent=error.message;try{view=await request(url(locationId,date));syncClock(view);}catch{input.checked=!done;}}
  finally{busy=false;dateInput.disabled=false;currentSlot=view.activeCut;selected=cut;render();tick();}
 });
 dateInput.addEventListener('change',()=>{date=dateInput.value;load();if(document.getElementById('point-attendance').open)attendance();});
 const att=document.getElementById('point-attendance'),attList=document.getElementById('point-attendance-list');
 const marks=[['entrada','Entrada'],['comida_salida','Comida'],['comida_regreso','Regreso'],['salida','Salida']];
 async function attendance(){
  const requested=date;attList.textContent='Cargando…';
  try{const [people,records]=await Promise.all([request('/api/employees'),request(`/api/attendance?location_id=${locationId}&date=${date}`)]);if(requested!==date)return;
   attList.innerHTML=people.map(p=>{const r=records.find(r=>r.employee_id===p.id)||{};return `<div class="points-person"><strong>${esc(p.name)}</strong><div class="points-marks">${marks.map(([key,label])=>`<button type="button" data-employee="${p.id}" data-event="${key}" ${r[key]||date!==today()?'disabled':''}>${label}${r[key]?'<br>'+new Date(r[key]).toLocaleTimeString('es-MX',{timeZone:'America/Mexico_City',hour:'2-digit',minute:'2-digit'}):''}</button>`).join('')}</div></div>`;}).join('');
  }catch(e){attList.textContent=e.message;}
 }
 att.addEventListener('toggle',()=>{if(att.open&&locationId)attendance();});
 attList.addEventListener('click',async e=>{const b=e.target.closest('[data-employee]');if(!b||b.disabled)return;b.disabled=true;
  try{await request('/api/attendance',{employee_id:Number(b.dataset.employee),location_id:locationId,check_date:date,event:b.dataset.event,checked_by:view.actor});await attendance();}
  catch(error){status.textContent=error.message;b.disabled=false;}
 });
 (async()=>{try{const session=await request('/api/inventory?action=session');document.getElementById('point-person').textContent=session.user.name;const locations=await request('/api/locations');locationId=locations.find(l=>l.type==='tienda')?.id;if(!locationId)throw Error('No hay sucursal configurada.');await load();}catch(e){status.textContent=e.message;if(e.status===401)location.replace('/inventario.html?next='+encodeURIComponent(location.pathname));}})();
})();
