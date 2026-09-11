/* Shared area navigation across operational modules. */
(() => {
  const definitions = [
    ['general','Vista general','M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z'],
    ['rastro','Rastro','M4 5h16v15H4z M8 2v6 M16 2v6 M4 11h16'],
    ['sucursal_apertura','Apertura de Sucursal','M3 10l9-7 9 7 M5 9v12h14V9 M9 21v-8h6v8'],
    ['almacen','Almacén','M3 8l9-5 9 5v12H3z M8 20v-8h8v8'],
    ['cocina','Cocina','M4 10h16v9H4z M7 6V3 M12 6V3 M17 6V3 M2 10h20'],
    ['rosticero','Rosticero','M3 7h18v13H3z M7 12h10 M8 3v2 M16 3v2 M7 16h10'],
    ['freidoras','Freidoras','M5 10h14l-2 10H7z M19 10l2-5 M8 7V3 M12 7V3 M16 7V3'],
    ['caja','Caja','M4 10h16v10H4z M7 10V4h10v6 M7 15h2 M12 15h5'],
    ['ventas_barras','Ventas / Barras','M3 7h18l-2 5H5z M5 12v8h14v-8 M8 4h8'],
    ['trastes','Lavado de trastes','M3 12h18l-3 8H6z M8 12V6a4 4 0 018 0 M16 6v3'],
    ['supervision','Supervisión','M6 5h12v16H6z M9 3h6v4H9z M9 12l2 2 4-4'],
  ];
  const params = new URLSearchParams(location.search);
  let selected = params.get('area') || 'general';
  if (!definitions.some(a=>a[0]===selected)) selected='general';
  let callback, mounted=false;
  const modules=[['supervision','Actividades','/supervision.html'],['dashboard','Dashboard','/dashboard.html'],['inventario','Inventario','/inventario.html'],['preguntale','Pregúntale a Chicken-IA','/preguntale.html']];
  const module=modules.find(m=>location.pathname.includes(m[0]))?.[0]||'supervision';
  function select(code,notify=true) {
    selected=code;
    const url=new URL(location.href);url.searchParams.set('area',code);history.replaceState(null,'',url);
    document.querySelectorAll('[data-nav-area]').forEach(b=>{const active=b.dataset.navArea===code;b.toggleAttribute('aria-current',active);if(active)b.setAttribute('aria-current','page');});
    document.querySelectorAll('[data-module-path]').forEach(a=>a.href=a.dataset.modulePath+'?area='+encodeURIComponent(code));
    const name=definitions.find(a=>a[0]===code)?.[1]||code;
    const title=document.getElementById('selected-area-title');if(title)title.textContent=name;
    if(notify&&callback)callback(code);
  }
  function mount(container,onSelect) {
    callback=onSelect;
    if(mounted){select(selected);return;}
    mounted=true;
    container.classList.add('area-shell');
    const aside=document.createElement('aside');aside.className='area-sidebar';aside.setAttribute('aria-label','Navegación de Chicanito');
    aside.innerHTML=`<div class="sidebar-top"><a href="/" class="sidebar-brand">CHICKEN<span>·</span>IA</a><button type="button" class="sidebar-toggle" aria-label="Contraer menú" aria-expanded="true">&#9776;</button></div><p class="sidebar-label">ÁREAS DE CHICANITO</p><nav aria-label="áreas de operación">${definitions.map(([code,name,path])=>`<button type="button" data-nav-area="${code}" title="${name}" aria-label="${name}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="${path}"/></svg><span>${name}</span></button>`).join('')}</nav><div class="sidebar-footer">JOJUTLA · OPERACIÓN</div>`;
    container.prepend(aside);
    const context=document.createElement('div');context.className='area-context';
    context.innerHTML=`<div><span class="context-eyebrow">CHICANITO / ÁREA</span><h1 id="selected-area-title"></h1></div><nav aria-label="Vista del área">${modules.map(([id,name,path])=>`<a data-module-path="${path}" ${module===id?'aria-current="page"':''}>${name}</a>`).join('')}</nav>`;
    const header=container.querySelector('.app-header,.inv-header');header.after(context);
    let compact=matchMedia('(max-width: 760px)').matches;
    try{const saved=localStorage.getItem('chickenia_sidebar');if(saved!==null)compact=saved==='compact';}catch{}
    const toggle=aside.querySelector('.sidebar-toggle');
    const apply=()=>{container.classList.toggle('sidebar-compact',compact);toggle.setAttribute('aria-expanded',String(!compact));toggle.setAttribute('aria-label',compact?'Expandir menú':'Contraer menú');};
    matchMedia('(max-width: 760px)').addEventListener('change',e=>{compact=e.matches;apply();});
    apply();toggle.addEventListener('click',()=>{compact=!compact;apply();try{localStorage.setItem('chickenia_sidebar',compact?'compact':'expanded');}catch{}});
    aside.addEventListener('click',e=>{const button=e.target.closest('[data-nav-area]');if(button){select(button.dataset.navArea);if(matchMedia('(max-width: 760px)').matches){compact=true;apply();}}});
    select(selected);
  }
  window.AreaNavigation={mount,select,get selected(){return selected;}};
})();
