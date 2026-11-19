'use strict';
const $=id=>document.getElementById(id);
const menu=['Inicio','Pedido a Rastro','Inventario CEDIS','Inventario Sucursal'];
const chats=new Map();
let section=new URLSearchParams(location.search).get('apartado')==='rastro'?'Pedido a Rastro':'Inicio',user,model,draft,target,busy=false,clarification='',retry,awaitingOrder=false;
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
const pending=()=>Boolean(draft||$('message').value.trim()||awaitingOrder);
function switchTo(next){
  if(section===next||busy)return;
  if(pending()){target=next;$('leaving').showModal();return;}
  section=next;render();
}
for(const item of menu)$('chat-nav').append(button(item,()=>switchTo(item)));
$('stay').onclick=()=>$('leaving').close();
$('discard').onclick=()=>{
  draft=null;retry=null;clarification='';awaitingOrder=false;$('message').value='';
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
  try{for(const [name,value] of Object.entries(JSON.parse(sessionStorage.getItem(historyKey())||'{}')))chats.set(name,value);}catch{}
  render();
}

const periods=[['today','Hoy'],['three','Últimos 3 días'],['week','Esta semana']];
const stockOptions=[
  ['Proteínas en CEDIS','cedis','protein'],
  ['Proteínas en Sucursal','sucursal','protein'],
  ['Ver Almacén','cedis','store'],
  ['Vegetales en Sucursal','sucursal','vegetable']
];
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
function prepareOrder(order){
  const number=orders().indexOf(order)+1;
  draft={action:'dispatch',orderId:order.id,number,lines:{...order.lines},allocation:order.allocation,note:order.note};
  retry=null;clarification='';awaitingOrder=false;
  chat().report=null;
}
function reportCard(report){
  const card=el('section',null,'chat-review chat-report');
  const line=(label,value)=>{const row=el('div',null,'chat-line');row.append(el('span',label),el('strong',value));card.append(row);};
  if(report.type==='pending'){
    card.append(el('h2','Pedidos sin salida'));
    const list=orders().filter(order=>!order.actual);
    if(!list.length)card.append(el('p','No hay pedidos sin salida.'));
    for(const order of list){
      const number=orders().indexOf(order)+1;
      const row=el('div',null,'chat-line');
      row.append(el('span','Pedido #'+number+' · '+formatDate(order.date)),
        button('Preparar salida',()=>quick(()=>{
          const current=orders().find(item=>item.id===order.id);
          if(!current||current.actual){say('Ese pedido ya tiene salida.');return;}
          prepareOrder(current);
        })));
      card.append(row);
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
    const visible=rows.filter(row=>product(row.id)&&(report.type==='shipment'?row.kind==='cedis-out':
      report.ids.includes(row.id)&&(report.scope==='both'||row.kind.startsWith(report.scope==='sucursal'?'branch-':'cedis-'))));
    if(!visible.length)card.append(el('p','Sin movimientos registrados en este periodo.'));
    for(const row of visible)line(formatDate(row.date)+' · '+product(row.id).name+' · '+labels[row.kind],amount(row.id,row.qty));
  }else{
    card.append(el('h2',report.title));
    for(const id of report.ids)if(product(id))line(product(id).name,stockValue(id,report.scope));

  }
  if(report.type!=='pending'){
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
function quickButtons(){
  const controls=el('nav',null,'chat-suggestions');
  controls.setAttribute('aria-label','Acciones rápidas');
  for(const [label,scope,group] of stockOptions)controls.append(button(label,()=>quick(()=>showStock(scope,resultsIds(group),label))));
  controls.append(button('Nuevo pedido a Rastro',()=>{
    switchTo('Pedido a Rastro');
    $('message').focus();
  }),button('Pedidos sin salida',()=>quick(()=>{
    const list=orders().filter(order=>!order.actual);
    if(list.length===1)prepareOrder(list[0]);else chat().report={type:'pending'};
  })),button('Última salida',()=>quick(lastShipment)));
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
async function explainStock(){
  const current=chat().lastStock;
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
  $('context').textContent=section;
  for(const b of $('chat-nav').children){
    if(b.textContent===section)b.setAttribute('aria-current','page');
    else b.removeAttribute('aria-current');
  }
  const host=$('chat');
  host.replaceChildren();
  const heading=section==='Inicio'?'¿Qué hacemos hoy, '+user.name+'?':section;
  if(!chat().messages.length)host.append(el('h1',heading),el('p','Prepara pedidos, registra salidas y consulta existencias.','chat-intro'));
  for(const entry of chat().messages)host.append(el('div',entry.text,'chat-message '+entry.kind));
  if(!draft)host.append(quickButtons());
  if(chat().report)host.append(reportCard(chat().report));
  if(draft){
    const card=el('section',null,'chat-review');
    card.append(el('h2',draft.action==='request'?'Revisar pedido a Rastro · '+model.day:'Salida a Sucursal · Pedido #'+draft.number));
    if(draft.allocation)card.append(el('p','Reparto solicitado: Horno '+draft.allocation.oven+' · Rosticero '+draft.allocation.rotisserie));
    for(const [id,qty] of Object.entries(draft.lines)){
      const row=el('div',null,'chat-line');
      row.append(el('span',product(id).name),el('strong',amount(id,qty)));card.append(row);
    }
    if(draft.note)card.append(el('p',draft.note));
    const confirmButton=button(draft.action==='request'?'Guardar pedido':'Guardar salida',save,true);
    confirmButton.disabled=Boolean(clarification)||busy;
    card.append(confirmButton);host.append(card);
  }
  if(busy)host.append(el('p','Leyendo el mensaje…','chat-intro'));
  for(const control of $('compose').querySelectorAll('button, textarea'))control.disabled=busy;
  $('scroll').scrollTop=$('scroll').scrollHeight;
}
function validLines(lines,action){
  return Object.fromEntries((lines||[]).filter(({id,qty})=>
    model.orderCatalog.some(item=>item.id===id)||(action==='dispatch'&&draft&&Object.hasOwn(draft.lines,id)))
    .filter(({qty})=>Number.isFinite(qty)&&qty>=0&&qty<=1000000)
    .map(({id,qty})=>[id,Math.round(qty*1000)/1000]));
}
async function stock(result){
  const ids=(result.products||[]).filter(id=>product(id));
  if(!ids.length){say(result.question||'¿Qué producto quieres consultar?');return;}
  showStock(result.scope,ids,ids.length===1?product(ids[0]).name:'Existencias');
  if(result.range&&result.range!=='current')await showPeriod(chat().report,result.range);
}
async function prepare(result,text){
  if(result.intent==='stock'){await stock(result);return;}
  if(result.intent==='clarify'){say(result.question||'¿Qué necesitas hacer con este pedido?');return;}
  if(section==='Inicio')adoptSection('Pedido a Rastro',text);
  const action=result.intent==='create'?'request':'dispatch';
  const lines=validLines(result.lines,action);
  const wasClarifying=clarification;
  if(!draft||draft.action!==action){
    retry=null;
    if(action==='request'){
      if(!Object.keys(lines).length){say(result.question||'¿Qué productos y cantidades quieres pedir?');return;}
      draft={action,lines:{},note:''};
    }else{
      const all=orders();
      const notSent=all.filter(order=>!order.actual);
      const chosen=result.order ? all[result.order-1] : notSent.length===1?notSent[0]:null;
      if(!chosen){
        if(!result.order&&notSent.length>1){
          awaitingOrder=true;
          say('Hay varios pedidos pendientes. Indica el número: '+notSent.map(order=>'#'+(all.indexOf(order)+1)).join(', ')+'.');
        }else{
          awaitingOrder=false;
          const previous=!result.order&&all.at(-1);
          say(previous?.actual?'La salida del pedido #'+all.length+' ya se guardó.\n'+Object.entries(previous.actual).map(([id,qty])=>product(id).name+' · '+amount(id,qty)).join('\n'):'No encontré ese pedido pendiente.');
        }
        return;
      }
      awaitingOrder=false;
      const number=all.indexOf(chosen)+1;
      if(chosen.actual){
        say('El pedido #'+number+' ya se guardó.\n'+Object.entries(chosen.actual).map(([id,qty])=>product(id).name+' · '+amount(id,qty)).join('\n'));
        return;
      }
      draft={action,orderId:chosen.id,number,lines:{...chosen.lines},allocation:chosen.allocation,note:chosen.note};
    }
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
  const {action,orderId,note,allocation,number}=draft;
  const body={action,orderId,lines:Object.entries(draft.lines).filter(([,qty])=>action==='dispatch'||qty>0).map(([id,qty])=>({id,qty}))};
  if(action==='request'){body.note=note;body.allocation=allocation;}
  const signature=JSON.stringify(body);
  if(retry?.signature!==signature)retry={signature,id:crypto.randomUUID()};
  try{
    model=await inventory('cedis',{...body,revision:model.revision,requestId:retry.id});
    const latest=action==='request'?orders().length:number;
    say(action==='request'?'Pedido #'+latest+' guardado por '+user.name+'. Falta guardar la salida.':
      'Salida guardada por '+user.name+' · Pedido #'+number+'\n\n'+body.lines.map(({id,qty})=>{
        const item=product(id);
        const balance=model.cedis[id]==null?'existencia pendiente':amount(id,model.cedis[id]);
        return item.name+' · '+item.place+': '+balance+' · Sucursal: +'+amount(id,qty);
      }).join('\n'));
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
    if(chat().lastStock&&/por ?que|de donde|como (lo |se )?calcula|como sale|por que sale/.test(normalized)){
      await explainStock();return;
    }
    const result=await inventory('rastro-chat',{
      text:awaitingOrder?'Elegir pedido pendiente para preparar salida: '+text:text,
      section,
      draft:draft?{action:draft.action,lines:draft.lines,question:clarification,allocation:draft.allocation}:undefined,
      previousProducts:chat().products
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
  AreaNavigation.guardChanges({hasChanges:pending,isSaving:()=>busy,discard:()=>{draft=null;awaitingOrder=false;$('message').value='';}});
  inventory('session').then(async result=>{user=result.user;await load();}).catch(error=>{
    if(error.status===401)login();
    else $('chat').append(el('p',error.message,'warn'));
  });
});
