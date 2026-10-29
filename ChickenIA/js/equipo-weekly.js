(()=>{
'use strict';
const host=document.getElementById('equipo-weekly');if(!host)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dayNames=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];let generation=0;
async function load(){const date=document.getElementById('date-input').value||new URLSearchParams(location.search).get('date')||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const g=++generation;
 host.innerHTML='<p>Cargando evaluación del equipo…</p>';
 try{const response=await fetch(`/api/summary?calibre=1&date=${encodeURIComponent(date)}`,{cache:'no-store'});const data=await response.json();if(g!==generation)return;if(!response.ok)throw Error(data.error||'No se pudo consultar la semana.');
 window.DashboardReports?.set('evaluation',data,date);
 const w=data.weekly;if(!w)throw Error('La evaluación semanal todavía no está disponible.');
 host.innerHTML=`<header><div><h2>Evaluaciones del equipo</h2><p>Resultados del ${esc(date.slice(8))}/${esc(date.slice(5,7))} · Toca una ficha para revisar</p></div></header><div class="feed-list">${w.areas.map(a=>{const d=a.days.find(d=>d.date===date),score=d?.score,missing=score==null;return `<article class="feed-card"><h3>${esc(a.name)}</h3><div class="feed-result"><strong class="feed-number ${missing?'is-empty':''}">${missing?'Sin revisión':Math.floor(score*10)/10+'%'}</strong><p>${missing?'Todavía sin verificar':`${d.done} de ${d.total} verificadas<br>${d.done===d.total?'Ficha completa':`${d.total-d.done} ${d.total-d.done===1?"actividad pendiente":"actividades pendientes"}`}`}</p></div>${score>100?'<p class="feed-extra">✓ Actividad extra verificada</p>':''}<div class="feed-actions"><a href="/evaluacion-equipo.html?area=${encodeURIComponent(a.code)}&date=${date}">${!missing&&d.done<d.total?'Revisar pendientes':'Ver ficha'} →</a><button type="button" data-summary-report="evaluation" data-report-item="${esc(a.code)}">Compartir</button></div><details><summary>Ver semana</summary><div class="feed-history">${a.days.map((day,i)=>`<a href="/evaluacion-equipo.html?area=${encodeURIComponent(a.code)}&date=${day.date}"><span>${dayNames[i]} ${day.date.slice(8)}/${day.date.slice(5,7)}</span><strong>${day.score==null?'Sin revisión':Math.floor(day.score*10)/10+'%'}</strong></a>`).join('')}</div></details></article>`;}).join('')}</div>`;
 // Current checklist results replace the old evaluation blocks, never the operational cards.
 document.body.classList.toggle('equipo-week-active',date>=data.start);
 if(date>=data.start){for(const id of ['checklist-timeline','areas-card','area-status-bar','critical-pending']){const el=document.getElementById(id);if(el)el.hidden=true;}document.querySelector('.overall-score-box').hidden=true;}
 }catch(e){if(g===generation)host.innerHTML=`<h2>Evaluación Equipo Chicanito</h2><p role="alert">${esc(e.message)}</p><button type="button" data-retry>Reintentar</button>`;}
}
document.getElementById('date-input').addEventListener('change',()=>{for(const id of ['checklist-timeline','areas-card','area-status-bar','critical-pending']){const el=document.getElementById(id);if(el)el.hidden=false;}document.querySelector('.overall-score-box').hidden=false;load();});host.addEventListener('click',e=>{if(e.target.closest('[data-retry]'))load();});
load();
})();
