'use strict';
window.ChickenRastroView=(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const num=v=>v===null?'Sin captura':new Intl.NumberFormat('es-MX',{maximumFractionDigits:3}).format(v);
 function render(d){
  const title=day=>new Date(day+'T12:00:00Z').toLocaleDateString('es-MX',{day:'numeric',month:'short',timeZone:'America/Mexico_City'});
  return '<h2>Inventario de Rastro · últimos 3 días</h2><p>El día seleccionado y los dos anteriores. Cada producto conserva su unidad.</p><p><a href="/rastro.html?date='+esc(d.date)+'">Abrir Rastro / rectificar inventario</a></p><div class="rastro-scroll" tabindex="0" role="region" aria-label="Histórico de Rastro de tres días"><p>En celular, desliza la tabla para ver los tres días.</p><table class="rastro-summary"><thead><tr><th scope="col">Producto</th>'+d.days.map(day=>'<th scope="col">'+esc(title(day.date))+'</th>').join('')+'</tr></thead><tbody>'+d.lines.map(item=>'<tr><th scope="row">'+esc(item.name)+'<br>'+esc(item.unit)+'</th>'+d.days.map(day=>{
   const i=day.lines.find(l=>l.id===item.id);
   if(i.final===null)return '<td>Sin captura</td>';
   return '<td><p>Había: '+num(i.previous)+'</p><p>Llegó: +'+num(i.entry)+'</p><p>Salió: −'+num(i.exit)+'</p><p>Rectificación: '+(i.adjustment>0?'+':'')+num(i.adjustment)+'</p><p><strong>Quedó: '+num(i.final)+' '+esc(i.unit)+'</strong></p>'+(i.correction?.date===day.date?'<small>Corregido: '+num(i.correction.before)+' → '+num(i.correction.after)+'<br>'+esc(i.correction.actor)+'<br>'+esc(i.correction.notes)+'</small>':'')+'</td>';
  }).join('')+'</tr>').join('')+'</tbody></table></div>';
 }
 return {esc,render};
})();
