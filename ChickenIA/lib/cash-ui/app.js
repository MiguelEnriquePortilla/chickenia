'use strict';
const live=document.body.dataset.environment==='production';
const environmentLabel=live?'Guardado en ChickenIA':'Pruebas locales';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>v===null||v===undefined?'Pendiente':new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(v/100);
const cashLabels={opening:'Caja chica inicial',cashSales:'Cobros en efectivo antes de devoluciones',otherIn:'Otras entradas de efectivo',refunds:'Devoluciones en efectivo',expenses:'Gastos pagados de caja',firstTurn:'Entrega del primer turno',withdrawals:'Otros retiros o entregas',otherCoins:'Otras monedas',retained:'Se deja para el siguiente turno',delivered:'Efectivo entregado'};
const payLabels={cash:'Efectivo',credit:'Tarjeta de crédito',debit:'Tarjeta de débito',transfer:'Transferencias',other:'Otro'};
const evidenceLabels={cut:'Corte',terminals:'Terminales',transfers:'Transferencias',refunds:'Devoluciones',expenses:'Gastos',deliveries:'Entregas'};
const denominations={b1000:100000,b500:50000,b200:20000,b100:10000,b50:5000,b20:2000,m20:2000,m10:1000,m5:500,m2:200,m1:100,m050:50};
let mode='close',step=0,state=null,dirty=false,busy=false,sequence=0,timer;
const params=new URLSearchParams(location.search);
if(params.get('mode')==='production')mode='production';
if(live){$('#environment').textContent='Operación real';$('#dashboard-link').hidden=false;$('#finalize').textContent='Finalizar captura';$('#final-description').textContent='La captura quedará finalizada en ChickenIA y disponible para los próximos cortes de Telegram. No modifica existencias. La captura finalizada queda de solo lectura.';}
const dateParts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
$('#date').value=['year','month','day'].map(k=>dateParts.find(p=>p.type===k).value).join('-');
const requestedDate=params.get('date');
if(/^\d{4}-\d{2}-\d{2}$/.test(requestedDate||'')&&Number.isFinite(Date.parse(requestedDate))&&new Date(requestedDate).toISOString().slice(0,10)===requestedDate)$('#date').value=requestedDate;
const steps=()=>mode==='close'?['Efectivo','Conteo','Entrega','Ventas','Revisión']:['Cocina','Freidoras','Rosticero','Compras y comida'];
const get=path=>path.split('.').reduce((o,k)=>o?.[k],state.data);
function set(path,value){const keys=path.split('.'),last=keys.pop();keys.reduce((o,k)=>o[k],state.data)[last]=value;dirty=true;$('#save-status').textContent='Cambios sin guardar · '+environmentLabel;}
function input(path,label,kind='text',extra=''){
  const val=get(path),numeric=['money','count','qty'].includes(kind),value=val===null?'':kind==='money'?val/100:val;
  return `<label>${esc(label)}<input data-path="${esc(path)}" data-kind="${kind}" type="${numeric?'number':kind}" ${numeric?`min="0" step="${kind==='count'?'1':kind==='qty'?'0.001':'0.01'}" inputmode="decimal"`:''} value="${esc(value)}" ${numeric?'placeholder="Pendiente"':''} ${extra}></label>`;
}
function select(path,label,options){return `<label>${esc(label)}<select data-path="${path}" data-kind="select">${Object.entries(options).map(([v,t])=>`<option value="${v}" ${String(get(path)??'')===v?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;}
function area(path,label){return `<label class="full">${esc(label)}<textarea data-path="${path}" data-kind="text">${esc(get(path))}</textarea></label>`;}
function zero(paths,label){return `<button type="button" class="mini" data-zero="${esc(JSON.stringify(paths))}">${label}</button>`;}
async function api(path,body){
  if(live){const source=new URL(path,location.origin);const action=source.pathname==='/api/calculate'?'daily-calculate':body?'daily-save':'daily-get';path='/api/inventory?action='+action+'&mode='+mode+'&date='+encodeURIComponent(source.searchParams.get('date')||state?.date||$('#date').value);if(body)body={...body,mode};}
  const r=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':$('meta[name=csrf-token]').content},body:JSON.stringify(body)}:{cache:'no-store'});
  if(r.status===401&&live){location.assign('/inventario.html?next='+encodeURIComponent(location.pathname+'?date='+$('#date').value+'&mode='+mode));throw Error('Inicia sesión en ChickenIA.');}
  const result=await r.json();if(!r.ok)throw Error(result.error||'No se pudo completar');return result;
}
function lock(value){busy=value;$('#fields').disabled=value||!!state?.finalized;document.querySelectorAll('nav button,footer button,#date,#finalize').forEach(el=>el.disabled=value);if(!value)refreshButtons();}
function refreshButtons(){const finalized=!!state?.finalized;$('#save').disabled=finalized;$('#back').disabled=step===0;$('#next').disabled=step===steps().length-1;$('#finalize').disabled=finalized||!state?.totals?.canFinalize;$('#fields').disabled=finalized;}
function failure(e){$('#error').textContent=e.message;}
async function load(){lock(true);$('#error').textContent='';try{state=await api(`/api/${mode}?date=${encodeURIComponent($('#date').value)}`);dirty=false;render();}catch(e){state=null;$('#fields').innerHTML='';failure(e);}finally{lock(false);}}
async function save(finalize=false){if(!state||!$('#form').reportValidity())return false;clearTimeout(timer);sequence++;lock(true);$('#error').textContent='';try{state=await api('/api/'+mode,{date:state.date,revision:state.revision,data:state.data,finalize});dirty=false;render();return true;}catch(e){failure(e);return false;}finally{lock(false);}}
async function recalculate(){const token=++sequence;if(!$('#form').checkValidity())return;try{const result=await api('/api/calculate',{mode,data:state.data});if(token!==sequence)return;state.totals=result.totals;renderSummary();refreshButtons();}catch(e){if(token===sequence)failure(e);}}
function render(){
  $('#title').textContent=mode==='close'?'Cierre de Caja':'Producción del día';
  $('#save-status').textContent=state.finalized?'Finalizado · '+environmentLabel:state.revision?`Borrador guardado · Versión ${state.revision}`:'Nuevo borrador · '+environmentLabel;
  if(live)$('#dashboard-link').href='/dashboard.html?date='+state.date;
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
  $('#steps').innerHTML=steps().map((s,i)=>`<button type="button" data-step="${i}" ${i===step?'aria-current="step"':''}>${i+1}. ${s}</button>`).join('');
  $('#fields').innerHTML=mode==='close'?cashForm():productionForm();
  renderSummary();refreshButtons();
}
function cashForm(){
  if(step===0)return `<legend>¿Qué efectivo entró y salió?</legend><div class="fields">${input('cashier','¿Quién prepara el cierre?')}${input('cut','Corte')}${Object.keys(cashLabels).slice(0,7).map(k=>input('cash.'+k,cashLabels[k]+' ($)','money')).join('')}</div>`;
  if(step===1)return `<legend>¿Cuánto efectivo contaste?</legend>${zero(Object.keys(denominations).map(k=>'counts.'+k),'Marcar denominaciones vacías en cero')}<div class="counts">${['b','m'].map(prefix=>`<div><h2>${prefix==='b'?'Billetes':'Monedas'}</h2>${Object.entries(denominations).filter(([k])=>k.startsWith(prefix)).map(([k,v])=>`<div class="count-row">${input('counts.'+k,money(v),'count')}<output>${state.data.counts[k]===null?'—':money(v*state.data.counts[k])}</output></div>`).join('')}</div>`).join('')}</div><div class="fields">${input('cash.otherCoins','Otras monedas ($)','money')}</div>`;
  if(step===2)return `<legend>¿Cuánto entregaste y a quién?</legend><div class="fields">${input('cash.retained',cashLabels.retained+' ($)','money')}${input('cash.delivered',cashLabels.delivered+' ($)','money')}${input('receiver','Recibe')}${input('deliveryTime','Hora de entrega','time')}${input('receipt','Recibo o referencia')}</div>`;
  if(step===3)return `<legend>¿Coinciden las ventas y los cobros?</legend>${input('salesTotal','Venta total según corte ($)','money')}${Object.entries(payLabels).map(([k,label])=>`<div class="payment-row"><strong>${label}</strong>${input('payments.'+k+'.expected','Según corte ($)','money')}${input('payments.'+k+'.confirmed','Comprobado ($)','money')}<output>${money(state.totals.payments[k])}</output></div>`).join('')}${details('terminals','Cobros con terminal')}`;
  return `<legend>Comprobantes y aclaraciones</legend><div class="fields">${Object.entries(evidenceLabels).map(([k,v])=>select('evidence.'+k,v,{pending:'Pendiente',available:'Disponible',na:'No aplica'})).join('')}${area('explanation','Motivo de diferencias o pendientes')}</div>${details('incidents','Cancelaciones, descuentos, devoluciones y cortesías')}${details('movements','Entradas, gastos y otros retiros')}`;
}
const detailSpecs={terminals:{reference:['Transacción','text'],method:['Tipo',{credit:'Crédito',debit:'Débito'}],count:['Número de cobros','count'],charged:['Cobrado ($)','money'],refunded:['Devuelto ($)','money']},incidents:{type:['Tipo',{cancelacion:'Cancelación',descuento:'Descuento',devolucion:'Devolución',cortesia:'Cortesía'}],ticket:['Ticket','text'],amount:['Importe ($)','money'],reason:['Motivo','text'],authorizedBy:['Autorizó','text'],payment:['Forma de devolución','text']},movements:{type:['Tipo',{entrada:'Entrada',gasto:'Gasto',retiro:'Retiro'}],concept:['Concepto','text'],receipt:['Comprobante','text'],amount:['Importe ($)','money'],person:['Autoriza / recibe','text']}};
function details(key,title){return `<details ${state.data[key].length?'open':''}><summary>${title} (${state.data[key].length})</summary>${state.data[key].map((r,i)=>`<div class="entry"><div class="entry-head"><strong>Registro ${i+1}</strong><button type="button" title="Quitar registro" aria-label="Quitar registro ${i+1}" data-remove="${key}.${i}">×</button></div><div class="fields">${Object.entries(detailSpecs[key]).map(([k,[label,type]])=>typeof type==='object'?select(`${key}.${i}.${k}`,label,type):input(`${key}.${i}.${k}`,label,type)).join('')}</div></div>`).join('')}<button type="button" data-add="${key}">Agregar registro</button></details>`;}
let productionStage='1';
function productionForm(){
  if(step===3)return `<legend>Compras y comida de empleados</legend><div class="fields">${Object.keys(state.data.purchases).map(k=>input('purchases.'+k+'.qty',k,'qty')+input('purchases.'+k+'.unit','Unidad de '+k)).join('')}${area('employeeMeal','Comida de empleados / guisado')}${area('notes','Aclaraciones')}</div>`;
  const currentArea=steps()[step],stageFields=productionStage==='1'?['previousRaw','previousCooked','plan1','done1']:productionStage==='2'?['plan2','done2']:['closingCooked','closingRaw'];
  const labels={previousRaw:'Crudo de ayer',previousCooked:'Quedó de ayer (preparado)',plan1:'Primera tanda: preparar',done1:'Primera tanda: hecho',plan2:'Segunda tanda: preparar',done2:'Segunda tanda: hecho',closingCooked:'Preparado al cierre',closingRaw:'Crudo al cierre'};
  return `<legend>${currentArea}</legend><div class="prod-tools">${input('responsible','Responsable')}<label>Momento<select id="stage"><option value="1" ${productionStage==='1'?'selected':''}>Primera tanda</option><option value="2" ${productionStage==='2'?'selected':''}>Segunda tanda · 14:00</option><option value="3" ${productionStage==='3'?'selected':''}>Cierre</option></select></label></div>${state.data.lines.map((r,i)=>{
    const c=state.catalog.find(c=>c.id===r.id);if(c.area!==currentArea)return '';
    const applicable=stageFields.filter(k=>!(k==='previousRaw'||k==='closingRaw')||c.rawUnit);
    return `<section class="product ${r.active?'':'disabled-product'}"><div class="product-head"><label><input type="checkbox" data-path="lines.${i}.active" data-kind="checkbox" ${r.active?'checked':''}> ${esc(c.name)}</label>${select('lines.'+i+'.unit','Unidad',c.unit?{[c.unit]:c.unit}:{'':'Elegir unidad',kg:'kg',litros:'litros',porciones:'porciones',piezas:'piezas',pollos:'pollos'})}</div>${r.active?`<div class="fields">${applicable.map(k=>input(`lines.${i}.${k}`,`${labels[k]}${(k==='previousRaw'||k==='closingRaw')?' ('+c.rawUnit+')':r.unit?' ('+r.unit+')':''}`,'qty')).join('')}</div>`:''}${c.id==='freidoras-4'?'<p class="subtle">Crudo en pollos · Preparar y hecho en piezas · 8 piezas = 1 pollo</p>':''}</section>`;
  }).join('')}`;
}
function renderSummary(){
  const t=state.totals;
  $('#summary-title').textContent=mode==='close'?'Resumen del cierre':'Seguimiento del día';
  const metrics=mode==='close'?{expected:'Debe quedar',counted:'Efectivo contado',cashDifference:'Sobra (+) / falta (−)',toDeliver:'Por entregar',deliveryPending:'Pendiente de entrega',salesDifference:'Diferencia de ventas'}:{active:'Productos del día',pendingBatches:'Tandas debajo de la orden'};
  $('#totals').innerHTML='<dl>'+Object.entries(metrics).map(([k,label])=>`<div><dt>${label}</dt><dd class="${['cashDifference','deliveryPending','salesDifference'].includes(k)?t[k]?'warning':t[k]===0?'ok':'':''}">${esc(mode==='close'?money(t[k]):t[k])}</dd></div>`).join('')+'</dl>';
  const readable=v=>v.startsWith('cash.')?cashLabels[v.split('.')[1]]:v.startsWith('counts.')?'Conteo de '+money(denominations[v.split('.')[1]]):v.startsWith('payments.')?'Ventas: '+payLabels[v.split('.')[1]]:v.replace(/previousRaw|previousCooked|plan1|done1|plan2|done2|closingRaw|closingCooked/g,k=>({previousRaw:'crudo anterior',previousCooked:'preparado anterior',plan1:'orden primera tanda',done1:'hecho primera tanda',plan2:'orden segunda tanda',done2:'hecho segunda tanda',closingRaw:'crudo al cierre',closingCooked:'preparado al cierre'}[k]));
  $('#alerts').innerHTML=(t.warnings.length?'<ul>'+t.warnings.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>':'')+`<p>${t.missing.length?`${t.missing.length} datos o revisiones pendientes`:'Captura lista para finalizar'}</p>`+(t.missing.length?'<details><summary>Ver pendientes</summary><ul>'+t.missing.map(v=>'<li>'+esc(readable(v))+'</li>').join('')+'</ul></details>':'');
}
$('#form').addEventListener('submit',e=>e.preventDefault());
$('#form').addEventListener('input',e=>{
  const el=e.target;if(!el.dataset.path)return;let v=el.value;
  if(['money','count','qty'].includes(el.dataset.kind)){
    const precision=el.dataset.kind==='money'?2:el.dataset.kind==='qty'?3:0;
    const valid=v===''||new RegExp('^\\d+'+(precision?'(?:\\.\\d{0,'+precision+'})?':'')+'$').test(v);
    el.setCustomValidity(valid?'':'Escribe una cantidad válida, sin negativos.');if(!valid)return;
    v=v===''?null:el.dataset.kind==='money'?Math.round(Number(v)*100):Number(v);
  }else if(el.dataset.kind==='checkbox')v=el.checked;
  else if(el.dataset.path.endsWith('.unit')&&mode==='production'&&el.dataset.path.startsWith('lines.'))v=v||null;
  set(el.dataset.path,v);$('#error').textContent='';
  if(el.dataset.kind==='checkbox'){render();$('#save-status').textContent='Cambios sin guardar · '+environmentLabel;}
  if(el.dataset.path.startsWith('counts.')){const out=el.closest('.count-row').querySelector('output');out.textContent=v===null?'—':money(v*denominations[el.dataset.path.split('.')[1]]);}
  clearTimeout(timer);timer=setTimeout(recalculate,300);
});
$('#form').addEventListener('change',e=>{if(e.target.id==='stage'){productionStage=e.target.value;$('#fields').innerHTML=productionForm();}});
$('#fields').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||busy||state.finalized)return;
  if(b.dataset.zero){for(const p of JSON.parse(b.dataset.zero))if(get(p)===null)set(p,0);}
  else if(b.dataset.add){const key=b.dataset.add;const row=Object.fromEntries(Object.entries(detailSpecs[key]).map(([k,[,type]])=>[k,typeof type==='object'?Object.keys(type)[0]:type==='count'?1:type==='money'?null:'']));state.data[key].push(row);dirty=true;}
  else if(b.dataset.remove){const [key,i]=b.dataset.remove.split('.');state.data[key].splice(Number(i),1);dirty=true;}
  else return;
  render();$('#save-status').textContent='Cambios sin guardar · '+environmentLabel;recalculate();
});
async function move(target){if(busy||target<0||target>=steps().length)return;if(dirty&&!await save())return;step=target;render();window.scrollTo({top:0});}
$('#steps').addEventListener('click',e=>{if(e.target.dataset.step!==undefined)move(Number(e.target.dataset.step));});
$('#back').onclick=()=>move(step-1);$('#next').onclick=()=>move(step+1);$('#save').onclick=()=>save();
$('#finalize').onclick=()=>{if($('#form').reportValidity())$('#confirm').showModal();};$('#cancel-final').onclick=()=>$('#confirm').close();$('#yes-final').onclick=async()=>{$('#confirm').close();await save(true);};
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=async()=>{if(busy||b.dataset.mode===mode)return;if(dirty&&!await save())return;sequence++;clearTimeout(timer);mode=b.dataset.mode;step=0;await load();});
$('#date').onchange=async()=>{if(busy)return;const requested=$('#date').value;if(!requested){$('#date').value=state?.date||'';return;}if(dirty&&!await save()){$('#date').value=state.date;return;}sequence++;clearTimeout(timer);$('#date').value=requested;await load();};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
load();
