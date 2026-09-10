'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = n => (n/1000).toLocaleString('es-MX',{maximumFractionDigits:3});
  let snapshot, tab='home', location='sucursal', events=[], selectedRequest=null, busy=false, pending=null;
  const labels={home:'Control del día',stock:'Inventario',supply:'Abastecimiento',production:'Producción',sales:'Ventas del día',counts:'Conteos',receipts:'Entradas e insumos',opening:'Apertura',history:'Historial',catalog:'Catálogo'};
  const opNames={initial:'Saldo inicial',supplier:'Recepción externa',purchase:'Pedido autorizado a proveedor',transform:'Preparación de insumos',request:'Solicitud',send:'Envío',receive:'Recepción Sucursal',transitReturn:'Devolución a CEDIS',prepare:'Preparación',cook:'Cocción',sale:'Venta / cortesía',count:'Conteo',reconcile:'Conciliación',catalog:'Artículo nuevo',consume:'Consumo de insumos',reverse:'Corrección',closeRequest:'Cierre de solicitud',opening:'Apertura'};
  const item = id => snapshot.data.items.find(i=>i.id===id);
  const bal = (loc,id) => snapshot.data.balances[`${loc}:${id}`] || 0;
  const initialized = (loc,id) => !!snapshot.data.initialized[`${loc}:${id}`];
  const can = type => snapshot.permissions.includes(type);
  const nowDate = iso => new Date(iso).toLocaleString('es-MX',{timeZone:'America/Mexico_City'});
  function msg(value,error=false){$('#message').textContent=value;$('#message').classList.toggle('error',error);}
  async function api(action='snapshot',body) {
    const res=await fetch(`/api/inventory?action=${action}`,{credentials:'same-origin',method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
    const result=await res.json().catch(()=>({error:'Respuesta no válida. Reintenta.'}));
    if(!res.ok){const e=new Error(result.error||'No se pudo completar la operación.');e.status=res.status;throw e;}
    return result;
  }
  async function load(){
    const result=await api();snapshot=result;
    $('#workspace').hidden=false;$('#login-panel').hidden=true;$('#logout').hidden=false;
    $('#identity').textContent=`${result.user.name} · ${result.today}`;
    events=await api('history');render();
  }
  function requestCommand(type,values){return {id:crypto.randomUUID(),version:snapshot.version,type,...values};}
  async function commit(type,values){
    if(busy)return;busy=true;
    const content=JSON.stringify({type,...values});
    if(!pending||pending.content!==content)pending={content,command:requestCommand(type,values)};
    $('#view').querySelectorAll('button').forEach(b=>b.disabled=true);
    try{await api('operation',pending.command);pending=null;msg('Registro guardado.');await load();}
    catch(e){
      if(e.status===409){pending=null;msg(e.message+' No se guardó una nueva operación. Actualiza los datos para revisar.',true);}
      else{msg(e.message,true);}
      if(e.status===401){$('#workspace').hidden=true;$('#login-panel').hidden=false;}
    }finally{busy=false;$('#view').querySelectorAll('button').forEach(b=>b.disabled=false);}
  }
  const noteField=(required=false,label='Observación o referencia')=>`<label>${label}<textarea name="note" rows="2" maxlength="1000" ${required?'required':''}></textarea></label>`;
  const quantityField=(name='qty',step=1)=>`<label>Cantidad<input name="${name}" type="number" min="${step}" step="${step}" required></label>`;
  const selectField=(name,label,options)=>`<label>${label}<select name="${name}">${options.map(([v,n])=>`<option value="${esc(v)}">${esc(n)}</option>`).join('')}</select></label>`;
  const submit=label=>`<button class="inv-primary" type="submit">${label}</button>`;
  const panel=(title,body)=>`<section class="inv-panel"><h2>${title}</h2>${body}</section>`;
  function itemOptions(predicate=()=>true){return snapshot.data.items.filter(predicate).map(i=>[i.id,`${i.name} · ${i.unit}`]);}
  function wireForm(id,fn){const form=document.getElementById(id);if(form)form.addEventListener('submit',e=>{e.preventDefault();if(form.reportValidity())fn(Object.fromEntries(new FormData(form)),form);});}
  function quantityList(items,loc,defaults=null){return `<div class="qty-list">${items.map(i=>`<label class="qty-item"><span>${esc(i.name)}<small>${esc(i.unit)} · ${loc?`Saldo: ${initialized(loc,i.id)?fmt(bal(loc,i.id)):'Sin inicializar'}`:esc(i.area)}</small></span><input type="number" name="q:${esc(i.id)}" min="0" step="${i.step/1000}" placeholder="Sin capturar" ${defaults?`value="${defaults[i.id]??''}"`:''}></label>`).join('')}</div>`;}
  function linesFrom(form){return [...form.querySelectorAll('[name^="q:"]')].filter(el=>el.value!=='').map(el=>({item:el.name.slice(2),qty:el.value}));}
  function render(){
    $('#page-title').textContent=labels[tab];
    $('#nav').innerHTML=Object.entries(labels).filter(([k])=>k!=='catalog'||can('catalog')).map(([k,n])=>`<button type="button" data-tab="${k}" ${tab===k?'aria-current="page"':''}>${n}</button>`).join('');
    ({home,stock,supply,production,sales,counts,receipts,opening,history,catalog})[tab]();
  }
  function navigate(next){if(busy)return;tab=next;render();}
  function stockRows(){return snapshot.data.items.map(i=>`<div class="inv-row"><div>${esc(i.name)}<small>${esc(i.area)}</small></div><strong>${initialized(location,i.id)?`${fmt(bal(location,i.id))} ${esc(i.unit)}`:'Sin saldo inicial'}</strong></div>`).join('');}
  function home(){
    const pendingCounts=snapshot.data.counts.filter(c=>c.location===location&&c.status==='pending');
    const open=snapshot.data.requests.filter(r=>r.status==='open');
    const noInitial=snapshot.data.items.filter(i=>!initialized(location,i.id)).length;
    $('#view').innerHTML=`<div class="inv-grid">${panel('Requiere atención',`<div class="inv-stack">${noInitial?`<button data-go="stock">${noInitial} artículos sin saldo inicial</button>`:''}<button data-go="supply">${open.length} solicitudes abiertas</button><button data-go="counts">${pendingCounts.length} conteos por conciliar</button><button data-go="sales">Registrar ventas del día</button><button data-go="opening">Apertura de ${location==='cedis'?'Rastro':'Sucursal'}</button></div>`)}${panel('Existencias',stockRows())}</div>`;
  }
  function stock(){
    const available=snapshot.data.items.filter(i=>!initialized(location,i.id));
    $('#view').innerHTML=`<div class="inv-grid">${panel(`Inventario · ${location==='cedis'?'CEDIS':'Sucursal'}`,stockRows())}${can('initial')?panel('Saldo inicial',available.length?`<form id="initial-form"><p>Cuenta las existencias antes de comenzar. Captura cero si no hay producto. Cada artículo se inicializa una sola vez.</p>${quantityList(available,location)}${noteField(false,'Referencia del conteo inicial')}${submit('Guardar saldos iniciales')}</form>`:'Todos los artículos tienen saldo inicial. Usa Conteos para verificar diferencias.') : ''}</div>`;
    wireForm('initial-form',(v,f)=>commit('initial',{location,lines:linesFrom(f),note:v.note}));
  }
  function supply(){
    const requests=snapshot.data.requests;
    const req=requests.find(r=>r.id===selectedRequest)||requests.filter(r=>r.status==='open').at(-1)||requests.at(-1);
    selectedRequest=req?.id;
    const tomorrow=new Date(`${snapshot.today}T12:00:00Z`);tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
    let detail='Todavía no hay solicitudes.';
    if(req){detail=`<div class="inv-row"><strong>Entrega: ${esc(req.due)}</strong><span>${req.status==='open'?'Abierta':'Cerrada'} · ${esc(req.actor)}</span></div><div class="inv-table-wrap"><table class="inv-table"><thead><tr><th>Producto</th><th>Solicitado</th><th>Enviado neto</th><th>Recibido</th><th>Disponible Sucursal</th></tr></thead><tbody>${req.lines.map(l=>{const i=item(l.item);const sent=req.shipments.reduce((a,s)=>a+(s.lines.find(x=>x.item===l.item)?.qty||0)-(s.returned.find(x=>x.item===l.item)?.qty||0),0);const received=req.shipments.reduce((a,s)=>a+(s.received.find(x=>x.item===l.item)?.qty||0),0);return `<tr><td>${esc(i.name)}<small> ${esc(i.unit)}</small></td><td>${fmt(l.qty)}</td><td>${fmt(sent)}</td><td>${fmt(received)}</td><td>${initialized('sucursal',i.id)?fmt(bal('sucursal',i.id)):'Sin inicializar'}</td></tr>`;}).join('')}</tbody></table></div>`;
      if(req.status==='open'&&can('send'))detail+=`<details><summary>Preparar envío · Lilian / Eliseo</summary><form id="send-form">${quantityList(req.lines.map(l=>item(l.item)),'cedis')}${noteField()}${submit('Confirmar salida de CEDIS')}</form></details>`;
      req.shipments.forEach(s=>{
        const remaining=s.lines.map(l=>({...l,qty:l.qty-(s.received.find(x=>x.item===l.item)?.qty||0)-(s.returned.find(x=>x.item===l.item)?.qty||0)})).filter(l=>l.qty>0);
        detail+=`<details><summary>Envío ${esc(s.id.slice(0,8))} · ${esc(nowDate(s.at))} · ${remaining.length?'En tránsito':'Recibido / resuelto'}</summary><div class="inv-note">Transporta Eliseo · Registró ${esc(s.actor)}</div>`;
        if(remaining.length&&can('receive'))detail+=`<form data-shipment="${s.id}"><div class="inv-note">Captura solo lo que recibes ahora. El faltante conserva su saldo en tránsito.</div>${quantityList(remaining.map(l=>item(l.item)),'sucursal',Object.fromEntries(remaining.map(l=>[l.item,l.qty/1000])))}${selectField('mode','Acción',[['receive','Recibir y aceptar en Sucursal'],['transitReturn','Devolver saldo en tránsito a CEDIS']])}${noteField()}${submit('Validar cantidades')}</form>`;
        detail+='</details>';
      });
      if(req.status==='open'&&can('closeRequest'))detail+=`<details><summary>Cerrar solicitud</summary><form id="close-request">${noteField(true,'Motivo: completada o faltante cancelado')}${submit('Cerrar solicitud')}</form></details>`;
    }
    $('#view').innerHTML=`<div class="inv-stack">${panel('Solicitudes',`${requests.length?selectField('request-select','Consultar',requests.slice().reverse().map(r=>[r.id,`${r.due} · ${r.actor} · ${r.status==='open'?'Abierta':'Cerrada'}`])):''}${detail}`)}${can('request')?panel('Nueva solicitud de abastecimiento',`<form id="request-form"><label>Fecha de entrega<input name="due" type="date" min="${snapshot.today}" value="${tomorrow.toISOString().slice(0,10)}" required></label><div class="inv-note">Captura la cantidad necesaria después de considerar el residual. El conteo de cierre no modifica este pedido.</div>${quantityList(snapshot.data.items.filter(i=>i.kind!=='finished'),'sucursal')}${noteField()}${submit('Enviar solicitud')}</form>`):''}</div>`;
    const picker=$('[name=request-select]');if(picker){picker.value=req.id;picker.addEventListener('change',()=>{selectedRequest=picker.value;supply();});}
    wireForm('request-form',(v,f)=>commit('request',{due:v.due,lines:linesFrom(f),note:v.note}));
    wireForm('send-form',(v,f)=>commit('send',{request:req.id,lines:linesFrom(f),note:v.note}));
    wireForm('close-request',v=>commit('closeRequest',{request:req.id,note:v.note}));
    document.querySelectorAll('[data-shipment]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();if(f.reportValidity()){const v=Object.fromEntries(new FormData(f));commit(v.mode,{request:req.id,shipment:f.dataset.shipment,lines:linesFrom(f),note:v.note});}}));
  }
  function production(){
    const options=location==='cedis'?[['rosti','Preparar ROSTI'],['cruji','Preparar CRUJI']]:[['rostizar','Rostizar ROSTI'],['freir','Freír CRUJI']];
    const action=location==='cedis'?'prepare':'cook';
    $('#view').innerHTML=panel(location==='cedis'?'Preparación en CEDIS':'Cocción en Sucursal',can(action)?`<form id="production-form">${selectField('recipe','Proceso',options)}${quantityField()}<div class="inv-note" id="production-preview"></div>${noteField(false,'Indicación de Nancy / referencia de tanda')}${submit('Registrar transformación')}</form>`:'Tu cuenta no puede registrar esta operación.');
    const form=$('#production-form');if(form){const preview=()=>{const r=form.elements.recipe.value;const q=Number(form.elements.qty.value)||0;$('#production-preview').textContent=r==='freir'?`${q} pollos marinados → ${q*8} piezas CRUJI cocinadas`:`${q} pollos utilizados → ${q} pollos preparados`;};form.addEventListener('input',preview);preview();}
    wireForm('production-form',v=>commit(action,{recipe:v.recipe,qty:v.qty,note:v.note}));
    if(can('transform')){
      $('#view').insertAdjacentHTML('beforeend',`<section class="inv-panel inv-inline-form"><h2>Otras preparaciones: salsas, adobos y guarniciones</h2><form id="transform-form"><h3>Insumos utilizados</h3><div id="transform-inputs">${quantityList(snapshot.data.items.filter(i=>i.kind!=='equipment'),location)}</div><h3>Productos obtenidos</h3><div id="transform-outputs">${quantityList(snapshot.data.items.filter(i=>i.kind!=='equipment'),location)}</div>${noteField(true,'Preparación y rendimiento real')}${submit('Registrar preparación')}</form></section>`);
      wireForm('transform-form',(v,f)=>commit('transform',{location,inputs:linesFrom(f.querySelector('#transform-inputs')),outputs:linesFrom(f.querySelector('#transform-outputs')),note:v.note}));
    }
  }
  function sales(){
    $('#view').innerHTML=panel('Registrar ventas · Sucursal',can('sale')?`<form id="sale-form"><div class="inv-form-grid">${selectField('presentation','Presentación',[['entero','ROSTI entero'],['medio','ROSTI medio'],['cuarto','ROSTI cuarto'],['pieza','CRUJI pieza'],['crujiEntero','CRUJI completo · 8 piezas'],['article','Otro producto terminado']])}${quantityField()}${selectField('item','Otro producto',itemOptions(i=>i.kind==='finished'))}${selectField('kind','Tipo',[['sale','Venta'],['courtesy','Cortesía']])}</div><div class="inv-note" id="sale-preview"></div>${noteField(false,'Nota / motivo de cortesía')}${submit('Registrar salida por venta')}</form>`:'Tu cuenta no puede registrar ventas.');
    const form=$('#sale-form');if(form){const preview=()=>{const p=form.elements.presentation.value;form.elements.namedItem('item').closest('label').hidden=p!=='article';const factors={entero:1,medio:.5,cuarto:.25,pieza:1,crujiEntero:8};const id=p==='article'?form.elements.namedItem('item').value:['pieza','crujiEntero'].includes(p)?'cruji-cocinado':'rosti-cocinado';const product=item(id);form.elements.qty.step=p==='article'?product.step/1000:1;form.elements.qty.min=form.elements.qty.step;$('#sale-preview').textContent=product?`Disponible: ${initialized('sucursal',id)?fmt(bal('sucursal',id)):'Sin saldo inicial'} ${product.unit}. Salida: ${(Number(form.elements.qty.value)||0)*(factors[p]||1)} ${product.unit}.`:'';};form.addEventListener('input',preview);preview();}
    wireForm('sale-form',v=>commit('sale',{presentation:v.presentation,item:v.item,qty:Number(v.qty),kind:v.kind,note:v.note}));
  }
  function counts(){
    const list=snapshot.data.counts.filter(c=>c.location===location).slice().reverse();
    $('#view').innerHTML=`<div class="inv-stack">${can('count')?panel(location==='cedis'?'Conteo semanal de CEDIS':'Conteo de cierre de Sucursal',`<form id="count-form"><div class="inv-note">Captura cada artículo que verificaste. Los campos vacíos quedan fuera del alcance de este conteo; para un cierre completo cuenta todos los artículos activos.</div>${quantityList(snapshot.data.items.filter(i=>initialized(location,i.id)),location)}${noteField()}${submit('Guardar conteo físico')}</form>`):''}${panel('Conteos registrados',list.length?list.map(c=>`<details><summary>${esc(nowDate(c.at))} · ${esc(c.actor)} · ${c.status==='pending'?'Diferencias pendientes':c.status==='matched'?'Coincide':'Conciliado'}</summary>${c.lines.map(l=>`<div class="inv-row"><span>${esc(item(l.item).name)}</span><span>Registro ${fmt(l.expected)} · Físico ${fmt(l.qty)} · Diferencia ${fmt(l.qty-l.expected)} ${esc(item(l.item).unit)}</span></div>`).join('')}<p>${esc(c.note)}</p>${c.status==='pending'&&can('reconcile')?`<form data-count="${c.id}">${noteField(true,'Motivo de la diferencia investigada')}${submit('Conciliar saldo con este conteo')}</form>`:''}</details>`).join(''):'Sin conteos registrados.')}</div>`;
    wireForm('count-form',(v,f)=>commit('count',{location,lines:linesFrom(f),note:v.note}));
    document.querySelectorAll('[data-count]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();if(f.reportValidity())commit('reconcile',{count:f.dataset.count,note:new FormData(f).get('note')});}));
  }
  function receipts(){
    const purchases=(snapshot.data.purchases||[]).filter(p=>p.lines.some(l=>l.qty>(p.received.find(r=>r.item===l.item)?.qty||0)));
    $('#view').innerHTML=`<div class="inv-stack">${can('purchase')?panel('Pedido a proveedor · Validación de Lilian',`<form id="purchase-form"><label>Proveedor<input name="supplier" required maxlength="100"></label>${quantityList(snapshot.data.items,'cedis')}${noteField()}${submit('Autorizar pedido a proveedor')}</form>`):''}<div class="inv-grid">${can('supplier')?panel('Recepción de proveedor · CEDIS',purchases.length?`<form id="supplier-form">${selectField('purchase','Pedido autorizado',purchases.map(p=>[p.id,`${p.supplier} · ${nowDate(p.at)} · ${p.actor}`]))}<div id="purchase-lines"></div>${noteField(true,'Recepción contada por Eliseo y validada por Nancy')}${submit('Registrar recepción externa')}</form>`:'Primero Lilian debe autorizar un pedido a proveedor.') :''}${can('consume')?panel('Consumo de insumos',`<form id="consume-form"><div class="inv-note">Relaciona los insumos utilizados con la preparación o actividad correspondiente.</div>${quantityList(snapshot.data.items.filter(i=>i.kind==='supply'),location)}${noteField(true,'Preparación o actividad que utilizó los insumos')}${submit('Registrar consumo')}</form>`):''}</div></div>`;
    wireForm('purchase-form',(v,f)=>commit('purchase',{supplier:v.supplier,lines:linesFrom(f),note:v.note}));
    const picker=$('[name=purchase]');if(picker){const show=()=>{const p=purchases.find(p=>p.id===picker.value);$('#purchase-lines').innerHTML=quantityList(p.lines.map(l=>item(l.item)),'cedis',Object.fromEntries(p.lines.map(l=>[l.item,(l.qty-(p.received.find(r=>r.item===l.item)?.qty||0))/1000])));};picker.addEventListener('change',show);show();}
    wireForm('supplier-form',(v,f)=>commit('supplier',{location:'cedis',purchase:v.purchase,lines:linesFrom(f),note:v.note}));
    wireForm('consume-form',(v,f)=>commit('consume',{location,lines:linesFrom(f),note:v.note}));
  }
  function opening(){
    const tasks=snapshot.openingTasks[location],entry=snapshot.data.openings[`${snapshot.today}:${location}`];
    $('#view').innerHTML=panel(`Apertura de ${location==='cedis'?'Rastro · CEDIS':'Sucursal'}`,`<form id="opening-form">${tasks.map((t,i)=>`<label class="inv-check"><input name="task" type="checkbox" value="${i}" ${entry?.done.includes(i)?'checked':''} ${can('opening')?'':'disabled'}>${esc(t)}</label>`).join('')}${entry?`<p>Última revisión: ${esc(entry.actor)} · ${esc(nowDate(entry.at))}</p>`:''}${can('opening')?submit('Guardar revisión de apertura'):''}</form><p><a href="/supervision.html">Ver checklist operativo y asistencia</a></p>`);
    wireForm('opening-form',(v,f)=>commit('opening',{location,done:new FormData(f).getAll('task').map(Number)}));
  }
  function history(){
    $('#view').innerHTML=panel('Historial de inventario',`<div class="inv-actions"><button id="export" type="button">Exportar página CSV</button>${events.length===50?'<button id="older" type="button">Registros anteriores</button>':''}</div>${events.length?events.map(({version,data:e})=>`<details><summary>#${version} · ${esc(opNames[e.type]||e.type)} · ${esc(e.actor.name)} · ${esc(nowDate(e.at))}</summary><p>${esc(e.note)}</p>${e.deltas.map(d=>`<div class="inv-row"><span>${esc(d.location)} · ${esc(item(d.item)?.name||d.item)}</span><strong>${d.qty>0?'+':''}${fmt(d.qty)} ${esc(item(d.item)?.unit||'')}</strong></div>`).join('')}<pre class="inv-mini">${esc(JSON.stringify(e.detail,null,2))}</pre>${can('reverse')&&['sale','prepare','cook','supplier','consume'].includes(e.type)?`<form data-reverse="${e.id}">${noteField(true,'Motivo de corrección')}${submit('Revertir este movimiento')}</form>`:''}</details>`).join(''):'Sin movimientos.'}`);
    $('#older')?.addEventListener('click',async()=>{try{events=await api(`history&before=${events.at(-1).version}`);history();}catch(e){msg(e.message,true);}});
    $('#export').addEventListener('click',()=>{const cell=v=>`"${String(v??'').replace(/^[=+@-]/,"'").replace(/"/g,'""')}"`;const rows=[['version','fecha','tipo','responsable','ubicacion','articulo','cantidad','unidad','nota']];events.forEach(({version,data:e})=>{for(const d of e.deltas)rows.push([version,e.at,e.type,e.actor.name,d.location,item(d.item)?.name,d.qty/1000,item(d.item)?.unit,e.note]);});const blob=new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`chickenia-movimientos-${snapshot.today}.csv`;a.click();URL.revokeObjectURL(url);});
    document.querySelectorAll('[data-reverse]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();if(f.reportValidity())commit('reverse',{target:f.dataset.reverse,note:new FormData(f).get('note')});}));
  }
  function catalog(){
    $('#view').innerHTML=panel('Agregar artículo',`<form id="catalog-form"><div class="inv-form-grid"><label>Nombre<input name="name" maxlength="100" required></label><label>Unidad de control<input name="unit" maxlength="40" placeholder="kg, porciones, bultos…" required></label>${selectField('area','Espacio',[['Almacén · Seco','Almacén seco'],['Almacén · Vegetales','Cámara de vegetales'],['Almacén · Limpieza','Limpieza'],['Rastro · Marinado','Rastro'],['Sucursal · Cocción','Sucursal']])}${selectField('kind','Tipo',[['supply','Insumo'],['finished','Producto terminado'],['equipment','Equipo reutilizable']])}${selectField('step','Fracción mínima',[['1000','Unidades completas'],['500','Medias unidades'],['250','Cuartos'],['1','Milésimas (ej. kg)']])}</div><div class="inv-note">Las porciones y bultos conservan su unidad propia. No se convierten a kilos automáticamente.</div>${submit('Agregar al catálogo')}</form>`);
    wireForm('catalog-form',v=>commit('catalog',{name:v.name,unit:v.unit,area:v.area,kind:v.kind,step:Number(v.step)}));
  }
  $('#nav').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)navigate(b.dataset.tab);});
  $('#view').addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)navigate(b.dataset.go);});
  $('#location').addEventListener('change',()=>{if(!busy){location=$('#location').value;render();}});
  $('#refresh').addEventListener('click',async()=>{if(busy)return;try{pending=null;await load();msg('Datos actualizados.');}catch(e){msg(e.message,true);}});
  $('#theme').addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';try{localStorage.setItem('chickenia_theme',dark?'dark':'light');}catch{}});
  $('#logout').addEventListener('click',async()=>{if(busy)return;try{await api('logout',{});snapshot=null;events=[];pending=null;$('#workspace').hidden=true;$('#login-panel').hidden=false;$('#logout').hidden=true;$('#view').replaceChildren();msg('Sesión cerrada.');}catch(e){msg(e.message,true);}});
  $('#login-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.target;const button=form.querySelector('button');button.disabled=true;try{await api('login',Object.fromEntries(new FormData(form)));form.reset();await load();msg('');}catch(err){msg(err.message,true);}finally{button.disabled=false;}});
  load().catch(e=>{msg(e.message,e.status!==401);$('#login-panel').hidden=false;});
})();
