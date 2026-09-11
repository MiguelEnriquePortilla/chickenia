(() => {
  const $=id=>document.getElementById(id), areas={general:'Todas las áreas',rastro:'Rastro',sucursal_apertura:'Apertura de Sucursal',almacen:'Almacén',cocina:'Cocina',rosticero:'Rosticero',freidoras:'Freidoras',caja:'Caja',ventas_barras:'Ventas / Barras',trastes:'Lavado de trastes',supervision:'Supervisión'};
  const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  let previous='',busy=false;
  function element(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;}
  async function api(url,options){const r=await fetch(url,{cache:'no-store',...options});const data=await r.json().catch(()=>({error:'El servicio de consultas no está disponible en esta vista previa.'}));if(!r.ok){const e=new Error(data.error||'No se pudo consultar.');e.status=r.status;throw e;}return data;}
  for(const [value,name]of Object.entries(areas))$('area').append(new Option(name,value));
  $('date').value=day();$('date').max=day();
  AreaNavigation.mount($('chat-shell'),code=>{$('area').value=code;});
  $('area').addEventListener('change',()=>AreaNavigation.select($('area').value));
  $('period').addEventListener('change',()=>{$('date-label').hidden=$('period').value!=='custom';});
  const selectedDate=()=>$('period').value==='custom'?$('date').value:$('period').value==='yesterday'?new Date(Date.parse(day()+'T12:00:00Z')-86400000).toISOString().slice(0,10):day();
  const timestamp=value=>value?new Date(value).toLocaleString('es-MX',{timeZone:'America/Mexico_City',dateStyle:'short',timeStyle:'short'}):'Sin capturas';
  function setBusy(value){busy=value;document.querySelectorAll('#workspace button,#workspace select,#workspace input,#workspace textarea').forEach(e=>e.disabled=value);$('conversation').setAttribute('aria-busy',String(value));$('request-status').textContent=value?'Consultando los registros…':'';}
  function render(data){
    const card=element('article',null,'chat-answer');
    card.append(element('div',`${data.date} · ${data.areaName} · Jojutla`,'chat-meta'),element('h2',data.title));
    data.lines.forEach(line=>card.append(element('p',line)));
    if(data.rows.length){
      const wrap=element('div',null,'chat-table'),table=element('table'),head=element('thead'),tr=element('tr'),body=element('tbody');
      data.columns.forEach(c=>{const th=element('th',c);th.scope='col';tr.append(th);});head.append(tr);table.append(head,body);
      data.rows.forEach(row=>{const tr=element('tr');row.forEach(cell=>tr.append(element('td',cell)));body.append(tr);});wrap.append(table);
      if(data.rows.length>3){const details=element('details');details.append(element('summary',`Ver detalle · ${data.rows.length} registros`),wrap);card.append(details);}else card.append(wrap);
    }
    data.warnings.forEach(line=>card.append(element('p',line,'chat-warning')));
    for(const source of data.sources){const a=element('a',source.label+' →');a.href=source.href;card.append(a);}
    card.append(element('div',`Último registro: ${timestamp(data.updatedAt)} · Consultado: ${timestamp(data.consultedAt)} (CDMX)`,'chat-meta'));
    const follow=element('div',null,'chat-followups');
    for(const q of (data.intent==='inventory'||data.intent==='nancy'?['Verificaciones de Nancy','Inventarios y compras']:['Desglosar por áreas','Comparar con ayer'])){const b=element('button',q);b.type='button';b.dataset.question=q;follow.append(b);}card.append(follow);
    $('conversation').append(card);card.scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function ask(question){if(busy||!question.trim())return;setBusy(true);$('welcome').hidden=true;$('conversation').append(element('p',question,'chat-user'));
    try{const params=new URLSearchParams({question,date:selectedDate(),area:$('area').value,previous});const data=await api('/api/chicken-ia?'+params);previous=data.intent;AreaNavigation.select(data.area);$('date').value=data.date;$('period').value=data.date===day()?'today':'custom';$('date-label').hidden=$('period').value!=='custom';render(data);$('question').value='';}
    catch(e){const box=element('article',null,'chat-answer');box.append(element('p',e.message));const retry=element('button','Reintentar');retry.type='button';retry.dataset.question=question;box.append(retry);$('conversation').append(box);if(e.status===401||e.status===403){$('conversation').replaceChildren();$('workspace').hidden=true;$('login-panel').hidden=false;$('login-error').textContent=e.message;}}
    finally{setBusy(false);}
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-question]');if(b)ask(b.dataset.question);});
  $('composer').addEventListener('submit',e=>{e.preventDefault();ask($('question').value);});
  $('question').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();ask($('question').value);}});
  $('new-chat').addEventListener('click',()=>{$('conversation').replaceChildren();$('welcome').hidden=false;previous='';$('question').value='';$('question').focus();});
  $('theme').addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';try{localStorage.setItem('chickenia_theme',dark?'dark':'light');}catch{}});
  async function start(){try{await api('/api/chicken-ia?action=session');$('login-panel').hidden=true;$('workspace').hidden=false;}catch(e){$('login-panel').hidden=false;$('workspace').hidden=true;if(e.status!==401)$('login-error').textContent=e.message;}finally{$('startup').hidden=true;}}
  $('login-form').addEventListener('submit',async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;$('login-error').textContent='';try{const form=new FormData(e.target);await api('/api/inventory?action=login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:form.get('username'),password:form.get('password')})});e.target.reset();await start();}catch(err){$('login-error').textContent=err.message;}finally{button.disabled=false;}});
  $('logout').addEventListener('click',async()=>{try{await api('/api/inventory?action=logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});location.reload();}catch(e){$('request-status').textContent=e.message;}});
  start();
})();
