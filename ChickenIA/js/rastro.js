'use strict';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>v===null?'Pendiente':new Intl.NumberFormat('es-MX',{maximumFractionDigits:3}).format(v);
let snapshot,dirty=false,busy=false;
$('#date').value=new URLSearchParams(location.search).get('date')||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City'}).format(new Date());
async function api(body){const r=await fetch('/api/rastro?date='+encodeURIComponent($('#date').value),body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});if(r.status===401){location.assign('/inventario.html?next='+encodeURIComponent('/rastro.html?date='+$('#date').value));throw Error('Inicia sesión para continuar.');}const data=await r.json();if(!r.ok)throw Error(data.error);return data;}
function render(){
  $('#back').href='/supervision.html?area=supervision&date='+snapshot.date;
  $('#products').innerHTML=snapshot.lines.map(i=>`<section class="rastro-product" data-id="${i.id}"><h2>${esc(i.name)} · ${esc(i.unit)}</h2><p>Había: <strong>${number(i.previous)} ${esc(i.unit)}</strong></p><p>Registrado hoy: llegó ${number(i.entry)} · salió ${number(i.exit)}${i.adjustment?' · rectificación '+(i.adjustment>0?'+':'')+number(i.adjustment):''}</p><div class="rastro-fields">${!i.initialized?field('initial','Lo que hay al iniciar',i.unit):''}${field('entry','Lo que llega ahora (+)',i.unit)}${field('exit','Lo que sale ahora (−)',i.unit)}</div><p>Queda en Rastro: <strong data-balance>${number(i.final)} ${esc(i.unit)}</strong></p>${i.correction?`<p class="rastro-correction"><strong>Inventario rectificado: ${number(i.correction.before)} → ${number(i.correction.after)} ${esc(i.unit)}</strong><br>${esc(i.correction.actor)} · ${esc(new Date(i.correction.at).toLocaleString('es-MX',{timeZone:'America/Mexico_City'}))}<br>${esc(i.correction.notes)}</p>`:''}</section>`).join('');
  $('#history').innerHTML='<table><thead><tr><th>Fecha</th><th>Producto</th><th>Movimiento</th><th>Cantidad</th><th>Quién / cuándo</th><th>Entrega / recibe / motivo</th></tr></thead><tbody>'+snapshot.history.filter(m=>{const start=new Date(snapshot.date+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7);return m.movement_date>=start.toISOString().slice(0,10);}).map(m=>`<tr><td>${esc(String(m.movement_date).slice(0,10))}</td><td>${esc(snapshot.lines.find(i=>i.id===m.item_id)?.name||m.item_id)}</td><td>${esc({initial:'Existencia inicial',entry:'Entrada',exit:'Salida','rastro-adjustment':'RECTIFICACIÓN DE INVENTARIO'}[m.movement_type]||m.movement_type)}</td><td>${m.movement_type==='rastro-adjustment'?number(meta(m.notes).before)+' → '+number(meta(m.notes).after):esc(m.quantity)}</td><td>${esc(m.recorded_by)}<br>${esc(new Date(m.recorded_at).toLocaleString('es-MX',{timeZone:'America/Mexico_City'}))}</td><td>${esc(receipt(m.notes))}</td></tr>`).join('')+'</tbody></table>';
  $('#rectify').hidden=snapshot.role!=='manager';
  $('#notes').value='';$('#status').textContent='Datos guardados · '+snapshot.date;$('#save').disabled=false;
}
function meta(notes){try{return JSON.parse(notes)||{};}catch{return {};}}
function receipt(notes){const r=meta(notes);return [r.deliveredBy,r.receivedBy,r.note].filter(Boolean).join(' / ');}
function field(key,label,unit){return `<label>${label} (${esc(unit)})<input data-key="${key}" type="number" min="0" max="1000000" step="${unit==='pieza'?'1':'0.001'}" inputmode="decimal" placeholder="Sin captura"></label>`;}
function lock(value){busy=value;$('#save').disabled=value||!snapshot;$('#date').disabled=value;$('#reload').disabled=value;$('#rectify').disabled=value||!snapshot;$('#correction-dialog').querySelectorAll('input,select,textarea,button').forEach(i=>i.disabled=value);$('#products').querySelectorAll('input').forEach(i=>i.disabled=value);$('#notes').disabled=value;$('#delivered-by').disabled=value;$('#received-by').disabled=value;}
async function load(){lock(true);$('#error').textContent='';try{snapshot=await api();dirty=false;render();}catch(e){$('#error').textContent=e.message;if(snapshot)$('#date').value=snapshot.date;}finally{lock(false);}}
$('#rastro-form').addEventListener('input',e=>{dirty=true;$('#status').textContent='Cambios sin guardar';const card=e.target.closest('[data-id]');if(!card)return;const item=snapshot.lines.find(i=>i.id===Number(card.dataset.id));let balance=item.final;const initial=card.querySelector('[data-key="initial"]');if(initial&&initial.value!=='')balance=Number(initial.value);if(balance!==null){balance=Math.round(balance*1000);for(const key of ['entry','exit'])balance+=Math.round(Number(card.querySelector(`[data-key="${key}"]`).value||0)*1000)*(key==='exit'?-1:1);balance/=1000;}card.querySelector('[data-balance]').textContent=number(balance)+' '+item.unit;});
$('#rastro-form').onsubmit=async e=>{e.preventDefault();if(busy)return;const lines=[...document.querySelectorAll('[data-id]')].map(card=>{const line={itemId:Number(card.dataset.id)};card.querySelectorAll('input').forEach(i=>{if(i.value!=='')line[i.dataset.key]=Number(i.value);});return line;}).filter(l=>Object.keys(l).length>1);if(!lines.length){$('#error').textContent='Captura al menos una cantidad.';return;}lock(true);$('#error').textContent='';try{snapshot=await api({date:snapshot.date,revision:snapshot.revision,lines,notes:$('#notes').value,deliveredBy:$('#delivered-by').value,receivedBy:$('#received-by').value});dirty=false;render();}catch(e){$('#error').textContent=e.message;}finally{lock(false);}};
$('#reload').onclick=()=>{if(!dirty||confirm('¿Descartar los cambios sin guardar y recuperar lo registrado?'))load();};
$('#date').onchange=()=>{if(dirty&&!confirm('¿Descartar los cambios sin guardar y cambiar de fecha?')){$('#date').value=snapshot.date;return;}load();};
const dialog=$('#correction-dialog');
function correctionPreview(){
 const item=snapshot.lines.find(i=>i.id===Number($('#correct-item').value));if(!item)return;
 const input=$('#correct-quantity');input.step=item.unit==='pieza'?'1':'0.001';
 $('#correct-unit').textContent='Cantidad real en Rastro ('+item.unit+')';
 $('#correct-preview').textContent='Ahora dice: '+number(item.final)+' '+item.unit+(input.value!==''&&input.validity.valid?' → quedará: '+number(Number(input.value))+' '+item.unit:'. Escribe cuánto hay realmente.');
}
$('#rectify').onclick=()=>{
 if(busy||!snapshot)return;
 if(dirty&&!confirm('¿Descartar los movimientos sin guardar y abrir la rectificación?'))return;
 const items=snapshot.lines.filter(i=>i.final!==null);
 if(!items.length){$('#error').textContent='Primero registra la existencia inicial de algún producto.';return;}
 dirty=false;render();$('#correction-form').reset();$('#correct-error').textContent='';
 $('#correct-item').innerHTML=items.map(i=>`<option value="${i.id}">${esc(i.name)} · ${esc(i.unit)}</option>`).join('');
 $('#correct-date').textContent=snapshot.date;correctionPreview();dialog.showModal();
};
$('#correct-item').onchange=()=>{$('#correct-quantity').value='';correctionPreview();};
$('#correction-form').addEventListener('input',()=>{dirty=true;correctionPreview();});
function cancelCorrection(){if(busy)return;if(dirty&&!confirm('¿Descartar la rectificación sin guardar?'))return;dirty=false;dialog.close();}
$('#correct-cancel').onclick=cancelCorrection;dialog.addEventListener('cancel',e=>{e.preventDefault();cancelCorrection();});
$('#correction-form').onsubmit=async e=>{
 e.preventDefault();if(busy)return;
 const item=snapshot.lines.find(i=>i.id===Number($('#correct-item').value));
 const body={action:'rectify',date:snapshot.date,revision:snapshot.revision,itemId:item.id,quantity:Number($('#correct-quantity').value),notes:$('#correct-notes').value};
 if(!confirm(`${item.name} · ${body.date}\nAhora: ${number(item.final)} ${item.unit}\nCorrecto: ${number(body.quantity)} ${item.unit}\nMotivo: ${body.notes}\n\n¿Guardar la rectificación? Quedará registrada con tu nombre.`))return;
 lock(true);$('#correct-error').textContent='';
 try{snapshot=await api(body);dirty=false;render();dialog.close();$('#error').textContent='';$('#status').textContent='Inventario rectificado correctamente · '+snapshot.date;}
 catch(error){$('#correct-error').textContent=error.message;}
 finally{lock(false);}
};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});load();
