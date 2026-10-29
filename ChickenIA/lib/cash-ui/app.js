(()=>{
'use strict';
const live=document.body.dataset.environment==='production';
const environmentLabel=live?'Guardado en ChickenIA':'Pruebas locales';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>v===null||v===undefined?'Pendiente':new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(v/100);
const photoFormat='cierre-una-pagina-v1';
let mode='production',step=0,state=null,dirty=false,busy=false,sequence=0,timer;
const params=new URLSearchParams(location.search);
if(params.has('mode')&&params.get('mode')!=='production'){location.replace('/produccion-diaria.html');return;}
if(live){$('#environment').textContent='Operación real';$('#dashboard-link').hidden=false;$('#finalize').textContent='Finalizar captura';$('#final-description').textContent='La captura quedará finalizada en ChickenIA y disponible para los próximos cortes de Telegram. No modifica existencias. La captura finalizada queda de solo lectura.';}
const dateParts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
$('#date').value=['year','month','day'].map(k=>dateParts.find(p=>p.type===k).value).join('-');
const requestedDate=params.get('date');
if(/^\d{4}-\d{2}-\d{2}$/.test(requestedDate||'')&&Number.isFinite(Date.parse(requestedDate))&&new Date(requestedDate).toISOString().slice(0,10)===requestedDate)$('#date').value=requestedDate;
const steps=()=>['Cocina','Freidoras','Rosticero',state?.data?.photo&&!state?.data?.digital?'Mermas y recepción':'Compras y comida'];
const get=path=>path.split('.').reduce((o,k)=>o?.[k],state.data);
function set(path,value){const keys=path.split('.'),last=keys.pop();keys.reduce((o,k)=>o[k],state.data)[last]=value;dirty=true;$('#save-status').textContent='Cambios sin guardar · '+environmentLabel;}
function input(path,label,kind='text',extra=''){
  const val=get(path),numeric=['money','count','qty'].includes(kind),value=val==null?'':kind==='money'?val/100:val;
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
async function load(){lock(true);$('#error').textContent='';try{state=await api(`/api/${mode}?date=${encodeURIComponent($('#date').value)}`);dirty=false;initPhoto();const importedPhoto=dirty;initDigital();dirty=importedPhoto;render();}catch(e){state=null;$('#fields').innerHTML='';failure(e);}finally{lock(false);}}
function initPhoto(){
  if(params.get('format')!=='photo'||state.finalized)return;
  const sha=params.get('sha256'),file=params.get('source')||'Foto de cierre';
  if(!/^[a-f0-9]{64}$/.test(sha||''))throw Error('Falta la referencia de la foto. Abre el enlace preparado por la habilidad de cierre.');
  if(state.data.photo&&state.data.photo.sourceSha256!==sha)throw Error('Ya hay otra foto en esta fecha. Revisa la captura existente antes de corregirla.');
  if(!state.data.photo){state.data.photo={format:photoFormat,sourceFile:file,sourceSha256:sha,...({deliveredBy:'',receivedBy:'',batchTimes:['','','']})};dirty=true;}
  if(mode==='production'){state.data.losses??=[];for(const r of state.data.lines){r.receivedRaw??=null;r.done3??=null;}if(step===0)step=1;}
}
function initDigital(){
  if(params.get('format')!=='digital'||state.finalized)return;
  if(mode==='production'){
    if(!state.data.digital){state.data.digital=true;dirty=true;}
    state.data.losses??=[];state.data.receipt??={deliveredBy:'',receivedBy:'',batchTimes:['','','']};
    for(const r of state.data.lines){r.receivedRaw??=null;r.done3??=null;if(!r.unit&&!['rosti','freidoras-4','costilla'].includes(r.id)&&['previousCooked','plan1','done1','plan2','done2','closingCooked'].every(k=>r[k]==null))r.unit='kg';}
  }
}
async function save(finalize=false){if(!state||!$('#form').reportValidity())return false;clearTimeout(timer);sequence++;lock(true);$('#error').textContent='';try{state=await api('/api/'+mode,{date:state.date,revision:state.revision,data:state.data,finalize});dirty=false;render();return true;}catch(e){failure(e);return false;}finally{lock(false);}}
async function recalculate(){const token=++sequence;if(!$('#form').checkValidity())return;try{const result=await api('/api/calculate',{mode,data:state.data});if(token!==sequence)return;state.totals=result.totals;renderSummary();refreshButtons();}catch(e){if(token===sequence)failure(e);}}
function render(){
  $('#title').textContent='Producción Diaria';
  document.title=$('#title').textContent+' · ChickenIA';
  $('#supervision-link').href='/supervision.html?area=supervision&date='+state.date;
  $('#save-status').textContent=state.finalized?'Finalizado · '+environmentLabel:state.revision?`Borrador guardado · Versión ${state.revision}`:'Nuevo borrador · Sin guardar';
  if(live)$('#dashboard-link').href='/dashboard.html?date='+state.date;
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
  $('#steps').innerHTML=steps().map((s,i)=>`<button type="button" data-step="${i}" ${i===step?'aria-current="step"':''}>${i+1}. ${s}</button>`).join('');
  $('#fields').innerHTML=productionForm();
  renderSummary();refreshButtons();
}
const detailSpecs={losses:{productId:['Producto',{'freidoras-4':'Cruji',rosti:'Rosti',costilla:'Costilla'}],state:['Estado',{crudo:'Crudo',cocido:'Cocido'}],type:['Tipo',{merma:'Merma',cortesia:'Cortesía',consumo:'Consumo',devolucion:'Devolución'}],quantity:['Cantidad','qty'],unit:['Unidad',{pollos:'Pollos',kg:'kg'}],reason:['Motivo','text']}};
function details(key,title){return `<details ${state.data[key].length?'open':''}><summary>${title} (${state.data[key].length})</summary>${state.data[key].map((r,i)=>`<div class="entry"><div class="entry-head"><strong>Registro ${i+1}</strong><button type="button" title="Quitar registro" aria-label="Quitar registro ${i+1}" data-remove="${key}.${i}">×</button></div><div class="fields">${Object.entries(detailSpecs[key]).map(([k,[label,type]])=>typeof type==='object'?select(`${key}.${i}.${k}`,label,type):input(`${key}.${i}.${k}`,label,type)).join('')}</div></div>`).join('')}<button type="button" data-add="${key}">Agregar registro</button></details>`;}
let productionStage='1';
function productionForm(){
  if(state.data.photo&&!state.data.digital&&step===0)return '<legend>Cocina</legend><p>Esta hoja corresponde a proteínas. La producción de cocina se captura en su formato propio.</p>';
  if(state.data.photo&&!state.data.digital&&step===3)return `<legend>Recepción, mermas y aclaraciones</legend><div class="fields">${input('photo.deliveredBy','Entregó la proteína')}${input('photo.receivedBy','Recibió la proteína')}${[0,1,2].map(i=>input('photo.batchTimes.'+i,'Hora de producción '+(i+1))).join('')}${area('notes','Aclaraciones')}</div>${details('losses','Mermas y consumo')}`;
  if(step===3)return `<legend>Compras y comida de empleados</legend><div class="fields">${Object.keys(state.data.purchases).map(k=>input('purchases.'+k+'.qty',k,'qty')+input('purchases.'+k+'.unit','Unidad de '+k)).join('')}${area('employeeMeal','Comida de empleados / guisado')}${area('notes','Aclaraciones')}${state.data.digital?input('receipt.deliveredBy','Entregó proteína')+input('receipt.receivedBy','Recibió proteína')+[0,1,2].map(i=>input('receipt.batchTimes.'+i,'Hora de producción '+(i+1),'time')).join(''):''}</div>${state.data.digital?details('losses','Mermas, cortesías y consumo'):''}`;
  const currentArea=steps()[step],stageFields=state.data.photo&&!state.data.digital?(productionStage==='1'?['previousRaw','previousCooked','receivedRaw','done1']:productionStage==='2'?['done2']:productionStage==='third'?['done3']:['closingCooked','closingRaw']):productionStage==='1'?['previousRaw','previousCooked',...(state.data.digital?['receivedRaw']:[]),'plan1','done1']:productionStage==='2'?['plan2','done2']:productionStage==='third'?['done3']:['closingCooked','closingRaw'];
  const labels={receivedRaw:'Llegada cruda',done3:'Tercera producción: hecho',previousRaw:'Crudo de ayer',previousCooked:'Quedó de ayer (preparado)',plan1:'Primera tanda: preparar',done1:'Primera tanda: hecho',plan2:'Segunda tanda: preparar',done2:'Segunda tanda: hecho',closingCooked:'Preparado al cierre',closingRaw:'Crudo al cierre'};
  return `<legend>${currentArea}</legend><div class="prod-tools">${input('responsible','Responsable')}<label>Momento<select id="stage"><option value="1" ${productionStage==='1'?'selected':''}>Primera tanda</option><option value="2" ${productionStage==='2'?'selected':''}>Segunda tanda · 14:00</option>${state.data.photo||state.data.digital?`<option value="third" ${productionStage==='third'?'selected':''}>Tercera producción</option>`:''}<option value="3" ${productionStage==='3'?'selected':''}>Cierre</option></select></label></div>${state.data.lines.map((r,i)=>{
    const c=state.catalog.find(c=>c.id===r.id);if(c.area!==currentArea||(state.data.photo&&!state.data.digital&&!['freidoras-4','rosti','costilla'].includes(r.id)))return '';
    const applicable=stageFields.filter(k=>!(k==='previousRaw'||k==='closingRaw'||k==='receivedRaw')||c.rawUnit);
    return `<section class="product ${r.active?'':'disabled-product'}"><div class="product-head"><label><input type="checkbox" data-path="lines.${i}.active" data-kind="checkbox" ${r.active?'checked':''}> ${esc(c.name)}</label>${select('lines.'+i+'.unit','Unidad',c.unit?{[c.unit]:c.unit}:{'':'Elegir unidad',kg:'kg',litros:'litros',porciones:'porciones',piezas:'piezas'})}</div>${r.active?`${zero(applicable.map(k=>'lines.'+i+'.'+k),'Sin movimiento en los campos vacíos')}<div class="fields">${applicable.map(k=>input(`lines.${i}.${k}`,`${labels[k]}${(k==='previousRaw'||k==='closingRaw'||k==='receivedRaw')?' ('+c.rawUnit+')':r.unit?' ('+r.unit+')':''}`,'qty')).join('')}</div>`:''}${c.id==='freidoras-4'?'<p class="subtle">Todo el pollo se captura en pollos. Medio pollo = 0.5; un cuarto = 0.25.</p>':''}</section>`;
  }).join('')}`;
}
function renderSummary(){
  const t=state.totals;
  $('#summary-title').textContent='Seguimiento del día';
  const metrics={active:'Productos del día',pendingBatches:'Tandas debajo de la orden'};
  $('#totals').innerHTML='<dl>'+Object.entries(metrics).map(([k,label])=>`<div><dt>${label}</dt><dd class="">${esc(t[k])}</dd></div>`).join('')+'</dl>';
  const readable=v=>v.replace(/previousRaw|previousCooked|plan1|done1|plan2|done2|closingRaw|closingCooked/g,k=>({previousRaw:'crudo anterior',previousCooked:'preparado anterior',plan1:'orden primera tanda',done1:'hecho primera tanda',plan2:'orden segunda tanda',done2:'hecho segunda tanda',closingRaw:'crudo al cierre',closingCooked:'preparado al cierre'}[k]));
  $('#alerts').innerHTML=(t.warnings.length?'<ul>'+t.warnings.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>':'')+`<p>${t.missing.length?'Puedes guardar el avance y completar lo pendiente después':'Captura lista para finalizar'}</p>`+(t.missing.length?'<details><summary>Ver pendientes</summary><ul>'+t.missing.map(v=>'<li>'+esc(readable(v))+'</li>').join('')+'</ul></details>':'');
}
$('#supervision-link').href='/supervision.html?area=supervision&date='+$('#date').value;
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
  clearTimeout(timer);timer=setTimeout(recalculate,300);
});
$('#form').addEventListener('change',e=>{if(e.target.id==='stage'){productionStage=e.target.value;$('#fields').innerHTML=productionForm();}});
$('#fields').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||busy||state.finalized)return;
  if(b.dataset.zero){for(const p of JSON.parse(b.dataset.zero))if(get(p)===null)set(p,0);}
  else if(b.dataset.add){const key=b.dataset.add;const row=Object.fromEntries(Object.entries(detailSpecs[key]).map(([k,[,type]])=>[k,typeof type==='object'?Object.keys(type)[0]:type==='count'?1:['money','qty'].includes(type)?null:'']));state.data[key].push(row);dirty=true;}
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
document.addEventListener('click',async e=>{
 const link=e.target.closest('a[href]');if(!link||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||link.target==='_blank')return;
 const destination=new URL(link.href,location.origin);if(destination.origin!==location.origin)return;
 if(busy){e.preventDefault();return;}if(!dirty)return;
 e.preventDefault();if(await save())location.assign(destination.href);
});
window.addEventListener('beforeunload' ,e=>{if(dirty){e.preventDefault();e.returnValue='';}});
load();

})();
