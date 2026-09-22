'use strict';
(()=>{
 const $=s=>document.querySelector(s),view=window.ChickenProteinView;
 let snapshot,busy=false,dirty=false,loadedDate,lastAction;
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City'}).format(new Date());
 const requested=new URLSearchParams(location.search).get('date');
 $('#date').value=requested&&/^\d{4}-\d{2}-\d{2}$/.test(requested)?requested:today;
 $('#date').max=today;
 const actions={initial:'Existencias iniciales',entry:'Entrada de proveedor',marinate:'Pasar a Pollos Marinados',send:'Enviar a Sucursal',receive:'Confirmar recepción en Sucursal',count:'Conteo físico en CEDIS',waste:'Registrar merma'};
 const guidance={initial:'Cuenta por separado lo que está por preparar y lo que ya está marinado en CEDIS. Esta apertura se registra una sola vez.',entry:'Lo recibido del proveedor se suma al pollo por preparar.',marinate:'Se descuenta del pollo por preparar y se suma a Pollos Marinados. El total en CEDIS no cambia.',send:'Se descuentan Pollos Marinados de CEDIS. Sucursal confirmará lo que recibió.',receive:'Cuenta lo recibido y confirma el total de esa entrega, incluso cero si no llegó. Si hay diferencia, explica el motivo. Cada envío se confirma una sola vez.',count:'Captura lo contado físicamente en CEDIS. Una diferencia queda registrada para revisión y no cambia el saldo.',waste:'Registra lo que sale por merma y explica el motivo.'};
 const field=(id,label)=>`<label>${label} (pollos)<input id="${id}" name="${id}" type="number" min="0" max="1000000" step="0.001" inputmode="decimal" required placeholder="Sin captura" autocomplete="off"></label>`;
 function lock(on){busy=on;$('#capture').disabled=on||!snapshot;$('#date').disabled=on;$('#reload').disabled=on;}
 async function api(body,day){const r=await fetch('/api/protein-inventory?date='+encodeURIComponent(day),body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});if(r.status===401){location.assign('/inventario.html?next='+encodeURIComponent('/proteinas.html?date='+day));throw Error('Inicia sesión para continuar.');}const data=await r.json();if(!r.ok)throw Error(data.error);return data;}
 function form(){
  if(!snapshot)return;
  const protein=$('#protein').value,role=snapshot.role,row=snapshot.rows.find(r=>r.protein===protein),before=$('#action').value;
  const allowed=Object.keys(actions).filter(a=>a==='initial'?role==='manager'&&row.raw.current===null:a==='receive'?['manager','kitchen'].includes(role):role!=='kitchen'&&row.raw.current!==null);
  $('#action').innerHTML=allowed.map(a=>`<option value="${a}">${actions[a]}</option>`).join('');
  if(allowed.includes(before))$('#action').value=before;
  $('#notes').value='';fields();
 }
 function fields(){
  const action=$('#action').value,protein=$('#protein').value;
  lastAction=action;
  $('#guidance').textContent=guidance[action]||'Gerencia debe registrar primero las existencias iniciales.';
  $('#notes').required=action==='waste';$('#save').disabled=!action;
  let html=['initial','count'].includes(action)?field('raw','Pollo por preparar')+field('marinated','Pollos Marinados'):action?field('amount',action==='receive'?'Total recibido':'Cantidad'):'';
  if(action==='send')html+='<label>Entrega<select id="slot"><option value="morning">Mañana</option><option value="noon">Mediodía</option><option value="other">Otra entrega</option></select></label>';
  if(action==='waste')html+='<label>Estado<select id="stock-state"><option value="raw">Pollo por preparar</option><option value="marinated">Pollos Marinados</option></select></label>';
  if(action==='receive'){
   const pending=snapshot.shipments.filter(s=>s.protein===protein&&!s.receipt);
   html+=`<label>Envío<select id="shipment" required>${pending.map(s=>`<option value="${s.id}">${view.esc(s.date)} · ${view.slots[s.slot]} · ${view.fmt(s.sent)} pollos · #${s.id}</option>`).join('')}</select></label>`;
   if(!pending.length){html='<p>No hay envíos pendientes de recepción para esta proteína.</p>';$('#save').disabled=true;}
  }
  $('#fields').innerHTML=html;$('#preview').textContent='';
 }
 function render(){
  $('#back').href='/supervision.html?area=supervision&date='+snapshot.date;
  $('#balances').innerHTML=view.cards(snapshot);$('#shipments').innerHTML=view.shipments(snapshot);$('#week').innerHTML=view.week(snapshot);$('#history').innerHTML=view.history(snapshot);
  form();$('#status').textContent='Datos al '+snapshot.date+' · '+new Date().toLocaleTimeString('es-MX');
 }
 async function load(){
  const day=$('#date').value;if(!day)return;lock(true);$('#error').textContent='';
  try{const data=await api(null,day);snapshot=data;loadedDate=day;dirty=false;render();}
  catch(e){$('#error').textContent=e.message;if(loadedDate)$('#date').value=loadedDate;}
  finally{lock(false);}
 }
 function preview(){
  const action=$('#action').value,r=snapshot.rows.find(r=>r.protein===$('#protein').value),amount=$('#amount');
  if(!amount||amount.value===''||!amount.validity.valid){$('#preview').textContent='';return;}
  const n=Number(amount.value),round=v=>Math.round(v*1000)/1000;
  let raw=r.raw.current,mar=r.marinated.current;
  if(action==='entry')raw+=n;if(action==='marinate'){raw-=n;mar+=n;}if(action==='send')mar-=n;
  if(action==='waste'){if($('#stock-state').value==='raw')raw-=n;else mar-=n;}
  $('#preview').textContent=action==='receive'?'Se guardará tu nombre y la hora de confirmación.':`Después de guardar: por preparar ${view.fmt(round(raw))} · Pollos Marinados ${view.fmt(round(mar))} · total ${view.fmt(round(raw+mar))}`;
 }
 $('#protein').onchange=()=>{if(dirty&&!confirm('¿Descartar esta captura sin guardar?')){$('#protein').value=$('#protein').dataset.previous||'rosti';return;}dirty=false;$('#protein').dataset.previous=$('#protein').value;form();};
 $('#action').onchange=()=>{if(dirty&&!confirm('¿Descartar esta captura sin guardar?')){$('#action').value=lastAction;return;}fields();dirty=false;$('#notes').value='';};
 $('#protein-form').addEventListener('input',e=>{if(['protein','action'].includes(e.target.id))return;dirty=true;$('#status').textContent='Cambios sin guardar';preview();});
 $('#protein-form').onsubmit=async e=>{
  e.preventDefault();if(busy||!snapshot)return;const action=$('#action').value,body={date:loadedDate,revision:snapshot.revision,protein:$('#protein').value,action,notes:$('#notes').value};
  for(const key of ['raw','marinated','amount','shipment'])if($('#'+key))body[key]=Number($('#'+key).value);
  if(action==='send')body.slot=$('#slot').value;if(action==='waste')body.state=$('#stock-state').value;
  lock(true);$('#error').textContent='';try{snapshot=await api(body,loadedDate);dirty=false;render();$('#status').textContent='Movimiento guardado correctamente · '+snapshot.date;}catch(error){$('#error').textContent=error.message;}finally{lock(false);}
 };
 $('#reload').onclick=()=>{if(!dirty||confirm('¿Descartar la captura sin guardar y actualizar?'))load();};
 $('#date').onchange=()=>{if(dirty&&!confirm('¿Descartar la captura sin guardar y cambiar de fecha?')){$('#date').value=loadedDate;return;}load();};
 window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});load();
})();
