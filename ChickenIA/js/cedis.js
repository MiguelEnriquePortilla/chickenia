'use strict';
(() => {
  const url = '/api/inventory?action=';
  async function api(action, body) {
    const response = await fetch(url + action, body === undefined ? {} : {
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
    });
    const data = await response.json();
    if(!response.ok) throw Object.assign(Error(data.error),{status:response.status});
    return data;
  }
  function el(tag, text){
    const node = document.createElement(tag);
    if(text !== undefined) node.textContent = text;
    return node;
  }
  function login(host, ready, onError){
    const form = el('form'), label = el('label','¿Quién está capturando?');
    const select = el('select');
    select.required = true;
    select.append(new Option('Selecciona tu nombre',''));
    label.append(select);
    form.append(label,el('button','Continuar'));
    host.replaceChildren(form);
    api('people').then(({people}) => people.forEach(person => select.append(new Option(person.name,person.id)))).catch(onError);
    form.onsubmit = async event => {
      event.preventDefault();
      const button = form.querySelector('button');
      button.disabled = true;
      try { await api('login',{username:select.value}); await ready(); }
      catch(error) { onError(error); }
      finally { button.disabled = false; }
    };
  }
  function inputRow(item, hint, value, verb){
    const label = el('label'), description = el('span',(item.label || item.name) + ' · ' + item.unit);
    label.className = 'cedis-line';
    if(hint) description.append(el('small',hint));
    const input = el('input');
    Object.assign(input,{type:'number',min:'0',max:'1000000',step:'.001',value:value ?? '',inputMode:'decimal'});
    input.setAttribute('aria-label',verb + ' · ' + item.name + ' (' + item.unit + ')');
    label.append(description,input);
    return {label,input,id:item.id};
  }
  function lineForm(items, {values = {}, label, hint = () => '', requireAll = false, allocation = false, arrival = false, onEmpty = () => {}, changed = () => {}, save}){
    const form = el('form');
    const fields = items.map(item => inputRow(item,hint(item),values[item.id],label));
    const vegetables = arrival ? el('details') : null;
    vegetables?.append(el('summary','Vegetales (kg)'));
    for(const [index, field] of fields.entries()){
      field.input.required = requireAll;
      if(arrival) field.input.min = '.001';
      const container = vegetables && items[index].branch === 'Vegetales' ? vegetables : form;
      container.append(field.label);
    }
    if(vegetables?.childElementCount > 1) form.append(vegetables);
    const splits = allocation ? [
      inputRow({id:'oven',name:'POLLO ROSTIZADO (HORNO)',unit:'pollos'},'',null,'Reparto'),
      inputRow({id:'rotisserie',name:'POLLO (ROSTICERO)',unit:'pollos'},'',null,'Reparto')
    ] : [];
    if(allocation)form.append(el('p','Reparto del Rostizado pedido'),...splits.map(field=>field.label));
    if(allocation){
      const note = el('label','Nota del pedido');
      const input = el('textarea');
      input.name='order-note';
      input.maxLength=1000;
      note.append(input);
      form.append(note);
    }
    const afterCount = el('input');
    if(arrival){
      afterCount.type='checkbox';
      const option = el('label',' El conteo de Rastro de hoy ya descuenta este pollo');
      option.className='cedis-after-count';
      option.prepend(afterCount);
      form.append(option);
    }
    const button = el('button',label);
    form.append(button);
    form.oninput = arrival ? () => changed(fields.some(field=>field.input.value !== '' || field.input.validity.badInput)) : changed;
    form.onsubmit = async event => {
      event.preventDefault();
      const lines = fields.filter(field => field.input.value !== '').map(field => ({id:field.id,qty:field.input.valueAsNumber}));
      if(!lines.length){onEmpty();fields[0]?.input.focus();return;}
      button.disabled = true;
      if(arrival) form.inert = true;
      try {
        const distribution = allocation ? Object.fromEntries(splits.map(field=>[field.id,field.input.valueAsNumber || 0])) : undefined;
        await save(lines,distribution,form.elements.namedItem('order-note')?.value,afterCount.checked);
      }
      finally { button.disabled = false; if(arrival) form.inert = false; }
    };
    return form;
  }
  function orderPanel(order, catalog, onSave, changed, number){
    const details = el('details');
    const date = order.movementDate || order.date;
    const state = order.type === 'purchase' ? (order.actual ? 'Recibido' : 'Falta guardar la recepción')
      : (order.receivedAtCapture ? 'Recibido en Sucursal' : order.actual ? 'Salida guardada' : 'Pedido guardado, falta la salida');
    const header = [number == null ? null : 'Pedido #'+number,date,order.supplier,state].filter(Boolean).join(' · ');
    details.append(el('summary',header));
    if(order.note) details.append(el('p',order.note));
    if(order.allocation) details.append(el('p','Reparto del Rostizado pedido: Horno '+order.allocation.oven+' · Rosticero '+order.allocation.rotisserie));
    const items = catalog.filter(item => Object.hasOwn(order.lines,item.id));
    if(order.originalUnits){
      for(const item of items){
        const unit=order.originalUnits[item.id]||item.unit;
        details.append(el('p',item.name+' · '+(order.actual||order.lines)[item.id]+' '+unit));
      }
      details.append(el('p','Registro anterior al cambio a kilos.'));
      return details;
    }
    if(order.receivedAtCapture){
      for(const item of items)details.append(el('p',item.name+' · '+order.actual[item.id]+' '+item.unit));
      if(order.allocation)details.append(el('p','Reparto del Rostizado: Horno '+order.allocation.oven+' · Rosticero '+order.allocation.rotisserie));
      return details;
    }
    if(order.type === 'purchase' && order.actual){
      for(const item of items) details.append(el('p',item.name + ' · Llegó ' + order.actual[item.id] + ' ' + item.unit));
      return details;
    }
    const action = order.actual ? 'correct' : order.type === 'purchase' ? 'receive' : 'dispatch';
    const label = {receive:'Guardar recepción',dispatch:'Guardar salida',correct:'Guardar diferencia de entrega'}[action];
    details.append(lineForm(items,{values:order.received || order.actual || order.lines,label,requireAll:true,changed,
      hint:item=>'Pedido: ' + order.lines[item.id] + (order.actual ? ' · Salió: ' + order.actual[item.id] : ''),
      save:lines=>onSave({action,orderId:order.id,lines})}));
    return details;
  }
  window.ChicanitoStock = {api,el,login,orderPanel};
  const page = document.querySelector('[data-operation]');
  if(!page) return;
  const host = document.getElementById('cedis-content'), status = document.getElementById('cedis-status');
  const messages = {'amend-count':'Conteo corregido en el historial.','amend-quantity':'Corrección guardada en el historial.',count:'Conteo guardado en CEDIS.','request-delivered':'Pedido guardado como recibido en Sucursal.',dispatch:'Salida guardada. Ya cuenta en Sucursal.',correct:'Diferencia de entrega guardada.'};
  const view = new URLSearchParams(location.search).get('view');
  const mode = page.dataset.operation === 'branch' && view === 'adjustments' ? 'adjustments' : page.dataset.operation;
  const capture = mode === 'request' && view === 'capture';
  if(capture){
    page.querySelector('h1').textContent='Registrar llegada a Sucursal';
    document.title='Llegada a Sucursal · Chicken ChicanIA';
    page.querySelector('p a').textContent='Volver al chat';
  }
  if(mode==='adjustments') page.querySelector('h1').textContent='Historial y correcciones';
  if(mode==='branch') page.querySelector('h1').textContent='Existencias';
  let model, dirty = false, busy = false, place = 'Rastro', retry = null;
  const report = error => {status.textContent = error.message;};
  const reload = async () => {model = await api('cedis');render();};
  const changed = () => {dirty = true;};
  function arrivalChanged(hasQuantities){
    dirty = hasQuantities;
    status.textContent = dirty ? 'Llegada pendiente de guardar.' : '';
  }
  async function save(body){
    if(busy) return;
    busy = true;
    if(capture) status.textContent = 'Guardando llegada…';
    const payload = JSON.stringify(body);
    try {
      if(retry?.payload !== payload) retry = {payload,id:crypto.randomUUID()};
      model = await api('cedis',{...body,revision:model.revision,requestId:retry.id});
      retry = null;dirty = false;render();
      if(capture){
        const quantities=body.lines.map(({id,qty})=>{
          const item=model.catalog.find(row=>row.id===id);
          return qty+' '+item.unit+' · '+item.name;
        });
        status.textContent='Llegada guardada en Sucursal · '+model.day+' · '+quantities.join(' / ');
      } else status.textContent=body.action==='count'?messages.count+' '+place+' · '+model.day:messages[body.action];
    } catch(error) {
      if(capture && error.status === 409){
        const latest = await api('cedis').catch(()=>null);
        if(latest?.day === model.day) model = latest;
      }
      if(capture){
        status.textContent = 'No se confirmó el guardado. ' + error.message;
        status.scrollIntoView({block:'nearest'});
      } else report(error);
    }
    finally {busy = false;}
  }
  function adjustmentForm(item,before,unit,orderId,action){
    const form = el('form');
    const {label,input} = inputRow(item,'Cantidad guardada: '+before+' '+unit,before,'Cantidad correcta');
    input.required = true;
    const reason = el('label','Motivo del ajuste');
    const note = el('textarea');
    note.maxLength=1000;note.required=true;
    reason.append(note);
    const preview = el('p');
    preview.setAttribute('aria-live','polite');
    form.oninput = () => {
      changed();
      preview.textContent = input.validity.valid ? before+' → '+input.valueAsNumber+' '+unit : '';
    };
    const button = el('button','Confirmar corrección');
    form.append(label,reason,preview,button);
    form.onsubmit = async event => {
      event.preventDefault();
      button.disabled=true;
      try {
        await save({action,orderId,lines:[{id:item.id,qty:input.valueAsNumber}],note:note.value});
      } finally {button.disabled=false;}
    };
    return form;
  }
  function renderAdjustments(){
    host.append(el('p','Corrige una cantidad guardada entre el '+model.weekStart+' y el '+model.day+'.'));
    const orders = model.orders.filter(order=>order.actual && order.movementDate>=model.weekStart && order.movementDate<=model.day);
    if(!orders.length) host.append(el('p','Esta semana no hay entregas ni recepciones guardadas para corregir.'));
    for(const order of orders){
      const panel = el('details');
      panel.append(el('summary',order.movementDate+' · '+(order.type==='purchase'?'Recepción de proveedor':'Salida a Sucursal')+' · '+order.movedBy));
      for(const item of model.catalog.filter(item=>Object.hasOwn(order.actual,item.id))){
        const before = order.actual[item.id];
        const unit = order.originalUnits?.[item.id] || item.unit;
        if(order.originalUnits?.[item.id]){
          panel.append(el('p',item.name+' · '+before+' '+unit+' (unidad anterior)'));
          continue;
        }
        panel.append(adjustmentForm(item,before,unit,order.id,'amend-quantity'));
      }
      host.append(panel);
    }
    host.append(el('h2','Conteos físicos en CEDIS'));
    if(!model.counts.length)host.append(el('p','Los conteos anteriores que dejaron solo un saldo no tienen un registro individual para corregir.'));
    for(const count of model.counts){
      const item=model.catalog.find(item=>item.id===count.id);
      if(!item || item.unit!==count.unit)continue;
      const panel=el('details');
      panel.append(el('summary',count.date+' · '+item.name+' · '+count.actor),
        adjustmentForm(item,count.qty,count.unit,count.captureId,'amend-count'));
      host.append(panel);
    }
    host.append(el('h2','Historial de correcciones'));
    if(!model.adjustments.length)host.append(el('p','Esta semana todavía no tiene correcciones.'));
    for(const entry of model.adjustments){
      const name=model.catalog.find(item=>item.id===entry.id)?.name || entry.id;
      const at=new Date(entry.at).toLocaleString('es-MX',{timeZone:'America/Mexico_City'});
      host.append(el('p',entry.date+' · '+name+' · '+entry.before+' → '+entry.after+' '+entry.unit+' · '+entry.actor+' · '+at+' · '+entry.note));
    }
  }
  function render(){
    host.replaceChildren();
    if(mode === 'adjustments'){
      renderAdjustments();
    } else if(mode === 'branch'){
      for(const group of ['Proteínas','Vegetales']){
        const section = el('section');
        section.append(el('h2',group));
        for(const item of model.branch.filter(item=>item.branch===group)){
          const balance = item.balance == null ? 'Sin dato' : item.balance + ' ' + item.unit;
          const inCedis = model.cedis[item.id] == null ? 'Sin dato' : model.cedis[item.id] + ' ' + item.unit;
          const arrived = item.arrivals.filter(arrival=>arrival.date===model.day).reduce((total,arrival)=>total+arrival.qty,0);
          const quantity = new Intl.NumberFormat('es-MX',{maximumFractionDigits:3}).format(arrived);
          section.append(el('h3',item.name),el('p','CEDIS: '+inCedis+' · Sucursal: '+balance+' · Llegó hoy a Sucursal: '+quantity+' '+item.unit));
        }
        host.append(section);
      }
    } else if(mode === 'count'){
      const menu = el('menu');
      for(const area of ['Rastro','Almacén']){
        const button = el('button',area);
        button.setAttribute('aria-pressed',String(place===area));
        button.onclick = () => {
          if(place===area || busy || dirty&&!confirm('¿Cambiar de área y descartar este conteo sin guardar?')) return;
          dirty=false;place=area;render();
        };
        menu.append(button);
      }
      const hint = item => [
        model.cedis[item.id] == null ? 'Existencia pendiente' : 'Hay ' + model.cedis[item.id],
        model.counted[item.id] === model.day ? 'Contado hoy' : 'Pendiente de contar',
        model.receivedPending[item.id] ? 'Disponible de recepciones registradas: ' + model.receivedPending[item.id] : ''
      ].filter(Boolean).join(' · ');
      host.append(menu,el('p','Anota lo que hay físicamente en CEDIS. Vacío queda pendiente y 0 indica que no hay.'),
        lineForm(model.catalog.filter(item=>item.place===place),{label:'Guardar conteo en CEDIS',hint,changed,save:lines=>save({action:'count',lines})}));
    } else if(capture){
      const proteins = model.orderCatalog.filter(item=>item.unit==='pollos');
      const vegetables = model.branch.filter(item=>item.branch==='Vegetales');
      const items = [...proteins,...vegetables];
      const totals = new Map(model.branch.map(item=>[item.id,item.arrivals.filter(arrival=>arrival.date===model.day)
        .reduce((total,arrival)=>total+arrival.qty,0)]));
      const format = new Intl.NumberFormat('es-MX',{maximumFractionDigits:3});
      host.append(
        el('p','Captura los pollos y abre Vegetales (kg) para anotar el pedido recibido. El pollo se descuenta de Rastro salvo que marques que el conteo de hoy ya lo descontó. Los vegetales se guardan en el historial sin cambiar existencias de CEDIS.'),
        lineForm(items,{label:'Guardar llegada',arrival:true,changed:arrivalChanged,
          onEmpty:()=>{status.textContent='Escribe la cantidad de pollos o de vegetales que llegó.';},
          hint:item=>{
            if(item.branch==='Vegetales') return '';
            const available = model.cedis[item.id] ?? model.receivedPending[item.id];
            return available == null ? 'CEDIS sin existencia registrada' : 'Disponible en CEDIS al abrir: '+format.format(available);
          },
          save:(lines,distribution,note,afterCount)=>save({action:'request-delivered',lines,...(afterCount?{afterCount}:{})})}),
        el('h2','Guardado hoy en Sucursal'),
        ...items.filter(item=>item.unit==='pollos'||totals.get(item.id)).map(item=>el('p',(item.label||item.name)+' · '+format.format(totals.get(item.id) || 0)+' '+item.unit))
      );
    } else {
      const editor = el('details');
      editor.append(el('summary','Capturar pedido a CEDIS'),
        lineForm(model.orderCatalog,{label:'Guardar pedido como recibido en Sucursal',changed,allocation:true,save:(lines,allocation,note)=>save({action:'request-delivered',lines,allocation,note})}));
      host.append(editor,el('h2','Pedidos a CEDIS'));
      const requests = model.orders.filter(order=>order.type==='request');
      const orderItems = [...model.orderCatalog,...model.catalog.filter(item=>!model.orderCatalog.some(row=>row.id===item.id))];
      requests.forEach((order,index)=>host.append(orderPanel(order,orderItems,save,changed,requests.length-index)));
    }
  }
  document.addEventListener('DOMContentLoaded',() => {
    if(capture){
      document.addEventListener('click',event=>{
        const link = event.target.closest('a[href]');
        if(!link || link.href===location.href || (!dirty && !busy)) return;
        event.preventDefault();
        if(!busy && confirm('Hay una llegada sin guardar. ¿Quieres descartarla y salir?')){
          dirty=false;
          location.assign(link.href);
          return;
        }
        status.textContent = busy ? 'Espera a que termine el guardado.' : 'Guarda la llegada antes de salir.';
        status.scrollIntoView({block:'nearest'});
      },true);
    } else {
      AreaNavigation.guardChanges({hasChanges:()=>dirty,isSaving:()=>busy,discard:()=>{dirty=false;}});
    }
    window.addEventListener('beforeunload',event => {if(dirty||busy){event.preventDefault();event.returnValue='';}});
    reload().catch(error=>error.status===401?login(host,reload,report):report(error));
  });
})();
