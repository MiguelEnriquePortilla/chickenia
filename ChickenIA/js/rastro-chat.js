'use strict';
const $=id=>document.getElementById(id);
const menu=['Inicio','Operación','Asistencias','Pedido a Rastro','Inventario CEDIS','Inventario Sucursal'];
const chats=new Map();
const sectionName=name=>name==='Pedido a Rastro'?'Pedido a CEDIS':name;
let section=new URLSearchParams(location.search).get('apartado')==='rastro'?'Pedido a Rastro':'Inicio',user,model,draft,target,busy=false,clarification='',retry;
const displayName=()=>user.name.toLocaleLowerCase('es-MX').replace(/\b\p{L}/gu,letter=>letter.toLocaleUpperCase('es-MX'));
const historyKey=()=> 'chickenia-rastro-conversations:'+user.id;
function el(tag,text,cls){
  const element=document.createElement(tag);
  if(text!=null)element.textContent=text;
  if(cls)element.className=cls;
  return element;
}
function button(text,action,primary=false){
  const element=el('button',text,primary?'chat-primary':null);
  element.type='button';element.onclick=action;
  return element;
}
async function api(url,body){
  const response=await fetch(url,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json();
  if(!response.ok)throw Object.assign(Error(data.error),{status:response.status});
  return data;
}
const inventory=(action,body)=>api('/api/inventory?action='+action,body);
const chat=()=>{
  if(!chats.has(section))chats.set(section,{messages:[],products:[]});
  return chats.get(section);
};
function say(text,kind='assistant'){
  chat().messages.push({text,kind});
  try{sessionStorage.setItem(historyKey(),JSON.stringify(Object.fromEntries(chats)));}catch{}
}
function adoptSection(next,text){
  if(section===next)return;
  const messages=chat().messages;
  if(messages.at(-1)?.kind==='user')messages.pop();
  section=next;
  say(text,'user');
}
const product=id=>model.catalog.find(item=>item.id===id);
const amount=(id,qty)=>qty+' '+product(id).unit;
const orders=()=>model.orders.filter(order=>order.type==='request').slice().reverse();
const pending=()=>Boolean(draft||$('message').value.trim());
function switchTo(next){
  if(section===next||busy)return;
  if(pending()){target=next;$('leaving').showModal();return;}
  section=next;render();
}
for(const item of menu)$('chat-nav').append(button(sectionName(item),()=>switchTo(item)));
$('stay').onclick=()=>$('leaving').close();
$('discard').onclick=()=>{
  draft=null;retry=null;clarification='';$('message').value='';
  $('leaving').close();section=target;render();
};
function login(){
  const host=$('chat');
  $('chat-nav').hidden=true;
  host.replaceChildren(el('h1','Entra a ChickenIA'),el('p','Selecciona tu nombre para abrir el chat.'));
  const select=el('select');
  select.setAttribute('aria-label','Selecciona tu nombre');
  host.append(select,button('Continuar',async()=>{
    try{
      ({user}=await inventory('login',{username:select.value}));
      await load();
    }catch(error){host.append(el('p',error.message,'warn'));}
  },true));
  inventory('people').then(({people})=>{
    for(const person of people)select.append(new Option(person.name,person.id,person.id==='ana',person.id==='ana'));
  }).catch(error=>host.append(el('p',error.message,'warn')));
}
async function load(){
  model=await inventory('cedis');
  $('compose').hidden=false;
  $('chat-nav').hidden=false;
  $('chat-greeting').textContent='Hola, '+displayName();
  $('chat-greeting').hidden=false;
  try{for(const [name,value] of Object.entries(JSON.parse(sessionStorage.getItem(historyKey())||'{}')))chats.set(name,value);}catch{}
  render();
}

const periods=[['today','Hoy'],['three','Últimos 3 días'],['week','Esta semana']];
const stockOptions={
  'Inventario CEDIS':[['Proteínas en CEDIS','cedis','protein'],['Ver Almacén','cedis','store']],
  'Inventario Sucursal':[['Proteínas en Sucursal','sucursal','protein'],['Vegetales en Sucursal','sucursal','vegetable']]
};
const prompts={
  Inicio:'Escribe lo que necesitas…',
  'Operación':'Pregunta por la operación de hoy…',
  Asistencias:'Pregunta por las checadas…',
  'Pedido a Rastro':'Escribe qué llegó de CEDIS y cuánto…',
  'Inventario CEDIS':'Consulta existencias o escribe lo que contaste en Almacén…',
  'Inventario Sucursal':'Pregunta qué llegó o cuánto queda en Sucursal…'
};
const proteins=['MERPOL:0','MERPOL:1'];
function resultsIds(group){
  if(group==='protein')return proteins;
  if(group==='store')return model.catalog.filter(item=>item.place==='Almacén').map(item=>item.id);
  return model.branch.filter(item=>item.branch==='Vegetales').map(item=>item.id);
}
async function quick(action){
  if(busy)return;
  busy=true;render();
  try{model=await inventory('cedis');await action();}
  catch(error){say(error.message);}
  finally{busy=false;render();}
}
const formatDate=date=>new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
function showStock(scope,ids,title){
  chat().products=ids.slice(0,25);
  chat().lastStock={scope,ids,title};
  chat().topic='stock';
  chat().report={type:'stock',scope,ids,title};
}
async function showPeriod(report,range){
  const history=await inventory('cedis-history&range='+range);
  chat().report={...report,range,history};
}
function lastShipment(){
  const all=orders();
  const order=all.filter(order=>order.actual).sort((a,b)=>(b.movementAt||b.movementDate||b.date).localeCompare(a.movementAt||a.movementDate||a.date)).at(0);
  chat().report={type:'shipment',order,number:order?all.indexOf(order)+1:null};
}
function reportCard(report){
  const card=el('section',null,'chat-review chat-report');
  const line=(label,value)=>{const row=el('div',null,'chat-line');row.append(el('span',label),el('strong',value));card.append(row);};
  if(['arrivals','operations','operations-pending','attendance-pending'].includes(report.type)){
    const {rows,day}=report.data;
    const titles={arrivals:'Quién llegó hoy',operations:'Cómo vamos hoy',
      'operations-pending':'Qué falta por hacer','attendance-pending':'Checadas pendientes'};
    const empty={arrivals:'Todavía no hay entradas registradas.',operations:'No hay actividades programadas.',
      'operations-pending':'No hay actividades pendientes.', 'attendance-pending':'El equipo tiene sus checadas completas.'};
    card.append(el('h2',titles[report.type]+' · '+formatDate(day)));
    if(!rows.length)card.append(el('p',empty[report.type]));
    const time=new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',hour:'numeric',minute:'2-digit'});
    const missing={both:'Sin entrada ni salida',entry:'Sin entrada registrada',exit:'Sin salida registrada'};
    for(const row of rows){
      if(report.type==='arrivals')line(row.name,time.format(new Date(row.entrada)));
      else if(report.type==='attendance-pending')line(row.name,missing[row.missing]);
      else if(report.type==='operations-pending')line(row.area+' · '+row.name,row.recorded?'Pendiente':'Sin marcar');
      else line(row.name,row.done+(row.done===1?' hecha':' hechas')+' · '+row.pending+(row.pending===1?' pendiente':' pendientes'));
    }
  }else if(report.type==='received'){
    card.append(el('h2','Pedidos recibidos'));
    const all=orders();
    const received=all.filter(order=>order.actual).slice(-12).reverse();
    if(!received.length)card.append(el('p','Todavía no hay pedidos recibidos.'));
    for(const order of received){
      const details=el('details');
      details.append(el('summary','Pedido #'+(all.indexOf(order)+1)+' · '+formatDate(order.movementDate||order.date)));
      for(const [id,qty] of Object.entries(order.actual)){
        if(product(id))details.append(el('p',product(id).name+': '+amount(id,qty)));
      }
      card.append(details);
    }
  }else if(report.type==='pending'){
    card.append(el('h2','Pedidos sin salida'));
    const list=orders().filter(order=>!order.actual);
    if(!list.length)card.append(el('p','No hay pedidos sin salida.'));
    for(const order of list){
      const number=orders().indexOf(order)+1;
      line('Pedido #'+number+' · '+formatDate(order.date),'Registro anterior');
    }
  }else if(report.type==='shipment'&&!report.history){
    card.append(el('h2','Última salida'));
    const {order,number}=report;
    if(!order)card.append(el('p','Todavía no hay salidas guardadas en Pedido a Rastro.'));
    else {
      const time=order.movementAt?new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',hour:'numeric',minute:'2-digit'}).format(new Date(order.movementAt)):'';
      card.append(el('p',['Pedido #'+number,formatDate(order.movementDate||order.date),time,order.movedBy].filter(Boolean).join(' · ')));
      for(const [id,qty] of Object.entries(order.actual))if(product(id))line(product(id).name,amount(id,qty));
    }
  }else if(report.history){
    const {from,to,rows}=report.history;
    card.append(el('h2',(report.title||'Salidas a Sucursal')+' · '+formatDate(from)+(from!==to?' al '+formatDate(to):'')));
    const labels={'cedis-in':'entró a CEDIS','cedis-out':'salió de CEDIS','cedis-adjust':'ajuste en CEDIS','branch-in':'llegó a Sucursal','branch-used':'se usó en Sucursal'};
    const byDirection={incoming:['cedis-in','branch-in'],outgoing:['cedis-out'],used:['branch-used']};
    const visible=rows.filter(row=>!byDirection[report.movements]||byDirection[report.movements].includes(row.kind))
      .filter(row=>product(row.id)&&(report.type==='shipment'?row.kind==='cedis-out':
      report.ids.includes(row.id)&&(report.scope==='both'||row.kind.startsWith(report.scope==='sucursal'?'branch-':'cedis-'))));
    if(!visible.length)card.append(el('p','Sin movimientos registrados en este periodo.'));
    for(const row of visible)line(formatDate(row.date)+' · '+product(row.id).name+' · '+labels[row.kind],amount(row.id,row.qty));
  }else{
    card.append(el('h2',report.title));
    for(const id of report.ids)if(product(id))line(product(id).name,stockValue(id,report.scope));

  }
  if(!['pending','received','arrivals','operations','operations-pending','attendance-pending'].includes(report.type)){
    const controls=el('div',null,'chat-periods');
    controls.setAttribute('aria-label','Periodo de movimientos');
    for(const [range,label] of periods){
      const b=button(label,()=>quick(()=>showPeriod(report,range)));
      b.setAttribute('aria-pressed',String(report.range===range));b.disabled=busy;controls.append(b);
    }
    card.append(controls);
  }
  return card;
}
async function showInventorySummary(group){
  const history=await inventory('cedis-history&range=today');
  const items=model.branch.filter(item=>item.branch===group);
  const quantity=(value,item)=>value==null?'Sin dato':value+' '+item.unit;
  const rows=items.map(item=>{
    const shipments=history.rows.filter(row=>row.id===item.id && row.kind==='cedis-out');
    const sent=shipments.reduce((sum,row)=>sum+row.qty,0);
    const arrived=item.arrivals.filter(row=>row.date===model.day).reduce((sum,row)=>sum+row.qty,0);
    return [item.name,
      'CEDIS ayer: '+quantity(model.cedisYesterday[item.id],item),
      'Salió hoy: '+quantity(Math.round(sent*1000)/1000,item),
      'CEDIS ahora: '+quantity(model.cedis[item.id],item),
      'Llegó hoy a Sucursal: '+quantity(Math.round(arrived*1000)/1000,item),
      'Esperado en Sucursal: '+quantity(item.balance,item)].join(' · ');
  });
  say(group+' · '+model.day+'\n'+rows.join('\n'));
}

const inventoryHelp = [
    ['¿Cómo capturo proteínas?','Abre Capturar proteínas, escribe cuántos pollos llegaron de CEDIS y pulsa Guardar llegada. El total de hoy aparece en esa misma pantalla.'],
    ['¿Dónde veo qué salió hoy?','Pulsa Ver existencias. El chat muestra lo que salió de CEDIS, lo que llegó a Sucursal y lo que debería quedar según los movimientos registrados.'],
    ['¿Cómo corrijo una cantidad?','Abre Revisar y ajustar la semana. Busca la entrega o recepción en el día correcto, escribe la cantidad correcta y el motivo, y confirma. El historial conserva ambas cantidades.'],
    ['¿Por qué dice Sin dato?','El saldo requiere un punto de partida y movimientos en una unidad compatible. Revisa el conteo o los movimientos antes de tomar ese saldo como confirmado.']
  ];
function inventoryActions(){
  const controls=el('nav',null,'chat-suggestions');
  controls.setAttribute('aria-label','Inventario y ayuda');
  const capture=el('a','Capturar proteínas','chat-report-link');
  capture.href='/rastro.html?view=capture';
  const adjustments=el('a','Revisar y ajustar la semana','chat-report-link');
  adjustments.href='/proteinas.html?view=adjustments';
  const stock=button('Ver existencias',()=>quick(()=>showInventorySummary('Proteínas')));
  const vegetables=button('Ver vegetales',()=>quick(()=>showInventorySummary('Vegetales')));
  stock.disabled=vegetables.disabled=busy;
  const help=el('details');
  help.append(el('summary','Pregúntale a ChickenIA'));
  for(const [question,answer] of inventoryHelp){
    const topic=el('details');
    topic.append(el('summary',question),el('p',answer));
    help.append(topic);
  }
  controls.append(capture,stock,adjustments,vegetables,help);
  return controls;
}

function quickButtons(){
  const controls=el('nav',null,'chat-suggestions');
  controls.setAttribute('aria-label','Acciones rápidas');
  const printLink=(label,path)=>{
    const link=el('a',label,'chat-report-link');
    link.href=path;link.target='_blank';link.rel='noopener';
    return link;
  };
  const report=(label,view)=>button(label,()=>quick(async()=>{
    chat().report={type:view,data:await inventory('chat-quick-report&view='+view)};
  }));
  if(section==='Operación')controls.append(report('Cómo vamos hoy','operations'),report('Qué falta por hacer','operations-pending'));
  if(section==='Asistencias')controls.append(
    report('Quién llegó hoy','arrivals'),
    report('Checadas pendientes','attendance-pending'),
    printLink('Imprime la asistencia de la semana','/asistencias.html?view=team&print=team&date='+model.day),
    printLink('Imprime la nómina','/nomina.html?view=team&print=team&week='+model.day)
  );
  for(const [label,scope,group] of stockOptions[section]||[]){
    controls.append(button(label,()=>quick(()=>showStock(scope,resultsIds(group),label))));
  }
  if(section==='Inventario CEDIS'){
    controls.append(button('Contar Almacén',()=>{
      const field=$('message');
      if(!field.value.trim())field.value='En Almacén conté ';
      field.focus();
    }));
  }
  if(section==='Pedido a Rastro'){
    controls.append(button('Capturar pedido',()=>{
      const field=$('message');
      if(!field.value.trim())field.value='De CEDIS llegaron ';
      field.focus();
    }),button('Pedidos recibidos',()=>quick(()=>{
      chat().report={type:'received'};
    })));
  }
  for(const b of controls.children)b.disabled=busy;
  return controls;
}
function stockValue(id,scope){
  const item=product(id), cedis=model.cedis[id], branch=model.branch.find(value=>value.id===id);
  const source=item.place+': '+(cedis==null?'existencia pendiente':amount(id,cedis));
  const destination=branch?
    'Llegó: '+amount(id,branch.incoming)+' · '+(branch.used==null?'Consumo sin registrar':'Se usó: '+amount(id,branch.used))+
      ' · '+(branch.balance==null?(branch.used==null?'Existencia pendiente':'Saldo inicial pendiente'):'Queda: '+amount(id,branch.balance)):
    'Sin saldo de Sucursal';
  return scope==='both'?source+' | Sucursal: '+destination:scope==='sucursal'?destination:source;
}
async function explainStock(current=chat().lastStock){
  if(!current){say('Dime qué producto y qué inventario quieres revisar.');return;}
  const ids=current.ids.slice(0,12);
  const recent=await inventory('cedis-history&range=three');
  say(ids.map(id=>{
    const item=product(id), branch=model.branch.find(row=>row.id===id);
    const text=[item.name];
    if(current.scope!=='sucursal'){
      const last=model.counted[id];
      text.push(stockValue(id,'cedis')+'. '+(last?'Último conteo guardado el '+formatDate(last)+'.':'La cifra de CEDIS usa la existencia registrada en ChickenIA.'));
      const movements=recent.rows.filter(row=>row.id===id&&row.kind.startsWith('cedis-'));
      if(movements.length)text.push('Movimientos de los últimos 3 días: '+movements.map(row=>formatDate(row.date)+' '+({'cedis-in':'entrada','cedis-out':'salida','cedis-adjust':'ajuste'}[row.kind])+' '+amount(id,row.qty)).join('; ')+'.');
    }
    if(current.scope!=='cedis'&&branch){
      const arrivals=branch.arrivals||[];
      const usage=branch.usage||[];
      if(arrivals.length)text.push('Entradas a Sucursal: '+arrivals.map(row=>amount(id,row.qty)+' el '+formatDate(row.date)+' ('+(row.source==='history'?'historial de envíos':'Pedido a Rastro')+')').join(' + ')+' = '+amount(id,branch.incoming)+'.');
      if(usage.length)text.push('Producción Diaria: '+usage.map(row=>amount(id,row.qty)+' el '+formatDate(row.date)).join(' + ')+' = '+amount(id,branch.used)+' usados.');
      text.push(branch.opening==null?'El saldo queda pendiente porque falta la cantidad que había en Sucursal al iniciar el periodo.':
        branch.used==null?'El saldo queda pendiente porque falta registrar el consumo.':
        'Saldo inicial '+amount(id,branch.opening)+' + entradas '+amount(id,branch.incoming)+' − consumo '+amount(id,branch.used)+' = '+amount(id,branch.balance)+'.');
    }
    return text.join('\n');
  }).join('\n\n'));
}

function render(){
  if(!user||!model)return;
  $('context').textContent=sectionName(section);
  for(const b of $('chat-nav').children){
    if(b.textContent===sectionName(section))b.setAttribute('aria-current','page');
    else b.removeAttribute('aria-current');
  }
  const host=$('chat');
  host.replaceChildren();
  const heading=section==='Inicio'?'¿Qué hacemos hoy?':sectionName(section);
  if(!chat().messages.length)host.append(el('h1',heading),el('p',section==='Inicio'?'Elige un apartado o escribe directamente lo que necesitas.':prompts[section].replace(/…$/,'.'),'chat-intro'));
  for(const entry of chat().messages)host.append(el('div',entry.text,'chat-message '+entry.kind));
  $('message').placeholder=draft?'Escribe una corrección o consulta…':prompts[section];
  const suggestions=$('composer-suggestions');
  const actions=$('inventory-actions');
  actions.hidden=section!=='Inicio'||Boolean(draft);
  actions.replaceChildren(...(actions.hidden?[]:[inventoryActions()]));
  suggestions.hidden=Boolean(draft)||section==='Inicio';
  suggestions.replaceChildren(...(suggestions.hidden?[]:[quickButtons()]));
  if(chat().report)host.append(reportCard(chat().report));
  if(draft){
    const card=el('section',null,'chat-review');
    card.append(el('h2',draft.action==='count'?'Conteo de Almacén':'Pedido a CEDIS · '+model.day));
    if(draft.allocation)card.append(el('p','Reparto solicitado: Horno '+draft.allocation.oven+' · Rosticero '+draft.allocation.rotisserie));
    for(const [id,qty] of Object.entries(draft.lines)){
      const row=el('div',null,'chat-line');
      row.append(el('span',product(id).name),el('strong',amount(id,qty)));card.append(row);
    }
    if(draft.note)card.append(el('p',draft.note));
    const confirmButton=button(draft.action==='count'?'Guardar conteo':'Guardar pedido a CEDIS',save,true);
    confirmButton.disabled=Boolean(clarification)||busy;
    card.append(confirmButton);host.append(card);
  }
  if(busy)host.append(el('p','Leyendo el mensaje…','chat-intro'));
  for(const control of $('compose').querySelectorAll('button, textarea'))control.disabled=busy;
  $('scroll').scrollTop=$('scroll').scrollHeight;
}
function validLines(lines){
  return Object.fromEntries((lines||[]).filter(({id,qty})=>
    model.orderCatalog.some(item=>item.id===id))
    .filter(({qty})=>Number.isFinite(qty)&&qty>=0&&qty<=1000000)
    .map(({id,qty})=>[id,Math.round(qty*1000)/1000]));
}
async function stock(result){
  const ids=(result.products||[]).filter(id=>product(id));
  if(!ids.length){say(result.question||'¿Qué producto quieres consultar?');return;}
  showStock(result.scope,ids,ids.length===1?product(ids[0]).name:'Existencias');
  if(result.range&&result.range!=='current'){
    chat().report.movements=result.movements;
    await showPeriod(chat().report,result.range);
  }
}

function inspectOrders(result){
  const all=orders();
  const pendingOrders=all.filter(order=>!order.actual);
  const number=order=>all.indexOf(order)+1;
  const view=result.orderView;
  chat().topic='orders';
  chat().report=null;
  if(view==='pending'){
    chat().report={type:'pending'};
    if(pendingOrders.length===1)chat().lastOrder=number(pendingOrders[0]);
    return;
  }
  if(view==='latest'){
    lastShipment();
    chat().lastOrder=chat().report.number;
    return;
  }
  if(view==='all'&&!result.order){
    let list=all.slice().reverse();
    if(result.range==='today')list=list.filter(order=>order.date===model.day);
    else if(['three','week','yesterday'].includes(result.range)){
      const date=new Date(model.day+'T12:00:00Z');
      const offset=result.range==='three'?2:result.range==='yesterday'?1:(date.getUTCDay()+6)%7;
      date.setUTCDate(date.getUTCDate()-offset);
      const from=date.toISOString().slice(0,10);
      list=list.filter(order=>result.range==='yesterday'?order.date===from:order.date>=from);
    }
    say(list.length?list.slice(0,12).map(order=>'Pedido #'+number(order)+' · '+formatDate(order.date)+' · '+(order.actual?'Salida guardada':'Falta guardar la salida')).join('\n'):'No hay pedidos en ese periodo.');
    if(list.length===1)chat().lastOrder=number(list[0]);
    return;
  }
  const chosen=result.order?all[result.order-1]:pendingOrders.length===1?pendingOrders[0]:all.length===1?all[0]:null;
  if(!chosen){
    say(result.order?'No encontré el pedido #'+result.order+'.':all.length?'¿Qué pedido quieres revisar? '+all.slice(-5).map(order=>'#'+number(order)).join(', ')+'.':'Todavía no hay pedidos guardados.');
    return;
  }
  chat().lastOrder=number(chosen);
  if(view==='availability'&&!chosen.actual){
    const blocked=Object.entries(chosen.lines).filter(([id,qty])=>(model.cedis[id]??model.receivedPending[id]??0)<qty);
    say('Pedido #'+number(chosen)+'. '+(blocked.length?blocked.map(([id,qty])=>{
      const available=model.cedis[id]??model.receivedPending[id];
      return product(id).name+': se pidió '+amount(id,qty)+' y '+(available==null?'la existencia está pendiente':'hay '+amount(id,available))+'.';
    }).join('\n'):'Hay existencia registrada para todas las cantidades pedidas.'));
    return;
  }
  const status=chosen.actual?'Salida guardada'+(chosen.movedBy?' por '+chosen.movedBy:'')+' el '+formatDate(chosen.movementDate||chosen.date)+'.':'Pedido guardado el '+formatDate(chosen.date)+'. Falta guardar la salida.';
  say('Pedido #'+number(chosen)+' · '+status+'\n'+Object.entries(chosen.lines).filter(([id])=>product(id)).map(([id,qty])=>
    product(id).name+': pedido '+amount(id,qty)+(chosen.actual?' · salió '+amount(id,chosen.actual[id]||0):'')).join('\n'));
}

async function prepare(result,text){
  if(result.intent==='count'){
    if(section==='Inicio'&&!draft)adoptSection('Inventario CEDIS',text);
    const items=Object.fromEntries(result.lines
      .filter(({id,qty})=>product(id)?.place==='Almacén'&&Number.isFinite(qty)&&qty>=0)
      .map(({id,qty})=>[id,qty]));
    if(!Object.keys(items).length&&draft?.action!=='count'){
      say(result.question||'Dime qué productos contaste en Almacén y cuánto hay.');return;
    }
    if(draft&&draft.action!=='count'){say('Termina la captura pendiente antes de abrir un conteo.');return;}
    draft??={action:'count',lines:{}};
    Object.assign(draft.lines,items);
    clarification=result.question||(!Object.keys(items).length?clarification:'');
    chat().report=null;
    say(clarification||'Revisa las cantidades que contaste.');
    return;
  }
  if(result.intent==='stock'){await stock(result);return;}
  if(result.intent==='orders'){inspectOrders(result);return;}
  if(result.intent==='explain'){
    const ids=result.products.filter(id=>product(id));
    await explainStock(ids.length?{ids,scope:result.scope}:undefined);
    return;
  }
  if(result.intent==='dispatch'&&!result.lines.length&&!draft){say('Para capturar el Pedido a CEDIS, dime los productos y cantidades que llegaron.');return;}
  if(result.intent==='clarify'){say(result.question||'¿Qué necesitas hacer con este pedido?');return;}
  if(section==='Inicio')adoptSection('Pedido a Rastro',text);
  const action='request';
  const lines=validLines(result.lines);
  const wasClarifying=clarification;
  if(!draft||draft.action!==action){
    retry=null;
    if(!Object.keys(lines).length){say(result.question||'Dime los productos y las cantidades que llegaron.');return;}
    if(draft?.action==='count'){say('Termina el conteo abierto antes de capturar un pedido.');return;}
    draft={action,lines:{},note:''};
  }
  for(const [id,qty] of Object.entries(lines)){
    if(action==='request'||Object.hasOwn(draft.lines,id))draft.lines[id]=qty;
  }
  if(action==='request'&&(result.oven!=null||result.rotisserie!=null)){
    draft.allocation={oven:result.oven??draft.allocation?.oven??0,rotisserie:result.rotisserie??draft.allocation?.rotisserie??0};
  }
  if(result.note&&action==='request')draft.note=result.note;
  clarification=result.question||(wasClarifying&&!Object.keys(lines).length?wasClarifying:'');
  say(clarification||(action==='request'?'Revisa las cantidades.':'Preparé la salida con el pedido guardado. Corrige las diferencias o confirma.'));
}
async function save(){
  if(!draft||clarification||busy)return;
  busy=true;render();
  const {action,note,allocation}=draft;
  const body={action:action==='request'?'request-delivered':action,lines:Object.entries(draft.lines).filter(([,qty])=>action!=='request'||qty>0).map(([id,qty])=>({id,qty}))};
  if(action==='request'){body.note=note;body.allocation=allocation;}
  const signature=JSON.stringify(body);
  if(retry?.signature!==signature)retry={signature,id:crypto.randomUUID()};
  try{
    model=await inventory('cedis',{...body,revision:model.revision,requestId:retry.id});
    if(action==='count'){
      say('Conteo de Almacén guardado por '+user.name+'.\n'+body.lines.map(({id,qty})=>product(id).name+': '+amount(id,qty)).join('\n'));
      draft=null;retry=null;clarification='';
      return;
    }
    const latest=orders().length;
    chat().lastOrder=latest;chat().topic='orders';
    say('Pedido #'+latest+' recibido en Sucursal. Guardado por '+user.name+'.\n\n'+body.lines.map(({id,qty})=>
      product(id).name+': '+amount(id,qty)+' · CEDIS: '+(model.cedis[id]==null?'existencia pendiente':amount(id,model.cedis[id]))).join('\n'));
    draft=null;retry=null;
  }catch(error){
    say(error.message+' La captura sigue pendiente.');
    if(error.status===409)model=await inventory('cedis').catch(()=>model);
  }finally{busy=false;render();}
}
$('compose').onsubmit=async event=>{
  event.preventDefault();
  const text=$('message').value.trim();
  if(busy||!text)return;
  if(draft&&/^(sí|si|confirmo|guarda|guardar)[.! ]*$/i.test(text)&&!clarification){
    $('message').value='';say(text,'user');await save();return;
  }
  $('message').value='';say(text,'user');
  busy=true;render();
  try{
    model=await inventory('cedis');
    const normalized=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if(!draft && /(?:^|[¿ ])(?:como|donde) (?:puedo |se )?/.test(normalized)){
      const topic = /\b(?:corrij|correg|ajust)\w*/.test(normalized) ? 2
        : /\b(?:captur|registr|anot)\w*/.test(normalized) && /proteina|pollo|conteo/.test(normalized) ? 0
        : /existencias|inventario|cuanto salio/.test(normalized) ? 1 : -1;
      if(topic>=0){say(inventoryHelp[topic][1]);return;}
    }
    if(/\b(?:ultima salida|ultimo envio)\b/.test(normalized)&&/\b(?:quien|cuando|hora|cual|muestra|ver)\b/.test(normalized)){
      inspectOrders({orderView:'latest'});return;
    }
    if(chat().topic==='stock'&&chat().lastStock&&/^[\s¿]*(?:y )?(?:por ?que|de donde|como (?:lo |se )?calcula|como sale)(?: me da| sale| viene)?(?: ese numero| esa cifra| ese total)?[?!.\s]*$/.test(normalized)){
      await explainStock();return;
    }
    if(/quien(?:es)? (?:ya )?(?:llego|llegaron) (?:hoy)?/.test(normalized+' ')||
       /como vamos hoy/.test(normalized)){
      const view=/como vamos hoy/.test(normalized)?'operations':'arrivals';
      chat().report={type:view,data:await inventory('chat-quick-report&view='+view)};
      return;
    }
    const result=await inventory('rastro-chat',{
      text,
      section:['Operación','Asistencias'].includes(section)?'Inicio':section,
      draft:draft?{action:draft.action,lines:draft.lines,question:clarification,allocation:draft.allocation}:undefined,
      previousProducts:chat().products,previousScope:chat().lastStock?.scope,previousOrder:chat().lastOrder||undefined,previousTopic:chat().topic
    });
    await prepare(result,text);
  }catch(error){$('message').value=text;say(error.message);}
  finally{busy=false;render();}
};
$('message').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('compose').requestSubmit();}};
window.addEventListener('beforeunload',e=>{if(pending()||busy){e.preventDefault();e.returnValue='';}});
$('compose').hidden=true;
$('context').textContent='Inicio';
document.addEventListener('DOMContentLoaded',()=>{
  AreaNavigation.guardChanges({hasChanges:pending,isSaving:()=>busy,discard:()=>{draft=null;$('message').value='';}});
  inventory('session').then(async result=>{user=result.user;await load();}).catch(error=>{
    if(error.status===401)login();
    else $('chat').append(el('p',error.message,'warn'));
  });
});
