(()=>{
 const root=document.getElementById('calibre-app');if(!root||root.dataset.view==='dashboard')return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const details=document.createElement('details');details.innerHTML='<summary>Asistencia del equipo</summary><div></div>';root.append(details);const host=details.querySelector('div');
 const marks=[['entrada','Entrada'],['comida_salida','Comida'],['comida_regreso','Regreso'],['salida','Salida']];let actor,locationId;
 async function request(url,body){const r=await fetch(url,{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'No se pudo consultar asistencia.');return d;}
 async function load(){try{
  const date=root.querySelector('#calibre-date').value;host.textContent='Cargando asistencia…';
  const [session,locations,people]=await Promise.all([request('/api/inventory?action=session'),request('/api/locations'),request('/api/employees')]);actor=session.user.name;locationId=locations.find(l=>l.code==='jojutla')?.id;
  if(!locationId)throw Error('Sucursal no disponible.');const records=await request(`/api/attendance?location_id=${locationId}&date=${date}`);
  if(date!==root.querySelector('#calibre-date').value)return;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  host.innerHTML=people.map(p=>{const r=records.find(r=>r.employee_id===p.id)||{};return `<section><h3>${esc(p.name)}</h3><div class="calibre-tools">${marks.map(([key,label])=>`<button type="button" data-person="${p.id}" data-mark="${key}" ${date!==today||r[key]?'disabled':''}>${label}${r[key]?' · '+esc(new Date(r[key]).toLocaleTimeString('es-MX',{timeZone:'America/Mexico_City',hour:'2-digit',minute:'2-digit'})):''}</button>`).join('')}</div></section>`;}).join('');
 }catch(e){host.textContent=e.message;}}
 details.addEventListener('toggle',()=>{if(details.open)load();});root.querySelector('#calibre-date').addEventListener('change',()=>{if(details.open)load();});
 host.addEventListener('click',async e=>{const b=e.target.closest('[data-person]');if(!b||b.disabled)return;b.disabled=true;try{await request('/api/attendance',{employee_id:Number(b.dataset.person),location_id:locationId,check_date:root.querySelector('#calibre-date').value,event:b.dataset.mark,checked_by:actor});await load();}catch(error){const p=document.createElement('p');p.textContent=error.message;p.setAttribute('role','alert');host.append(p);b.disabled=false;}});
})();
