'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = n => (n/1000).toLocaleString('es-MX',{maximumFractionDigits:3});
  let snapshot, tab='home', location='sucursal', events=[], selectedRequest=null, busy=false, pending=null;
  const labels={kitchenPlanning:'Orden de producción',kitchenProduction:'Preparaciones en kg',weeklyPurchases:'Compras semanales',proteins:'Existencias de pollo',requestForm:'Solicitud de inventario',incoming:'Recepción de inventario',home:'Control del día',stock:'Inventario',supply:'Abastecimiento',production:'Producción',sales:'Ventas del día',counts:'Conteos',receipts:'Entradas e insumos',opening:'Apertura',history:'Historial',catalog:'Catálogo'};
  const opNames={purchaseRequest:'Solicitud de compra semanal',approvePurchase:'Autorización de compra',initial:'Saldo inicial',supplier:'Recepción externa',purchase:'Pedido autorizado a proveedor',transform:'Preparación de insumos',request:'Solicitud',send:'Envío',receive:'Recepción Sucursal',transitReturn:'Devolución a CEDIS',prepare:'Preparación',cook:'Cocción',sale:'Venta / cortesía',count:'Conteo',reconcile:'Conciliación',catalog:'Artículo nuevo',consume:'Consumo de insumos',reverse:'Corrección',closeRequest:'Cierre de solicitud',opening:'Apertura'};
  let basicPanel = new URLSearchParams(window.location.search).get('panel') === 'nancy';
  let proteinData, lastLoadedAt;
  let operationalArea = AreaNavigation.selected;
  function inArea(i) {
    if(['general','supervision'].includes(operationalArea))return true;
    if(operationalArea==='rosticero')return i.id.startsWith('rosti-');
    if(operationalArea==='freidoras')return i.id.startsWith('cruji-')||['harina','papa-gajos'].includes(i.id);
    if(operationalArea==='rastro')return i.area.startsWith('Rastro');
    if(operationalArea==='almacen')return i.area.startsWith('Almacén');
    if(operationalArea==='trastes')return i.area==='Almacén · Limpieza';
    if(operationalArea==='cocina')return i.area.startsWith('Cocina')||i.kind==='supply'&&i.area!=='Almacén · Limpieza';
    if(operationalArea==='ventas_barras')return i.kind==='finished';
    return false;
  }
  const areaItems=()=>snapshot.data.items.filter(inArea);
  function selectInventoryArea(code) {
    if(busy)return;
    operationalArea=code;
    if(!snapshot)return;
    if(['rastro','almacen'].includes(code))location='cedis';
    else if(code!=='general'&&code!=='supervision')location='sucursal';
    $('#location').value=location;
    if(code!=='general')tab=code==='cocina'?'kitchenProduction':basicPanel?'proteins':'stock';render();
  }
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
    const next=new URLSearchParams(window.location.search).get('next');
    if(next){const destination=new URL(next,window.location.origin);if(destination.origin===window.location.origin&&['/dashboard.html','/preguntale.html','/supervision.html'].includes(destination.pathname)){window.location.replace(destination.href);return;}}
    basicPanel=new URLSearchParams(window.location.search).get('panel')==='nancy'||result.user.id==='nancy';
    if(basicPanel&&!result.user.pilot&&!['home','requestForm','incoming','proteins','kitchenPlanning','kitchenProduction','weeklyPurchases'].includes(tab))tab='home';
    proteinData=await api('proteins');lastLoadedAt=new Date();
    ChickenFeedback.progress('nancy-verificaciones:'+proteinData.day,Math.round(proteinData.nancy.verified/proteinData.nancy.total*100),'Nancy: verificaciones completas ⭐');
    $('#workspace').hidden=false;$('#login-panel').hidden=true;$('#logout').hidden=false;
    $('#identity').textContent=`${result.user.name} · ${result.today}${result.user.pilot?' · Acceso de prueba':''}`;
    events=await api('history');render();
    if(!document.querySelector('.area-sidebar'))AreaNavigation.mount(document.body,selectInventoryArea);
  }
  function requestCommand(type,values){return {id:crypto.randomUUID(),version:snapshot.version,type,...values};}
  async function commit(type,values){
    if(busy)return;busy=true;
    const content=JSON.stringify({type,...values});
    if(!pending||pending.content!==content)pending={content,command:requestCommand(type,values)};
    $('#view').querySelectorAll('button').forEach(b=>b.disabled=true);
    try{
      const result=await api('operation',pending.command);pending=null;msg('Registro guardado.');
      const difference=type==='count'&&result.event?.detail.status==='pending';
      ChickenFeedback.saved(difference?'Diferencia registrada · pendiente de revisar':type==='receive'?'Recepción guardada ✓':type==='request'?'Solicitud guardada ✓':type==='count'?'Existencia verificada ✓':'Registro guardado ✓',difference);
      await load();
    }
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
    $('#inventory-scope-note')?.remove();
    if(!['general','supervision'].includes(operationalArea))$('#view').insertAdjacentHTML('beforebegin',`<p id="inventory-scope-note" class="inv-note">${['home','stock','counts'].includes(tab)?'Existencias y conteos filtrados por área. Los saldos pertenecen a la ubicación seleccionada.':'Operación compartida de la ubicación seleccionada.'} <a href="#" id="all-inventory">Ver todas las áreas</a></p>`);
    $('#all-inventory')?.addEventListener('click',e=>{e.preventDefault();AreaNavigation.select('general');});
    $('#nav').innerHTML=Object.entries(labels).filter(([k])=>basicPanel&&!snapshot.user.pilot?['home','requestForm','incoming','proteins','kitchenPlanning','kitchenProduction','weeklyPurchases'].includes(k):(k!=='catalog'||can('catalog'))).map(([k,n])=>`<button type="button" data-tab="${k}" ${tab===k?'aria-current="page"':''}>${n}</button>`).join('');
    ({home,stock,supply,production,sales,counts,receipts,opening,history,catalog,proteins,requestForm,incoming,kitchenPlanning,kitchenProduction,weeklyPurchases})[tab]();
  }
  function navigate(next){if(busy)return;if(basicPanel&&!snapshot.user.pilot&&!['home','requestForm','incoming','proteins','kitchenPlanning','kitchenProduction','weeklyPurchases'].includes(next))return;tab=next;render();}
  function stockRows(){return areaItems().map(i=>`<div class="inv-row"><div>${esc(i.name)}<small>${esc(i.area)}</small></div><strong>${initialized(location,i.id)?`${fmt(bal(location,i.id))} ${esc(i.unit)}`:'Sin saldo inicial'}</strong></div>`).join('');}
  function home(){
    if(basicPanel){
      const n=proteinData.nancy;
      $('#page-title').textContent='Control Operativo';
      $('#view').innerHTML=`<div class="inv-grid">${panel('Mis controles',`<div class="inv-stack"><button data-go="requestForm">Solicitud de inventario</button><button data-go="incoming">Recepción de inventario</button><button data-go="proteins">Existencias de pollo · verificar</button><a href="/supervision.html">Actividades y asistencia</a></div>`)}${panel('Seguimiento de mi supervisión',`<p><strong>${Math.round(n.verified/n.total*100)} % · ${n.verified} de ${n.total}</strong> existencias por ubicación verificadas hoy por Nancy.</p><p><strong>${n.receiptsToday}</strong> entregas confirmadas hoy por Nancy.</p><p><strong>${n.differencesResolvedToday}</strong> diferencias atendidas hoy por el equipo.</p><p>Momentos registrados: ${esc(n.moments.join(', ')||'Ninguno todavía')}.</p><p><strong>${proteinData.unresolved.length}</strong> conteos de proteína con diferencias pendientes.</p><p class="inv-note">Detectar una diferencia también cuenta como verificación. Las verificaciones de otras personas conservan su propio responsable.</p>`)}</div>`;
      return;
    }
    const pendingCounts=snapshot.data.counts.filter(c=>c.location===location&&c.status==='pending');
    const open=snapshot.data.requests.filter(r=>r.status==='open');
    const noInitial=areaItems().filter(i=>!initialized(location,i.id)).length;
    $('#view').innerHTML=`<div class="inv-grid">${panel('Requiere atención',`<div class="inv-stack">${noInitial?`<button data-go="stock">${noInitial} artículos sin saldo inicial</button>`:''}<button data-go="supply">${open.length} solicitudes abiertas</button><button data-go="counts">${pendingCounts.length} conteos por conciliar</button><button data-go="sales">Registrar ventas del día</button><button data-go="opening">Apertura de ${location==='cedis'?'Rastro':'Sucursal'}</button></div>`)}${panel('Existencias',stockRows())}</div>`;
  }
  async function kitchenPlanning(){
    $('#view').innerHTML=panel('Orden de producción de cocina',`<label>Fecha de producción<input type="date" id="kitchen-plan-date" min="${snapshot.today}" value="${snapshot.today}"></label><p>Programa los kg requeridos. Las preparaciones semanales solo cuentan como pendientes en la fecha programada. Desayuno: registrar salida y regreso en Asistencia.</p><div id="kitchen-plan-list">Cargando…</div>`);
    const dateInput=$('#kitchen-plan-date');
    async function show(){
      const date=dateInput.value;
      try{const response=await fetch('/api/kitchen-plan?date='+encodeURIComponent(date));const data=await response.json();if(!response.ok)throw new Error(data.error);
        if(!$('#kitchen-plan-list')||dateInput.value!==date)return;
        $('#kitchen-plan-list').innerHTML=data.activities.map(a=>`<form class="inv-row" data-plan-id="${a.id}"><label>${esc(a.name)}<small>${a.frequency==='weekly'?'Semanal · solo fecha programada':'Diaria'}${a.scheduled_by?' · '+esc(a.scheduled_by):''}</small><input name="kg" type="number" step="0.001" min="0" value="${a.kg??''}" placeholder="kg requeridos" required></label><button type="submit">Guardar kg</button></form>`).join('')||'<p>No hay preparaciones disponibles para esta fecha.</p>';
        document.querySelectorAll('[data-plan-id]').forEach(f=>f.addEventListener('submit',async e=>{e.preventDefault();const b=f.querySelector('button');b.disabled=true;try{const res=await fetch('/api/kitchen-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:dateInput.value,activity_id:Number(f.dataset.planId),kg:Number(new FormData(f).get('kg'))})});const result=await res.json();if(!res.ok)throw new Error(result.error);ChickenFeedback.saved('Producción programada ✓');await show();}catch(err){msg(err.message,true);}finally{b.disabled=false;}}));
      }catch(e){msg(e.message,true);}
    }
    dateInput.addEventListener('change',show);await show();
  }
  function kitchenProduction(){
    const products=snapshot.data.items.filter(i=>i.id.startsWith('cocina-'));
    $('#view').innerHTML=panel('Existencias de preparaciones · kg',products.map(i=>`<div class="inv-row"><span>${esc(i.name)}</span><strong>${initialized('sucursal',i.id)?fmt(bal('sucursal',i.id))+' kg':'Sin saldo inicial'}</strong></div>`).join(''));
    const missing=products.filter(i=>!initialized('sucursal',i.id));
    if(can('initial')&&missing.length){$('#view').insertAdjacentHTML('beforeend',panel('Conteo inicial de preparaciones',`<form id="kitchen-initial"><p>Pesa las existencias, incluido el residual. Captura cero si no hay producto. No conviertas automáticamente las unidades de artículos anteriores.</p>${quantityList(missing,null)}${noteField()}${submit('Guardar existencia inicial')}</form>`));wireForm('kitchen-initial',(v,f)=>commit('initial',{location:'sucursal',lines:linesFrom(f),note:v.note}));}
    if(can('transform')){$('#view').insertAdjacentHTML('beforeend',panel('Registrar preparación pesada',`<form id="kitchen-transform"><p>Captura insumos realmente utilizados y kg obtenidos. Si utilizas una preparación en otra, registra también ese consumo.</p><details><summary>Insumos utilizados · unidad original</summary><div id="kitchen-inputs">${quantityList(snapshot.data.items.filter(i=>i.kind!=='equipment'&&initialized('sucursal',i.id)),'sucursal')}</div></details><details open><summary>Preparaciones obtenidas · kg</summary><div id="kitchen-outputs">${quantityList(products.filter(i=>initialized('sucursal',i.id)),null)}</div></details>${noteField(true,'Tanda / referencia de producción')}${submit('Registrar producción')}</form>`));wireForm('kitchen-transform',(v,f)=>commit('transform',{location:'sucursal',inputs:linesFrom(f.querySelector('#kitchen-inputs')),outputs:linesFrom(f.querySelector('#kitchen-outputs')),note:v.note}));}
    if(can('count')){$('#view').insertAdjacentHTML('beforeend',panel('Conteo de cierre · preparaciones',`<form id="kitchen-count">${quantityList(products.filter(i=>initialized('sucursal',i.id)),null)}${noteField(true,'Referencia de cierre / diferencias')}${submit('Guardar conteo')}</form>`));wireForm('kitchen-count',(v,f)=>commit('count',{location:'sucursal',moment:'cierre',lines:linesFrom(f),note:v.note}));}
  }
  function weeklyPurchases(){
    const requests=snapshot.data.purchaseRequests||[], purchases=snapshot.data.purchases||[];
    const pending=purchases.filter(p=>p.request&&p.lines.some(l=>l.qty>(p.received.find(x=>x.item===l.item)?.qty||0)));
    const supplies=snapshot.data.items.filter(i=>i.kind==='supply'||i.kind==='raw');
    $('#view').innerHTML=panel('Abastecimiento semanal · proveedores locales y foráneos',`<p>Revisa existencias diariamente y consolida la compra semanal. Necesidad hasta la próxima compra + reserva acordada − existencia − pedidos pendientes. Leche, aceite, jabón y cloro se compran en 3B cuando corresponda; sin mínimos inventados.</p>${can('purchaseRequest')?`<form id="weekly-request"><div class="inv-form-grid"><label>Fecha requerida<input name="due" type="date" min="${snapshot.today}" value="${snapshot.today}" required></label><label>Proveedor<input name="supplier" value="3B" maxlength="100" required></label>${selectField('supplierType','Proveedor',[['local','Local'],['foraneo','Foráneo']])}${selectField('location','Recibir en',[['sucursal','Sucursal'],['cedis','CEDIS']])}${selectField('urgency','Programación',[['weekly','Compra semanal'],['urgent','Excepción urgente']])}</div><details><summary>Existencias y cantidades a solicitar</summary>${quantityList(supplies,location)}</details>${noteField(false,'Motivo de urgencia / referencia de la semana')}${submit('Solicitar compra')}</form>`:''}`);
    const weeklyForm=$('#weekly-request');
    if(weeklyForm){const dest=weeklyForm.elements.location;dest.value=location;const updateBalances=()=>weeklyForm.querySelectorAll('.qty-item').forEach(label=>{const i=item(label.querySelector('input').name.slice(2));const outstanding=purchases.filter(p=>(p.location||'cedis')===dest.value).reduce((n,p)=>n+p.lines.filter(l=>l.item===i.id).reduce((v,l)=>v+l.qty-(p.received.find(x=>x.item===i.id)?.qty||0),0),0);label.querySelector('small').textContent=i.unit+' · '+dest.value+': '+(initialized(dest.value,i.id)?fmt(bal(dest.value,i.id)):'Sin inicializar')+' · Pedido pendiente: '+fmt(outstanding);});dest.addEventListener('change',updateBalances);updateBalances();}
    wireForm('weekly-request',(v,f)=>commit('purchaseRequest',{supplier:v.supplier,supplierType:v.supplierType,due:v.due,location:v.location,urgent:v.urgency==='urgent',lines:linesFrom(f),note:v.note}));
    $('#view').insertAdjacentHTML('beforeend',panel('Solicitudes por proveedor',requests.length?requests.slice().sort((a,b)=>a.due.localeCompare(b.due)||a.supplier.localeCompare(b.supplier)).map(r=>`<section class="inv-panel"><h3>${esc(r.due)} · ${esc(r.supplier)}</h3><p>${r.urgent?'Urgente':'Semanal'} · ${esc(r.location)} · ${esc(r.actor)} · ${r.status==='approved'?'Autorizada por '+esc(r.approvedBy):'Pendiente de autorización'}</p><p>${r.lines.map(l=>esc(item(l.item).name)+': '+fmt(l.qty)+' '+esc(item(l.item).unit)).join(' · ')}</p><p>${esc(r.note)}</p>${r.status==='requested'&&can('approvePurchase')&&(snapshot.user.pilot||['lilian','miguel'].includes(snapshot.user.id))?`<button type="button" data-approve-purchase="${r.id}">Autorizar compra</button>`:''}</section>`).join(''):'Sin solicitudes semanales.'));
    document.querySelectorAll('[data-approve-purchase]').forEach(b=>b.addEventListener('click',()=>commit('approvePurchase',{request:b.dataset.approvePurchase})));
    $('#view').insertAdjacentHTML('beforeend',panel('Recibir compras autorizadas',pending.length?pending.map(p=>`<section class="inv-panel"><h3>${esc(p.supplier)} · ${esc(p.location)}</h3><p>${p.lines.map(l=>esc(item(l.item).name)+': pendiente '+fmt(l.qty-(p.received.find(x=>x.item===l.item)?.qty||0))+' '+esc(item(l.item).unit)).join(' · ')}</p>${can('supplier')?`<form data-weekly-receipt="${p.id}" data-location="${p.location}">${quantityList(p.lines.filter(l=>l.qty>(p.received.find(x=>x.item===l.item)?.qty||0)).map(l=>item(l.item)),null)}<label>Comprobante / referencia<input name="receipt" required maxlength="150"></label><label>Importe pagado en esta recepción · MXN<input name="amount" type="number" min="0" step="0.01" required></label>${selectField('paymentSource','Origen del pago',[['banco','Banco'],['caja','Caja'],['otro','Otro']])}${noteField(true,'Recepción / motivo de salida de caja')}${submit('Confirmar compra recibida')}</form>`:''}</section>`).join(''):'No hay compras autorizadas pendientes.'));
    document.querySelectorAll('[data-weekly-receipt]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();if(f.reportValidity()){const v=Object.fromEntries(new FormData(f));commit('supplier',{location:f.dataset.location,purchase:f.dataset.weeklyReceipt,lines:linesFrom(f),receipt:v.receipt,amount:v.amount,paymentSource:v.paymentSource,note:v.note});}}));
    const receipts=purchases.flatMap(p=>(p.receipts||[]).map(r=>({...r,supplier:p.supplier})));
    $('#view').insertAdjacentHTML('beforeend',panel('Compras recibidas y comprobantes',receipts.map(r=>`<p>${esc(r.supplier)} · ${esc(nowDate(r.at))} · $${Number(r.amount).toFixed(2)} MXN · ${esc(r.paymentSource)}${r.reversedAt?' · REVERSADA':''} · Comprobante: ${esc(r.receipt)}</p>`).join('')||'Sin comprobantes registrados.'));
  }
  function requestForm(){
    const tomorrow=new Date(`${snapshot.today}T12:00:00Z`);tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
    const products=snapshot.data.items.filter(i=>['pollo-enhielado','rosti-marinado','cruji-marinado'].includes(i.id));
    $('#view').innerHTML=panel('Solicitud de pollo',can('request')?`<form id="protein-request"><label>Fecha de entrega<input type="date" name="due" min="${snapshot.today}" value="${tomorrow.toISOString().slice(0,10)}" required></label><p>Considera las existencias disponibles y solicita solamente lo necesario. El saldo anterior / residual ya está incluido.</p>${quantityList(products,'sucursal')}${noteField()}${submit('Guardar solicitud')}</form>`:'Tu cuenta no puede registrar solicitudes.');
    $('#view').insertAdjacentHTML('beforeend',panel('Solicitudes registradas',snapshot.data.requests.length?snapshot.data.requests.slice().reverse().map(r=>`<p>Entrega ${esc(r.due)} · ${esc(r.actor)} · ${r.status==='open'?'Abierta':'Cerrada'}<br>${r.lines.map(l=>esc(item(l.item).name)+': '+fmt(l.qty)+' '+esc(item(l.item).unit)).join(' · ')}</p>`).join(''):'Sin solicitudes.'));
    wireForm('protein-request',(v,f)=>commit('request',{due:v.due,lines:linesFrom(f),note:v.note}));
  }
  function incoming(){
    const shipments=snapshot.data.requests.flatMap(r=>r.shipments.map(s=>({r,s,remaining:s.lines.map(l=>({...l,qty:l.qty-(s.received.find(x=>x.item===l.item)?.qty||0)-(s.returned.find(x=>x.item===l.item)?.qty||0)})).filter(l=>l.qty>0)}))).filter(x=>x.remaining.length);
    $('#view').innerHTML=panel('Recepción en Sucursal',shipments.length?shipments.map(({r,s,remaining})=>`<section class="inv-panel"><h3>Entrega para ${esc(r.due)}</h3><p>Enviado ${esc(nowDate(s.at))} · ${esc(s.actor)}</p><div>${remaining.map(l=>`<p>${esc(item(l.item).name)} · Solicitado: ${fmt(r.lines.find(x=>x.item===l.item)?.qty||0)} · Pendiente de recibir: ${fmt(l.qty)} ${esc(item(l.item).unit)}</p>`).join('')}</div>${can('receive')?`<form data-basic-shipment="${s.id}" data-request="${r.id}"><p>Cuenta físicamente y captura lo que recibes ahora. Los campos vacíos quedan pendientes.</p>${quantityList(remaining.map(l=>item(l.item)),null)}${noteField(false,'Diferencia o comentario de recepción')}${submit('Confirmar recepción')}</form>`:''}</section>`).join(''):'No hay entregas pendientes de recepción.');
    $('#view').insertAdjacentHTML('beforeend',panel('Últimas recepciones registradas',events.filter(x=>x.data.type==='receive').map(({data:e})=>`<p>${esc(nowDate(e.at))} · ${esc(e.actor.name)}<br>${e.detail.lines.map(l=>esc(item(l.item).name)+': '+fmt(l.qty)+' '+esc(item(l.item).unit)).join(' · ')}</p>`).join('')||'Sin recepciones en el historial consultado.'));
    document.querySelectorAll('[data-basic-shipment]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();if(f.reportValidity())commit('receive',{request:f.dataset.request,shipment:f.dataset.basicShipment,lines:linesFrom(f),note:new FormData(f).get('note')});}));
  }
  function proteins(){
    const rows=proteinData.rows.filter(r=>r.location===location);
    const n=proteinData.nancy;
    const equivalent=rows.every(r=>r.initialized)?fmt(rows.reduce((sum,r)=>sum+r.current/(r.item==='cruji-cocinado'?8:1),0)):null;
    const momentLabels={apertura:'Apertura',durante:'Durante la operación',cierre:'Cierre'};
    $('#view').innerHTML=`<p class="inv-note">Saldo anterior / residual ya incluido. Actualizado: ${esc(nowDate(lastLoadedAt))}. Los saldos cambian con los movimientos registrados; la verificación física conserva su fecha y responsable.</p><div class="inv-stack">${panel('Existencias · '+(location==='cedis'?'CEDIS / Rastro':'Sucursal'),(equivalent?`<p><strong>${equivalent} pollos equivalentes</strong> en esta ubicación. CRUJI cocinado: 8 piezas equivalen a un pollo.</p>`:'<p>Total pendiente: hay saldos sin inicializar.</p>')+rows.map(r=>`<div class="inv-row"><div><strong>${esc(r.name)}</strong><small>Saldo anterior / residual: ${r.initialized?fmt(r.previous):'Sin inicializar'} · Entradas: ${fmt(r.entries)} · Salidas: ${fmt(r.exits)} ${esc(r.unit)}</small><small>${r.verification?`Último conteo: ${fmt(r.verification.quantity)} ${esc(r.unit)} · ${esc(r.verification.actor)} · ${esc(nowDate(r.verification.at))}${r.verification.movedSince?' · Hubo movimientos posteriores':''}`:'Sin verificación física registrada'}</small>${r.verification?.difference?`<small>Diferencia del último conteo: ${fmt(r.verification.difference)} ${esc(r.unit)} · ${r.verification.status==='pending'?'Pendiente':'Atendida'}</small>`:''}</div><strong>${r.initialized?fmt(r.current)+' '+esc(r.unit):'Sin saldo inicial'}</strong></div>`).join(''))}${panel('En traslado · CEDIS → Sucursal',proteinData.transit.length?proteinData.transit.map(t=>`<p>${esc(item(t.item).name)}: <strong>${fmt(t.quantity)} ${esc(item(t.item).unit)}</strong> · Enviado ${esc(nowDate(t.at))}</p>`).join(''):'Sin pollo pendiente de recibir.')}${can('count')?panel('Verificar existencia física',`<p>Cuenta primero; captura únicamente lo que verificaste. Cero es un conteo válido. Los saldos sin inicializar deben ser cargados por gerencia antes de verificarlos.</p><button type="button" id="start-protein-count">Iniciar conteo físico</button><form id="protein-count" hidden>${selectField('moment','Momento de verificación',Object.entries(momentLabels))}${rows.filter(r=>r.initialized).map(r=>`<label>${esc(r.name)} · ${esc(r.unit)}<input type="number" name="q:${r.item}" min="0" step="${r.step/1000}" placeholder="Cantidad contada" autocomplete="off"></label>`).join('')}${noteField(true,'Observación de la verificación / explicación si hay diferencia')}${submit('Guardar verificación')}</form>`):''}${panel('Seguimiento de supervisión',`<p>Nancy verificó hoy ${n.verified} de ${n.total} existencias por ubicación.</p><p>${proteinData.unresolved.length} conteos con diferencias pendientes de atención.</p>${proteinData.unresolved.map(c=>`<p>${esc(c.location==='cedis'?'CEDIS':'Sucursal')} · ${esc(c.actor)} · ${esc(nowDate(c.at))} · ${esc(c.note)}</p>`).join('')}`)}</div>`;
    if(can('initial')&&rows.some(r=>!r.initialized))$('#view').insertAdjacentHTML('beforeend',panel('Registrar existencias iniciales',`<p>Solo para comenzar el control de los saldos pendientes. Cuenta el pollo que ya está aquí, incluido el residual. No lo registres otra vez como recepción.</p><form id="protein-initial">${rows.filter(r=>!r.initialized).map(r=>`<label>${esc(r.name)} · ${esc(r.unit)}<input type="number" name="q:${r.item}" min="0" step="${r.step/1000}" placeholder="Cantidad contada"></label>`).join('')}${noteField(true,'Referencia del conteo inicial')}${submit('Registrar saldo inicial')}</form>`));
    wireForm('protein-initial',(v,f)=>commit('initial',{location,lines:linesFrom(f),note:v.note}));
    $('#start-protein-count')?.addEventListener('click',()=>{document.querySelectorAll('#view .inv-panel').forEach(p=>{if(!p.contains($('#protein-count')))p.hidden=true;});$('#protein-count').hidden=false;$('#start-protein-count').hidden=true;});
    wireForm('protein-count',(v,f)=>commit('count',{location,moment:v.moment,lines:linesFrom(f),note:v.note}));
  }
  function stock(){
    const available=areaItems().filter(i=>!initialized(location,i.id));
    $('#view').innerHTML=`<div class="inv-grid">${panel(`Inventario · ${location==='cedis'?'CEDIS':'Sucursal'}`,stockRows() || '<p>No hay artículos asociados a esta área en el catálogo actual.</p>')}${can('initial')?panel('Saldo inicial',available.length?`<form id="initial-form"><p>Cuenta las existencias antes de comenzar. Captura cero si no hay producto. Cada artículo se inicializa una sola vez.</p>${quantityList(available,location)}${noteField(false,'Referencia del conteo inicial')}${submit('Guardar saldos iniciales')}</form>`:'Todos los artículos tienen saldo inicial. Usa Conteos para verificar diferencias.') : ''}</div>`;
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
    $('#view').innerHTML=`<div class="inv-stack">${can('count')?panel(location==='cedis'?'Conteo semanal de CEDIS':'Conteo de cierre de Sucursal',`<form id="count-form"><div class="inv-note">Captura cada artículo que verificaste. Los campos vacíos quedan fuera del alcance de este conteo; para un cierre completo cuenta todos los artículos activos.</div>${quantityList(areaItems().filter(i=>initialized(location,i.id)),location)}${noteField()}${submit('Guardar conteo físico')}</form>`):''}${panel('Conteos registrados',list.length?list.map(c=>`<details><summary>${esc(nowDate(c.at))} · ${esc(c.actor)} · ${c.status==='pending'?'Diferencias pendientes':c.status==='matched'?'Coincide':'Conciliado'}</summary>${c.lines.map(l=>`<div class="inv-row"><span>${esc(item(l.item).name)}</span><span>Registro ${fmt(l.expected)} · Físico ${fmt(l.qty)} · Diferencia ${fmt(l.qty-l.expected)} ${esc(item(l.item).unit)}</span></div>`).join('')}<p>${esc(c.note)}</p>${c.status==='pending'&&can('reconcile')?`<form data-count="${c.id}">${noteField(true,'Motivo de la diferencia investigada')}${submit('Conciliar saldo con este conteo')}</form>`:''}</details>`).join(''):'Sin conteos registrados.')}</div>`;
    wireForm('count-form',(v,f)=>commit('count',{location,lines:linesFrom(f),note:v.note}));
    document.querySelectorAll('[data-count]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();if(f.reportValidity())commit('reconcile',{count:f.dataset.count,note:new FormData(f).get('note')});}));
  }
  function receipts(){
    const purchases=(snapshot.data.purchases||[]).filter(p=>!p.request&&p.lines.some(l=>l.qty>(p.received.find(r=>r.item===l.item)?.qty||0)));
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
  setInterval(async()=>{if(!snapshot||busy||document.hidden||!['home','proteins','incoming'].includes(tab)||document.querySelector('#protein-count:not([hidden])')||document.querySelector('#view input:focus,#view textarea:focus,#view select:focus')||[...document.querySelectorAll('#view input,#view textarea')].some(el=>el.value!==''))return;try{await load();}catch(e){msg('No se pudieron actualizar los datos. Última consulta: '+(lastLoadedAt?nowDate(lastLoadedAt):'sin conexión'),true);}},30000);
  load().catch(e=>{msg(e.message,e.status!==401);$('#login-panel').hidden=false;});
})();
