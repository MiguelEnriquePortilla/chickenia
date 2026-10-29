/* A single header; destinations belong only to the shared sidebar. */
(()=>{
 function header(){
  const shell=document.querySelector('.area-shell');if(!shell||shell.querySelector('.unified-header'))return;
  const old=shell.querySelector('.app-header,.inv-header,.daily-header');
  const bar=document.createElement('header');bar.className='unified-header';
  bar.innerHTML='<div class="unified-brand"><img src="/icons/brand-watermark.svg" alt="" width="48" height="36"><span>Chicken Chican<span class="brand-ia">IA</span></span></div>';
  if(old){const tools=old.querySelector('.header-tools');if(tools)bar.append(tools);old.hidden=true;old.classList.add('legacy-header');}
  shell.querySelector('.area-sidebar').after(bar);
  shell.querySelectorAll('main>header:not(.points-header),main>a[href],.points-header>a,.points-shell>footer a').forEach(el=>{if(el.matches('main>a')&&!['/','/index.html','/supervision.html'].includes(new URL(el.href).pathname))return;el.hidden=true;});
  if(location.pathname==='/dashboard.html'){const title=document.createElement('h1');title.className='unified-page-title';title.textContent='Resumen del día';bar.after(title);}
  if(!bar.querySelector('.header-tools')){
   const tools=document.createElement('div');tools.className='header-tools';
   const button=document.createElement('button');button.type='button';button.className='theme-control';
   const update=()=>{const dark=document.documentElement.dataset.theme==='dark';button.setAttribute('aria-label',dark?'Activar modo día':'Activar modo noche');button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="'+(dark?'M12 8a4 4 0 100 8 4 4 0 000-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2':'M20 15A9 9 0 019 4a9 9 0 1011 11')+'"/></svg>';};
   button.onclick=()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('chickenia_theme',document.documentElement.dataset.theme);}catch{}update();};update();tools.append(button);bar.append(tools);
  }
 }
 window.addEventListener('chickenia:shell',header);
 document.addEventListener('DOMContentLoaded',()=>{if(!document.querySelector('.area-sidebar')&&document.body.dataset.sharedStandalone==='true')AreaNavigation.mount(document.body);header();});
})();
