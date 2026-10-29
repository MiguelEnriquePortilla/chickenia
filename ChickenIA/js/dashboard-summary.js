(()=>{
 'use strict';
 const names={evaluation:'Evaluaciones',proteins:'Proteínas',production:'Producción',cedis:'Inventario CEDIS'},records=new Map();
 const date=()=>document.getElementById('date-input').value||new URLSearchParams(location.search).get('date')||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 window.DashboardReports={set(type,data,day){if(day!==date())return;records.set(type,{data,date:day});updateSectionSummary(type,data,day);document.querySelectorAll(`[data-summary-report="${type}"]`).forEach(b=>b.disabled=false);}};

 function updateSectionSummary(type,data,day){
  const summary=document.querySelector(`#resumen-${type==='evaluation'?'evaluation':type==='proteins'?'proteins':type==='production'?'production':'cedis'}>summary`);if(!summary)return;
  let text='';
  if(type==='evaluation'){
   const areas=data.weekly?.areas||[],days=areas.map(a=>a.days.find(d=>d.date===day)),reviewed=days.filter(d=>d?.score!=null),pending=reviewed.reduce((n,d)=>n+Math.max(0,d.total-d.done),0);
   text=`${reviewed.length} de ${areas.length} \u00e1reas revisadas \u00b7 ${pending} actividades pendientes${reviewed.length<areas.length?' \u00b7 '+(areas.length-reviewed.length)+' sin revisi\u00f3n':''}`;
  }else if(type==='proteins'){
   const available=data.filter(r=>!r.unavailable),rows=available.flatMap(r=>r.rows||[]),captured=rows.filter(r=>r.total!=null).length;
   text=`${captured} de ${rows.length} registros con captura${data.length>available.length?' \u00b7 '+(data.length-available.length)+' destinos no disponibles':''}`;
  }else if(type==='cedis'){
   const lines=data.days?.find(d=>d.date===day)?.lines||data.lines||[];
   text=`${lines.filter(r=>r.final!=null).length} de ${lines.length} productos con captura`;
  }else{
   const p=data.production;text=!p?.revision?'Sin captura':`${p.finalized?'Finalizado':'Borrador'} \u00b7 ${p.totals.active} productos \u00b7 ${p.totals.pendingBatches} tandas pendientes`;
  }
  let label=summary.querySelector('.section-state');if(!label){label=document.createElement('span');label.className='section-state';summary.append(label);}label.textContent=text;
 }
 const dialog=document.createElement('dialog');dialog.className='summary-share-dialog';dialog.setAttribute('aria-label','Vista previa del informe');document.body.append(dialog);
 let message='',imageUrl='',blob,previousFocus;
 function clearImage(){if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl='';blob=null;}
 function close(){dialog.close();clearImage();previousFocus?.focus();}
 dialog.addEventListener('close',clearImage);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 document.addEventListener('click',e=>{
  const button=e.target.closest('[data-summary-report]');if(!button)return;
  const type=button.dataset.summaryReport,entry=records.get(type);if(!entry||entry.date!==date())return;
  previousFocus=button;clearImage();message=ChickenSummaryReports.build(type,entry.data,entry.date,button.dataset.reportItem);
  dialog.innerHTML=`<h2>Compartir ${names[type]}</h2><p class="summary-disclaimer">Vista previa · ${esc(entry.date)}. Elige el chat y envía desde WhatsApp.</p><pre>${esc(message)}</pre><div class="summary-share-actions"><a href="https://wa.me/?text=${encodeURIComponent(message)}" target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a><button type="button" data-copy>Copiar texto</button><button type="button" data-image>Preparar imagen</button><button type="button" data-close>Cerrar</button></div><p role="status" class="summary-share-status"></p><div class="summary-image-preview"></div>`;dialog.showModal();
 });
 dialog.addEventListener('click',async e=>{
  if(e.target.closest('[data-close]')){close();return;}
  const status=dialog.querySelector('[role=status]');
  if(e.target.closest('[data-copy]')){try{await navigator.clipboard.writeText(message);status.textContent='Texto copiado.';}catch{status.textContent='Selecciona el texto de la vista previa para copiarlo.';}}
  if(e.target.closest('[data-image]')){
   const b=e.target.closest('button');b.disabled=true;
   try{
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font='28px Arial';const lines=[];
    for(const original of message.split('\n')){let line='';for(const word of original.replace(/\*/g,'').split(' ')){if(line&&ctx.measureText(line+' '+word).width>920){lines.push(line);line=word;}else line+=(line?' ':'')+word;}lines.push(line);}
    canvas.width=1080;canvas.height=150+lines.length*42;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#1b2341';ctx.fillRect(0,0,canvas.width,16);ctx.font='28px Arial';lines.forEach((line,i)=>ctx.fillText(line,70,90+i*42));
    clearImage();blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('No se pudo generar la imagen.');imageUrl=URL.createObjectURL(blob);
    dialog.querySelector('.summary-image-preview').innerHTML=`<img src="${imageUrl}" alt="Informe listo para compartir"><a href="${imageUrl}" download="informe-chicania-${date()}.png">Descargar imagen</a>${navigator.canShare?.({files:[new File([blob],'informe.png',{type:'image/png'})]})?'<button type="button" data-share-image>Compartir imagen</button>':''}`;
    status.textContent='Imagen lista. Descárgala o compártela desde tu teléfono.';
   }catch(err){status.textContent=err.message;}finally{b.disabled=false;}
  }
  if(e.target.closest('[data-share-image]')&&blob){try{await navigator.share({files:[new File([blob],'informe-chicania.png',{type:'image/png'})]});}catch(err){if(err.name!=='AbortError')status.textContent='Puedes descargar la imagen y adjuntarla en WhatsApp.';}}
 });
 const openTarget=()=>{const id=location.hash.slice(1),section=document.getElementById(id);if(section?.matches('details.summary-section'))section.open=true;document.querySelectorAll('.summary-tree a').forEach(a=>{if(new URL(a.href).hash===(location.hash||'#resumen-evaluation'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});};
 window.addEventListener('hashchange',openTarget);openTarget();
 window.addEventListener('chickenia:shell',openTarget);
 document.addEventListener('click',e=>{const link=e.target.closest('.summary-tree a');if(!link)return;const url=new URL(link.href);if(url.pathname===location.pathname){url.searchParams.set('date',date());link.href=url.href;const section=document.getElementById(url.hash.slice(1));if(section)section.open=true;}});
 document.getElementById('date-input').addEventListener('change',()=>{records.clear();document.querySelectorAll('.section-state').forEach(el=>el.textContent='Consultando fecha...');document.querySelectorAll('[data-summary-report]').forEach(b=>b.disabled=true);if(dialog.open)close();});
})();
