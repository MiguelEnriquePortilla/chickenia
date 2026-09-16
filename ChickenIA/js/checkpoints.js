'use strict';
window.ChickenCheckpoints = {
  render(summary) {
    const grid=document.getElementById('checkpoints-grid');
    if(!grid)return;
    const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const pct=value=>value==null?'—':`${value}%`;
    const open=new Set([...grid.querySelectorAll('details[open]')].map(el=>el.dataset.cut));
    document.getElementById('checkpoints-status').textContent=summary.checkpoint_notifications_enabled
      ? 'Horario de Ciudad de México. Abre cada corte para revisar el avance por área.'
      : 'Horario de Ciudad de México. Avisos automáticos pendientes de activación; puedes revisar el avance por área.';
    grid.innerHTML=(summary.checkpoints||[]).map(c=>{
      const data=c.snapshot||c.current;
      const status=c.captured?(c.delivery_status==='sent'?'Reporte guardado · enviado a Telegram':'Reporte guardado · envío por confirmar'):'Sin corte guardado';
      return `<details class="checkpoint" data-cut="${esc(c.id)}" ${open.has(c.id)?'open':''}>
        <summary><time>${esc(c.time)}</time><strong>${esc(c.label)}</strong><span class="cut-status">${esc(status)}</span><small>Ver avance por área ▾</small></summary>
        <p>${esc(c.focus)}</p>
        <p>${c.captured?'Capturado a las '+esc(new Date(data.captured_at).toLocaleTimeString('es-MX',{timeZone:'America/Mexico_City',hour12:false})):'Avance registrado actualmente para la fecha seleccionada. No representa un corte histórico.'}</p>
        <table><thead><tr><th>Área</th><th>Bloque</th><th>Día</th></tr></thead><tbody>${data.areas.map(a=>`<tr><td>${esc(a.name)}${a.unclassified?`<br><small>${a.unclassified} sin bloque</small>`:''}${a.critical_pending?`<br><small>${a.critical_pending} críticos del bloque pendientes</small>`:''}</td><td>${pct(a.block)}</td><td>${pct(a.day)}</td></tr>`).join('')}</tbody></table>
        <p>— Sin actividades asignadas a ese bloque. Los porcentajes corresponden al checklist verificado.</p>
      </details>`;
    }).join('');
  }
};
