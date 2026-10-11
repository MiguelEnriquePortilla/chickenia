"use strict";
(()=>{
 const $=id=>document.getElementById(id),data=window.RegularOrdersData,key='chickenia_orders_2026_v1';
 let supplier='SAMS',draft={},preview=false;
 try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))draft=saved;}catch{}
 if(!draft.peregrinaExpanded20261011){
  const previous=draft.PEREGRINA;
  if(previous&&typeof previous==='object')for(let i=22;i>=17;i--){if(Object.prototype.hasOwnProperty.call(previous,i))previous[i+2]=previous[i];else delete previous[i+2];delete previous[i];}
  draft.peregrinaExpanded20261011=true;
  try{localStorage.setItem(key,JSON.stringify(draft));}catch{}
 }
 const rows=()=>[...data.suppliers[supplier],...(supplier==='PEREGRINA'?data.flour:[])];
 const current=()=>{if(!draft[supplier]||typeof draft[supplier]!=='object')draft[supplier]={};return draft[supplier];};
 const status=text=>$('orders-status').textContent=text;
 const save=()=>{try{localStorage.setItem(key,JSON.stringify(draft));}catch{status('No se pudo guardar el borrador en este dispositivo. Puedes copiarlo antes de salir.');}};
 const quantity=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)&&n>0&&n<=1000000?n:null;};
 const selected=()=>rows().map((row,i)=>({row,qty:quantity(current()[i])})).filter(x=>x.qty!==null);
 const date=()=>new Date().toLocaleDateString('es-MX',{timeZone:'America/Mexico_City',day:'numeric',month:'long'}).replace(/de (\p{L})/u,(_,letter)=>'de '+letter.toUpperCase());
 function text(){return ['🛒 *Pedidos Chicanito 2026*','📦 *'+supplier+'*','📅 '+date(),'',...selected().map(({row,qty})=>`• *${qty}${row[1]?" "+row[1]:""}* - ${row[0]}`),...(current().note?['','📝 *Nota:* '+current().note]:[])].join('\n');}
 function update(){const count=selected().length;for(const id of ['copy','share','whatsapp'])$(id).disabled=!count;$('capture-title').textContent='Pedidos Chicanito 2026 · '+supplier;$('capture-date').textContent=date();$('capture-lines').replaceChildren();for(const {row,qty} of selected()){const p=document.createElement('p');p.textContent=`${qty}${row[1]?" "+row[1]:""} · ${row[0]}`;$('capture-lines').append(p);}if(!count)$('capture-lines').textContent='Escribe cantidades para preparar el pedido.';$('capture-note').textContent=current().note?'Nota: '+current().note:'';}
 function render(){
  $('suppliers').replaceChildren();for(const name of Object.keys(data.suppliers)){const b=document.createElement('button');b.type='button';b.textContent=name;if(name===supplier)b.setAttribute('aria-current','page');b.onclick=()=>{supplier=name;status('');$('manual-copy').hidden=true;render();};$('suppliers').append(b);}
  $('products').replaceChildren();rows().forEach((row,i)=>{if(supplier==='PEREGRINA'&&i===data.suppliers.PEREGRINA.length){const h=document.createElement('h2');h.textContent='Harina para crujiente · pedido especial';$('products').append(h);}
   const label=document.createElement('label');label.className='orders-row';const input=document.createElement('input');input.type='number';input.min='0';input.max='1000000';input.step='any';input.inputMode='decimal';input.placeholder='—';input.value=quantity(current()[i])===null?'':current()[i];input.setAttribute('aria-label','Cantidad de '+row[0]+(row[1]?' en '+row[1]:''));input.oninput=()=>{current()[i]=input.value;save();update();};const desc=document.createElement('span'),title=document.createElement('strong'),detail=document.createElement('small');title.textContent=row[0];detail.textContent=row[1];desc.append(title);if(row[1])desc.append(detail);label.append(input,desc);$('products').append(label);});
  $('note').value=current().note||'';update();
 }
 $('note').oninput=()=>{current().note=$('note').value;save();update();};
 $('clear').onclick=()=>{if(!confirm('¿Limpiar las cantidades y la nota de '+supplier+'?'))return;draft[supplier]={};save();render();status('Pedido limpio.');};
 $('preview').onclick=()=>{preview=!preview;$('editor').classList.toggle('orders-preview',preview);$('products').hidden=preview;$('clear').hidden=preview;$('capture').hidden=!preview;document.querySelector('main').classList.toggle('capture-mode',preview);$('preview').textContent=preview?'Volver a editar':'Ver pedido para captura';update();};
 async function copy(){try{await navigator.clipboard.writeText(text());status('Pedido copiado. Pégalo en el chat de WhatsApp.');}catch{$('manual-copy').hidden=false;$('order-text').value=text();$('order-text').focus();$('order-text').select();status('Selecciona y copia el texto del pedido.');}}
 $('copy').onclick=copy;
 $('share').onclick=async()=>{if(!navigator.share){await copy();return;}try{await navigator.share({title:'Pedidos Chicanito 2026 · '+supplier,text:text()});status('Pedido compartido con la aplicación elegida.');}catch(e){if(e.name!=='AbortError')await copy();}};
 $('whatsapp').onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent(text()),'_blank','noopener,noreferrer');
 render();
})();
