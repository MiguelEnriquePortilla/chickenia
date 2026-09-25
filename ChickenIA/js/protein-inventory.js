'use strict';
(()=>{
 const $=s=>document.querySelector(s),view=window.ChickenProteinView;
 let snapshot,busy=false,dirty=false,loadedDate,lastAction,dirtyForm;
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City'}).format(new Date());
 const requested=new URLSearchParams(location.search).get('date');
 $('#date').value=requested&&/^\d{4}-\d{2}-\d{2}$/.test(requested)?requested:today;
 $('#date').max=today;
 const actions={initial:'Primera captura: lo que hay en CEDIS',send:'SALIDA A SUCURSAL — se resta de CEDIS',entry:'Llegó pollo del proveedor — se suma',marinate:'Ya marinamos estos pollos — siguen en CEDIS',receive:'Sucursal: confirmar lo que llegó',count:'Contar los pollos — solo comparar',waste:'Pollo perdido o dañado — se resta',rectify:'RECTIFICAR INVENTARIO — corregir lo que hay'};
 const guidance={initial:'Escribe lo que está físicamente en CEDIS al comenzar. Separa los pollos sin marinar de los marinados. No cuentes un pollo dos veces ni incluyas los que ya salieron.',entry:'Escribe solo los pollos nuevos que trajo el proveedor a CEDIS. No escribas aquí los que salen a Sucursal.',marinate:'Escribe cuántos pollos acabas de marinar. Pasan de sin marinar a Pollos Marinados. Todavía están en CEDIS: el total no aumenta.',send:'Escribe cuántos pollos marinados salen de CEDIS hacia Sucursal. Se RESTAN de CEDIS. No escribas cuántos quedan. Si aún aparecen sin marinar, registra primero que ya se marinaron.',receive:'Estás confirmando en Sucursal cuántos pollos llegaron de esa entrega. Ya se descontaron al salir de CEDIS; no se vuelven a restar.',count:'Escribe lo que contaste en CEDIS. Esto solo compara y muestra diferencias. Para corregir lo guardado, usa RECTIFICAR INVENTARIO.',waste:'Escribe cuántos pollos se perdieron o dañaron y explica qué pasó. Se restan de CEDIS.',rectify:'Cuenta los pollos que realmente quedan en CEDIS y escribe las cantidades correctas. Reemplazarán las cantidades actuales. No incluyas los que ya salieron. Explica el error. Si solo falta registrar una salida, usa el campo Lo que sale ahora a Sucursal en la ficha superior.'};
 const field=(id,label)=>`<label>${label} (pollos)<input id="${id}" name="${id}" type="number" min="0" max="1000000" step="0.001" inputmode="decimal" required placeholder="Sin captura" autocomplete="off"></label>`;
 function lock(on){busy=on;$('#reset-shortcut').disabled=on||!snapshot||snapshot.role!=='manager'||loadedDate!==today;$('#movements-capture').disabled=on||!snapshot||snapshot.role==='kitchen'||(dirty&&dirtyForm==='other');$('#capture').disabled=on||!snapshot||(dirty&&dirtyForm==='movements');$('#date').disabled=on;$('#reload').disabled=on;document.querySelectorAll('[data-start-action]').forEach(b=>b.disabled=on||!snapshot);}
 async function api(body,day){const r=await fetch('/api/protein-inventory?date='+encodeURIComponent(day),body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});if(r.status===401){location.assign('/inventario.html?next='+encodeURIComponent('/proteinas.html?date='+day));throw Error('Inicia sesión para continuar.');}const data=await r.json();if(!r.ok)throw Error(data.error);return data;}
 function form(){
  if(!snapshot)return;
  const protein=$('#protein').value,role=snapshot.role,row=snapshot.rows.find(r=>r.protein===protein),before=$('#action').value;
  const allowed=Object.keys(actions).filter(a=>!['entry','marinate','send'].includes(a)).filter(a=>a==='initial'?role==='manager'&&row.raw.current===null:a==='rectify'?role==='manager'&&row.raw.current!==null:a==='receive'?['manager','kitchen'].includes(role):role!=='kitchen'&&row.raw.current!==null);
  $('#action').innerHTML='<option value="">Elige qué vas a registrar</option>'+allowed.map(a=>`<option value="${a}">${actions[a]}</option>`).join('');
  if(allowed.includes(before))$('#action').value=before;
  else if(allowed.includes('initial'))$('#action').value='initial';
  $('#rectify-shortcut').hidden=role!=='manager';$('#reset-shortcut').hidden=role!=='manager';
  $('#notes').value='';fields();
 }
 function fields(){
  const action=$('#action').value,protein=$('#protein').value;
  lastAction=action;
  $('#guidance').textContent=guidance[action]||'Elige una operación. Las llegadas, el marinado y las salidas se capturan en las fichas superiores.';
  $('#notes').required=['waste','rectify'].includes(action);$('#save').disabled=!action;
  $('#notes-label').textContent=action==='rectify'?'¿Qué error estás corrigiendo? (obligatorio)':'Comentario';
  $('#save').textContent=action==='rectify'?'Revisar y confirmar rectificación':action==='send'?'Guardar salida y restar de CEDIS':'Guardar';
  const labels={send:'¿Cuántos pollos salen a Sucursal?',entry:'¿Cuántos pollos nuevos trajo el proveedor?',marinate:'¿Cuántos pollos acabas de marinar?',receive:'¿Cuántos pollos llegaron a Sucursal?',waste:'¿Cuántos pollos se perdieron o dañaron?'};
  let html=['initial','count','rectify'].includes(action)?field('raw','Sin marinar que hay en CEDIS')+field('marinated','Pollos Marinados que hay en CEDIS'):action?field('amount',labels[action]):'';
  if(action==='send')html+='<label>Entrega<select id="slot"><option value="morning">Mañana</option><option value="noon">Mediodía</option><option value="other">Otra entrega</option></select></label>';
  if(action==='waste')html+='<label>Estado<select id="stock-state"><option value="raw">Pollo por preparar</option><option value="marinated">Pollos Marinados</option></select></label>';
  if(action==='receive'){
   const pending=snapshot.shipments.filter(s=>s.protein===protein&&!s.receipt);
   html+=`<label>Envío<select id="shipment" required>${pending.map(s=>`<option value="${s.id}">${view.esc(s.date)} · ${view.slots[s.slot]} · ${view.fmt(s.sent)} pollos · #${s.id}</option>`).join('')}</select></label>`;
   if(!pending.length){html='<p>No hay envíos pendientes de recepción para esta proteína.</p>';$('#save').disabled=true;}
  }
  $('#fields').innerHTML=html;$('#preview').textContent='';
  if(action==='rectify'){
   const r=snapshot.rows.find(r=>r.protein===protein);
   $('#preview').textContent=`Ahora dice: sin marinar ${view.fmt(r.raw.current)} + marinados ${view.fmt(r.marinated.current)} = ${view.fmt(r.total)} pollos en CEDIS. Escribe arriba lo que hay realmente.`;
  }
 }
 function movementCards(){
  return snapshot.rows.map(r=>`<section class="protein-card" data-protein="${r.protein}"><h2>${r.name} · pollos</h2>
   <p>Había al iniciar el día: <strong>${view.fmt(r.raw.previous)} sin marinar + ${view.fmt(r.marinated.previous)} marinados</strong></p>
   <p>Registrado hoy: llegó ${view.fmt(r.entries)} · se marinó ${view.fmt(r.prepared)} · salió ${view.fmt(r.sent)} · merma ${view.fmt(r.waste)}${r.adjustment?' · rectificación '+view.fmt(r.adjustment):''}</p>
   ${r.total===null?'<p>Sin captura. Registra la apertura en Otras operaciones.</p>':`<p>Antes de este movimiento: ${view.fmt(r.raw.current)} sin marinar + ${view.fmt(r.marinated.current)} marinados.</p><div class="rastro-fields">${[['entry','Lo que llega ahora del proveedor (+)'],['marinate','Lo que se marinó ahora'],['send','Lo que sale ahora a Sucursal (−)']].map(([key,label])=>`<label>${label} (pollos)<input data-key="${key}" type="number" min="0" max="1000000" step="0.001" inputmode="decimal" placeholder="Sin captura" autocomplete="off"></label>`).join('')}</div><p class="protein-hint">Se marinó: pasa de sin marinar a marinados; sigue en CEDIS.</p>`}
   <p data-result aria-live="polite">${balanceText(r,r.raw.current,r.marinated.current)}</p>
   ${r.correction?`<p class="protein-verification">Inventario rectificado: ${view.esc(r.correction.notes)} · ${view.esc(r.correction.actor)}</p>`:''}
   ${view.verification?view.verification(r):''}</section>`).join('');
 }
 function balanceText(r,raw,mar){return r.total===null?'Queda en CEDIS: Sin captura':`Queda en CEDIS: ${view.fmt(raw)} sin marinar + ${view.fmt(mar)} marinados = ${view.fmt(Math.round((raw+mar)*1000)/1000)} pollos.`;}
 $('#movements-form').addEventListener('input',()=>{
  dirtyForm='movements';dirty=true;$('#capture').disabled=true;$('#status').textContent='Cambios sin guardar. Guarda los movimientos o usa Actualizar para descartarlos antes de otra operación.';
  document.querySelectorAll('[data-protein]').forEach(card=>{
   const r=snapshot.rows.find(r=>r.protein===card.dataset.protein);if(r.total===null)return;
   const n=k=>Number(card.querySelector(`[data-key="${k}"]`).value||0),round=v=>Math.round(v*1000)/1000;
   const raw=round(r.raw.current+n('entry')-n('marinate')),mar=round(r.marinated.current+n('marinate')-n('send'));
   card.querySelector('[data-result]').textContent=raw<0?'No hay suficientes pollos sin marinar para esta preparación.':mar<0?'No hay suficientes pollos marinados para esta salida. Revisa las cantidades o registra lo que se marinó.':balanceText(r,raw,mar);
  });
 });
 $('#movements-form').onsubmit=async e=>{
  e.preventDefault();if(busy||!snapshot)return;
  const lines=[...document.querySelectorAll('[data-protein]')].map(card=>{
   const line={protein:card.dataset.protein};card.querySelectorAll('[data-key]').forEach(input=>{if(input.value!=='')line[input.dataset.key]=Number(input.value);});return line;
  }).filter(line=>Object.keys(line).length>1);
  const body={action:'movements',date:loadedDate,revision:snapshot.revision,lines,slot:$('#movement-slot').value,deliveredBy:$('#delivered-by').value,receivedBy:$('#received-by').value,notes:$('#movement-notes').value};
  lock(true);$('#error').textContent='';try{snapshot=await api(body,loadedDate);dirty=false;render();$('#status').textContent='Movimientos guardados correctamente · '+snapshot.date;}catch(error){$('#error').textContent=error.message;}finally{lock(false);}
 };
 function render(){
  $('#reset-info').textContent=snapshot.reset?'Ciclo reiniciado el '+snapshot.reset.date+' por '+snapshot.reset.actor+'. '+snapshot.reset.notes:'';
  $('#back').href='/supervision.html?area=supervision&date='+snapshot.date;
  $('#balances').innerHTML=movementCards();$('#shipments').innerHTML=view.shipments(snapshot);$('#week').innerHTML=view.week(snapshot);$('#history').innerHTML=view.history(snapshot);
  $('#movements-form').reset();form();$('#status').textContent='Datos al '+snapshot.date+' · '+new Date().toLocaleTimeString('es-MX');
 }
 async function load(){
  const day=$('#date').value;if(!day)return;lock(true);$('#error').textContent='';
  try{const data=await api(null,day);snapshot=data;loadedDate=day;dirty=false;const url=new URL(location.href);url.searchParams.set('date',day);history.replaceState(null,'',url);render();}
  catch(e){$('#error').textContent=e.message;if(loadedDate)$('#date').value=loadedDate;}
  finally{lock(false);}
 }
 function preview(){
  const action=$('#action').value,r=snapshot.rows.find(r=>r.protein===$('#protein').value),amount=$('#amount');
  if(['initial','count','rectify'].includes(action)){
   const raw=$('#raw'),mar=$('#marinated');if([raw,mar].some(i=>i.value===''||!i.validity.valid)){$('#preview').textContent='Completa ambas cantidades para ver cómo quedará el inventario.';return;}
   const total=Math.round((Number(raw.value)+Number(mar.value))*1000)/1000;
   $('#preview').textContent=(action==='rectify'?`Ahora dice ${view.fmt(r.total)}. Quedará: `:action==='count'?'Contaste: ':'Se guardará: ')+`${view.fmt(Number(raw.value))} sin marinar + ${view.fmt(Number(mar.value))} marinados = ${view.fmt(total)} pollos en CEDIS.`;return;
  }
  if(!amount||amount.value===''||!amount.validity.valid){$('#preview').textContent='';return;}
  const n=Number(amount.value),round=v=>Math.round(v*1000)/1000;
  let raw=r.raw.current,mar=r.marinated.current;
  if(action==='entry')raw+=n;if(action==='marinate'){raw-=n;mar+=n;}if(action==='send')mar-=n;
  if(action==='waste'){if($('#stock-state').value==='raw')raw-=n;else mar-=n;}
  $('#preview').textContent=action==='send'?`En CEDIS hay ${view.fmt(r.total)} − salen ${view.fmt(n)} = quedan ${view.fmt(round(raw+mar))} pollos. De los ${view.fmt(r.marinated.current)} marinados quedarán ${view.fmt(round(mar))}.`:
   action==='receive'?'Se guardará lo recibido en Sucursal, tu nombre y la hora.':`Quedarán en CEDIS: ${view.fmt(round(raw))} sin marinar + ${view.fmt(round(mar))} marinados = ${view.fmt(round(raw+mar))} pollos.`;
  if(action==='send'&&mar<0)$('#preview').textContent='No hay suficientes Pollos Marinados registrados para esa salida. Revisa las cantidades o registra primero que ya se marinaron.';
 }
 $('#protein').onchange=()=>{if(dirty&&!confirm('¿Descartar esta captura sin guardar?')){$('#protein').value=$('#protein').dataset.previous||'rosti';return;}dirty=false;$('#protein').dataset.previous=$('#protein').value;form();};
 $('#action').onchange=()=>{if(dirty&&!confirm('¿Descartar esta captura sin guardar?')){$('#action').value=lastAction;return;}fields();dirty=false;$('#notes').value='';};
 document.querySelectorAll('[data-start-action]').forEach(b=>b.onclick=()=>{
  if(busy||!snapshot)return;
  if(dirty&&!confirm('¿Descartar esta captura sin guardar?'))return;
  const action=b.dataset.startAction;
  if(![...$('#action').options].some(o=>o.value===action)){$('#error').textContent='Primero elige la proteína y registra cuántos pollos hay en CEDIS.';$('#protein').focus();return;}
  dirty=false;$('#capture').disabled=false;$('#movements-capture').disabled=true;$('#movements-form').reset();$('#balances').innerHTML=movementCards();$('#other-operations').open=true;$('#notes').value='';$('#error').textContent='';$('#action').value=action;fields();$('#protein-form').scrollIntoView({behavior:'smooth',block:'start'});$('#fields input')?.focus({preventScroll:true});
 });
 $('#protein-form').addEventListener('input',e=>{if(['protein','action'].includes(e.target.id))return;dirtyForm='other';dirty=true;$('#movements-capture').disabled=true;$('#status').textContent='Cambios sin guardar';preview();});
 $('#protein-form').onsubmit=async e=>{
  e.preventDefault();if(busy||!snapshot)return;const action=$('#action').value,body={date:loadedDate,revision:snapshot.revision,protein:$('#protein').value,action,notes:$('#notes').value};
  for(const key of ['raw','marinated','amount','shipment'])if($('#'+key))body[key]=Number($('#'+key).value);
  if(action==='send')body.slot=$('#slot').value;if(action==='waste')body.state=$('#stock-state').value;
  if(action==='rectify'){
   const r=snapshot.rows.find(r=>r.protein===body.protein);
   if(!confirm(`${view.names[body.protein]} · ${loadedDate}\nSin marinar: ${view.fmt(r.raw.current)} → ${view.fmt(body.raw)}\nPollos Marinados: ${view.fmt(r.marinated.current)} → ${view.fmt(body.marinated)}\nMotivo: ${body.notes}\n\n¿Guardar estas cantidades como lo que realmente hay en CEDIS? La corrección quedará registrada con tu nombre.`))return;
  }
  lock(true);$('#error').textContent='';try{snapshot=await api(body,loadedDate);dirty=false;render();$('#status').textContent=(action==='rectify'?'Inventario rectificado correctamente':'Movimiento guardado correctamente')+' · '+snapshot.date;}catch(error){$('#error').textContent=error.message;}finally{lock(false);}
 };
 $('#reset-shortcut').onclick=async()=>{
  if(busy||!snapshot||snapshot.role!=='manager'||loadedDate!==today)return;
  if(dirty&&!confirm('Hay una captura sin guardar. ¿Descartarla para reiniciar Proteínas?'))return;
  const notes=prompt('Motivo del reinicio de Proteínas:');if(notes===null)return;
  if(notes.trim().length<3){$('#error').textContent='Escribe el motivo del reinicio.';return;}
  const balances=snapshot.rows.map(r=>r.name+': '+view.fmt(r.raw.current)+' sin marinar + '+view.fmt(r.marinated.current)+' marinados → 0').join('\n');
  if(!confirm(balances+'\n\nSe cerrará el ciclo anterior: saldos, acumulados y recepciones pendientes empezarán en cero hoy. La bitácora anterior queda conservada.\nMotivo: '+notes+'\n\n¿Reiniciar las dos proteínas con tu autorización actual?'))return;
  lock(true);$('#error').textContent='';
  try{snapshot=await api({action:'reset',date:loadedDate,revision:snapshot.revision,notes:notes.trim(),confirm:true},loadedDate);dirty=false;render();$('#status').textContent='Proteínas reiniciadas en cero. Ya puedes rectificar con el inventario físico de hoy.';}
  catch(e){$('#error').textContent=e.message;}finally{lock(false);}
 };
 $('#reload').onclick=()=>{if(!dirty||confirm('¿Descartar la captura sin guardar y actualizar?'))load();};
 $('#date').onchange=()=>{if(dirty&&!confirm('¿Descartar la captura sin guardar y cambiar de fecha?')){$('#date').value=loadedDate;return;}load();};
 window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});load();
})();
