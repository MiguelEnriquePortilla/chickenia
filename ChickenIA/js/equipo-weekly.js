(()=>{
'use strict';
const host=document.getElementById('equipo-weekly');if(!host)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dayNames=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];let generation=0;
async function load(){const date=document.getElementById('date-input').value||new URLSearchParams(location.search).get('date')||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const g=++generation;
 host.innerHTML='<p>Cargando evaluación del equipo…</p>';
 try{const response=await fetch(`/api/summary?calibre=1&date=${encodeURIComponent(date)}`,{cache:'no-store'});const data=await response.json();if(g!==generation)return;if(!response.ok)throw Error(data.error||'No se pudo consultar la semana.');
 const w=data.weekly;if(!w)throw Error('La evaluación semanal todavía no está disponible.');
 host.innerHTML=`<header><div><h2>Evaluación Equipo Chicanito</h2><p>Actividades verificadas · Semana del ${esc(w.dates[0].slice(8))}/${esc(w.dates[0].slice(5,7))} al ${esc(w.dates[6].slice(8))}/${esc(w.dates[6].slice(5,7))}</p></div><a href="/evaluacion-equipo.html">Abrir checklist</a></header><div class="equipo-week-scroll"><table><caption>Porcentaje del checklist por área y día</caption><thead><tr><th scope="col">Área</th>${w.dates.map((d,i)=>`<th scope="col">${dayNames[i]}<small>${d.slice(8)}/${d.slice(5,7)}</small></th>`).join('')}</tr></thead><tbody>${w.areas.map(a=>`<tr><th scope="row">${esc(a.name)}</th>${a.days.map(d=>`<td><a class="equipo-day ${d.score===null?'equipo-day-empty':d.score===100?'equipo-day-complete':'equipo-day-progress'} ${d.date===date?'equipo-day-selected':''}" href="/evaluacion-equipo.html?area=${encodeURIComponent(a.code)}&date=${d.date}" aria-label="${esc(a.name)} · ${d.date} · ${d.score===null?'Sin revisión':Math.floor(d.score*10)/10+'%'}">${d.score===null?'Sin revisión':`<strong>${Math.floor(d.score*10)/10}%</strong><small>${d.done}/${d.total}</small>`}</a></td>`).join('')}</tr>`).join('')}</tbody></table></div><p>Palomea en la ficha de cada área. Toca un resultado para consultar su checklist.</p>`;
 // Current checklist results replace the old evaluation blocks, never the operational cards.
 document.body.classList.toggle('equipo-week-active',date>=data.start);
 if(date>=data.start){for(const id of ['checklist-timeline','areas-card','area-status-bar','critical-pending']){const el=document.getElementById(id);if(el)el.hidden=true;}document.querySelector('.overall-score-box').hidden=true;}
 }catch(e){if(g===generation)host.innerHTML=`<h2>Evaluación Equipo Chicanito</h2><p role="alert">${esc(e.message)}</p><button type="button" data-retry>Reintentar</button>`;}
}
document.getElementById('date-input').addEventListener('change',()=>{for(const id of ['checklist-timeline','areas-card','area-status-bar','critical-pending']){const el=document.getElementById(id);if(el)el.hidden=false;}document.querySelector('.overall-score-box').hidden=false;load();});host.addEventListener('click',e=>{if(e.target.closest('[data-retry]'))load();});
load();
})();
