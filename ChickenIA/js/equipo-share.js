(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dialog=document.createElement('dialog');dialog.className='equipo-share-dialog';dialog.setAttribute('aria-label','Compartir avance del equipo');document.body.append(dialog);let message='';
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-equipo-share]');if(!b)return;
 if(window.ChickenEquipoCanShare&&!window.ChickenEquipoCanShare()){alert('Espera a que se guarden tus cambios antes de compartir.');return;}
 const date=(document.getElementById('calibre-date')||document.getElementById('date-input')).value;
 const scope=b.dataset.equipoShare==='area'?document.getElementById('equipo-area').value:'general';
 dialog.innerHTML='<h2>📲 Compartir avance</h2><p role="status">Preparando mensaje…</p><button type="button" data-share-close>Cerrar</button>';dialog.showModal();message='';
 try{
  const response=await fetch('/api/summary?calibre=1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'report',date,scope,kind:'simple'})});const d=await response.json();if(!response.ok)throw Error(d.error||'No se pudo preparar el mensaje.');message=d.message;
  dialog.innerHTML=`<h2>📲 Compartir avance</h2><pre>${esc(message)}</pre><p>Mensaje guardado en el histórico. Elige el grupo y envía desde WhatsApp. Los comentarios internos no se incluyen.</p><a class="equipo-share-link" href="https://wa.me/?text=${encodeURIComponent(message)}" target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a> <button type="button" data-share-copy>Copiar mensaje</button> <button type="button" data-share-close>Cerrar</button>`;
 }catch(error){dialog.innerHTML=`<h2>Compartir avance</h2><p role="alert">${esc(error.message)}</p><button type="button" data-share-close>Cerrar</button>`;}
});
dialog.addEventListener('click',async e=>{if(e.target.closest('[data-share-close]'))dialog.close();if(e.target.closest('[data-share-copy]')&&message){try{await navigator.clipboard.writeText(message);e.target.textContent='¡Copiado!';}catch{e.target.textContent='Selecciona y copia el mensaje de arriba.';}}});
})();
