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
  }else if(!busy){
    const chips=el('div',null,'chat-suggestions');
    const suggest=(label,text)=>button(label,()=>{$('message').value=text;$('message').focus();});
    if(section==='Inicio'||section==='Pedido a Rastro')chips.append(
      suggest('Preparar pedido','Quiero preparar un pedido a Rastro.'),
      suggest('Preparar salida','Ya salió el pedido de Rastro tal como se pidió.'));
    chips.append(suggest('Consultar existencias',section==='Inventario CEDIS'?'¿Cuánta harina para crujiente queda en Almacén?':'¿Cuánto Rostizado queda en Rastro y cuánto llegó a Sucursal?'));
    host.append(chips);
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
function stock(result){
  const ids=(result.products||[]).filter(id=>product(id));
  if(!ids.length){say(result.question||'¿Qué producto quieres consultar?');return;}
  chat().products=ids;
  say(ids.map(id=>{
    const item=product(id), cedis=model.cedis[id], branch=model.branch.find(value=>value.id===id);
    const source=item.place+': '+(cedis==null?'existencia pendiente':amount(id,cedis));
    const destination='Sucursal: '+(branch?'llegó '+amount(id,branch.incoming)+' · '+(branch.balance==null?(branch.used==null?'Consumo sin registrar':'Saldo inicial pendiente'):'quedan '+amount(id,branch.balance)):'producto sin saldo de Sucursal');
    return item.name+'\n'+(result.scope==='both'?source+'\n'+destination:result.scope==='sucursal'?destination:source);
  }).join('\n\n'));
}
function prepare(result,text){
  if(result.intent==='stock'){stock(result);return;}
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
    const result=await inventory('rastro-chat',{
      text:awaitingOrder?'Elegir pedido pendiente para preparar salida: '+text:text,
      section,
      draft:draft?{action:draft.action,lines:draft.lines,question:clarification,allocation:draft.allocation}:undefined,
      previousProducts:chat().products
    });
    prepare(result,text);
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
