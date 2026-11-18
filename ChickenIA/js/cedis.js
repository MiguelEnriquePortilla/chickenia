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
    const label = el('label'), description = el('span',item.name + ' · ' + item.unit);
    label.className = 'cedis-line';
    if(hint) description.append(el('small',hint));
    const input = el('input');
    Object.assign(input,{type:'number',min:'0',max:'1000000',step:'.001',value:value ?? '',inputMode:'decimal'});
    input.setAttribute('aria-label',verb + ' · ' + item.name + ' (' + item.unit + ')');
    label.append(description,input);
    return {label,input,id:item.id};
  }
  function lineForm(items, {values = {}, label, hint = () => '', requireAll = false, changed = () => {}, save}){
    const form = el('form');
    const fields = items.map(item => inputRow(item,hint(item),values[item.id],label));
    for(const field of fields){
      field.input.required = requireAll;
      form.append(field.label);
    }
    const button = el('button',label);
    form.append(button);
    form.oninput = changed;
    form.onsubmit = async event => {
      event.preventDefault();
      const lines = fields.filter(field => field.input.value !== '').map(field => ({id:field.id,qty:field.input.valueAsNumber}));
      if(!lines.length){fields[0]?.input.focus();return;}
      button.disabled = true;
      try { await save(lines); }
      finally { button.disabled = false; }
    };
    return form;
  }
  function orderPanel(order, catalog, onSave, changed){
    const details = el('details');
    const date = order.movementDate || order.date;
    const header = [date, order.supplier, order.actual ? (order.type==='purchase'?'Recibido':'Enviado') : 'Pendiente'].filter(Boolean).join(' · ');
    details.append(el('summary',header));
    if(order.note) details.append(el('p',order.note));
    const items = catalog.filter(item => Object.hasOwn(order.lines,item.id));
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
  const messages = {count:'Conteo guardado.',request:'Pedido guardado.',dispatch:'Salida guardada. Ya cuenta en Sucursal.',correct:'Diferencia de entrega guardada.'};
  const mode = page.dataset.operation;
  let model, dirty = false, busy = false, place = 'Rastro', retry = null;
  const report = error => {status.textContent = error.message;};
  const reload = async () => {model = await api('cedis');render();};
  const changed = () => {dirty = true;};
  async function save(body){
    if(busy) return;
    busy = true;
    const payload = JSON.stringify(body);
    if(retry?.payload !== payload) retry = {payload,id:crypto.randomUUID()};
    try {
      model = await api('cedis',{...body,revision:model.revision,requestId:retry.id});
      retry = null;dirty = false;render();status.textContent = messages[body.action];
    } catch(error) {report(error);}
    finally {busy = false;}
  }
  function render(){
    host.replaceChildren();
    if(mode === 'branch'){
      for(const group of ['Proteínas','Vegetales']){
        const section = el('section');
        section.append(el('h2',group));
        for(const item of model.branch.filter(item=>item.branch===group)){
          const balance = item.balance == null ? (item.used == null ? 'Consumo sin registrar' : 'Saldo inicial pendiente') : item.balance + ' ' + item.unit;
          section.append(el('p',item.name + ' · ' + balance + ' · Llegó ' + item.incoming + ' ' + item.unit));
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
      host.append(menu,el('p','Captura lo que contaste. Vacío queda pendiente y 0 indica que no hay.'),
        lineForm(model.catalog.filter(item=>item.place===place),{label:'Guardar conteo',hint,changed,save:lines=>save({action:'count',lines})}));
    } else {
      const editor = el('details');
      editor.append(el('summary','Nuevo pedido a CEDIS'),
        lineForm(model.catalog.filter(item=>item.branch),{label:'Guardar pedido',changed,save:lines=>save({action:'request',lines})}));
      host.append(editor,el('h2','Pedidos a CEDIS'));
      for(const order of model.orders.filter(order=>order.type==='request')) host.append(orderPanel(order,model.catalog,save,changed));
    }
  }
  document.addEventListener('DOMContentLoaded',() => {
    AreaNavigation.guardChanges({hasChanges:()=>dirty,isSaving:()=>busy,discard:()=>{dirty=false;}});
    window.addEventListener('beforeunload',event => {if(dirty||busy){event.preventDefault();event.returnValue='';}});
    reload().catch(error=>error.status===401?login(host,reload,report):report(error));
  });
})();
