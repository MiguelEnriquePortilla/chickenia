/* Shared navigation: one set of destinations, grouped by task. */
(()=>{
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

  const params=new URLSearchParams(location.search);
  let selected=params.get('area')||'general', callback, mounted=false;
  if(!definitions.some(a=>a[0]===selected))selected='general';
  const groups=[['Operación',['home','opening','sales']],['Inventario',['stock','proteins','counts','receipts','catalog','history']],['Abastecimiento',['supply','weeklyPurchases','requestForm','incoming']],['Producción',['production','kitchenPlanning','kitchenProduction']]];
  const names={home:'Control del día',opening:'Apertura',sales:'Ventas del día',stock:'Existencias',proteins:'Existencias de pollo',counts:'Conteos',receipts:'Entradas e insumos',catalog:'Catálogo',history:'Historial',supply:'Abastecimiento',weeklyPurchases:'Compras semanales',requestForm:'Solicitudes',incoming:'Recepción',production:'Producción',kitchenPlanning:'Órdenes de producción',kitchenProduction:'Preparaciones en kg'};
  const icon=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
  const folder=icon('M3 7V5h6l2 2h10v13H3z');
  function inventoryMenu(entries,active,links=false){
    const available=new Map(entries);
    return groups.map(([name,keys])=>{
      const list=keys.filter(k=>available.has(k)); if(!list.length)return '';
      return `<details class="nav-group" ${list.includes(active)?'open':''}><summary>${folder}<span>${name}</span></summary><div>${list.map(k=>links?`<a data-module-path="/inventario.html?tab=${k}" href="/inventario.html?tab=${k}&area=${selected}">${available.get(k)}</a>`:`<button type="button" data-tab="${k}" ${k===active?'aria-current="page"':''}>${available.get(k)}</button>`).join('')}</div></details>`;
    }).join('');
  }
  function select(code,notify=true){
    if(!definitions.some(a=>a[0]===code))return;
    selected=code;
    const url=new URL(location.href);url.searchParams.set('area',code);history.replaceState(null,'',url);
    document.querySelectorAll('[data-nav-area]').forEach(b=>{if(b.dataset.navArea===code)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    document.querySelectorAll('[data-module-path]').forEach(a=>{const target=new URL(a.dataset.modulePath,location.origin);target.searchParams.set('area',code);a.href=target.pathname+target.search;});
    const title=document.getElementById('selected-area-title');if(title)title.textContent=definitions.find(a=>a[0]===code)[1];
    if(notify&&callback)callback(code);
  }
  function mount(container,onSelect){
    callback=onSelect;if(mounted){select(selected);return;}mounted=true;
    container.classList.add('area-shell');
    const aside=document.createElement('aside');aside.className='area-sidebar';aside.setAttribute('aria-label','Navegación principal');
    aside.innerHTML=`<div class="sidebar-top"><a href="/" class="sidebar-brand">Chicanito<span> · IA</span></a><button type="button" class="sidebar-toggle" aria-label="Contraer menú" aria-expanded="true">${icon('M3 4h18v16H3z M9 4v16')}</button></div><nav class="primary-navigation" aria-label="Apartados"><a href="/">${icon('M3 10l9-7 9 7 M5 9v12h14V9')}<span>Inicio</span></a><div id="sidebar-inventory"></div><a data-module-path="/supervision.html" ${location.pathname.includes('supervision')?'aria-current="page"':''}>${icon('M6 5h12v16H6z M9 3h6v4H9z M9 12l2 2 4-4')}<span>Supervisión y asistencia</span></a><a data-module-path="/dashboard.html" ${location.pathname.includes('dashboard')?'aria-current="page"':''}>${icon('M4 20V10 M12 20V4 M20 20v-7')}<span>Dashboard</span></a><a data-module-path="/preguntale.html" ${location.pathname.includes('preguntale')?'aria-current="page"':''}>${icon('M4 4h16v12H9l-5 4z')}<span>Pregúntale a Chicken-IA</span></a></nav><details class="sidebar-areas"><summary>Áreas de trabajo</summary><nav aria-label="Áreas">${definitions.map(([code,name,path])=>`<button type="button" data-nav-area="${code}" title="${name}">${icon(path)}<span>${name}</span></button>`).join('')}</nav></details><div class="sidebar-footer"><span>Chicken Chicanito</span></div>`;
    container.prepend(aside);
    const holder=aside.querySelector('#sidebar-inventory'),nav=document.getElementById('nav');
    if(nav)holder.append(nav);else holder.innerHTML=inventoryMenu(Object.entries(names),'',true);
    const header=container.querySelector('.app-header,.inv-header');
    if(header){const context=document.createElement('div');context.className='area-context';context.innerHTML='<span class="context-eyebrow">Área</span><span id="selected-area-title"></span>';header.after(context);}
    let compact=matchMedia('(max-width:760px)').matches;
    try{const saved=localStorage.getItem('chickenia_sidebar_v2');if(saved!==null)compact=saved==='compact';}catch{}
    const toggle=aside.querySelector('.sidebar-toggle');
    const apply=()=>{container.classList.toggle('sidebar-compact',compact);toggle.setAttribute('aria-expanded',String(!compact));toggle.setAttribute('aria-label',compact?'Expandir menú':'Contraer menú');aside.querySelectorAll('nav,.sidebar-areas,.sidebar-footer').forEach(el=>el.inert=compact);};
    toggle.addEventListener('click',()=>{compact=!compact;apply();try{localStorage.setItem('chickenia_sidebar_v2',compact?'compact':'expanded');}catch{}});
    matchMedia('(max-width:760px)').addEventListener('change',e=>{compact=e.matches;apply();});apply();
    aside.addEventListener('click',e=>{const button=e.target.closest('[data-nav-area]');if(button)select(button.dataset.navArea);if(e.target.closest('[data-tab],[data-nav-area],a')&&matchMedia('(max-width:760px)').matches){compact=true;apply();}});
    select(selected);window.dispatchEvent(new Event('chickenia:shell'));
  }
  window.AreaNavigation={mount,select,inventoryMenu,get selected(){return selected;}};
})();
