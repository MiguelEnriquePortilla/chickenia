/* Shared appearance and account actions. Existing handlers remain attached. */
(()=>{
 const svg=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="${path}"/></svg>`;
 function setup(){
  const header=document.querySelector('.app-header,.inv-header,.landing');if(!header||header.querySelector('.header-tools'))return;
  const tools=document.createElement('div');tools.className='header-tools';
  const theme=document.createElement('button');theme.type='button';theme.className='theme-control';
  function update(){const dark=document.documentElement.dataset.theme==='dark';theme.innerHTML=svg(dark?'M12 8a4 4 0 100 8 4 4 0 000-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1':'M20 15A9 9 0 019 4a9 9 0 1011 11');theme.setAttribute('aria-label',dark?'Activar modo día':'Activar modo noche');theme.title=theme.getAttribute('aria-label');}
  theme.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('chickenia_theme',next);}catch{}update();});update();tools.append(theme);
  document.querySelectorAll('#theme,#menu-dark-toggle').forEach(el=>el.hidden=true);
  const oldPanel=document.querySelector('#corner-menu-panel');
  const logout=document.querySelector('#logout,#menu-logout');
  if(oldPanel||logout){const menu=document.createElement('details');menu.className='account-menu';menu.innerHTML='<summary aria-label="Opciones de la página" title="Opciones">···</summary><div></div>';const body=menu.querySelector('div');
   if(oldPanel)[...oldPanel.children].filter(el=>el.id!=='menu-dark-toggle').forEach(el=>body.append(el));
   if(logout)body.append(logout);
   menu.addEventListener('click',e=>{if(e.target.closest('button'))menu.open=false;});document.addEventListener('click',e=>{if(!menu.contains(e.target))menu.open=false;});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus();}});tools.append(menu);
  }
  document.querySelector('.corner-menu')?.setAttribute('hidden','');
  const actions=document.querySelector('.inv-header-actions');if(actions)actions.hidden=true;
  header.append(tools);
  const send=document.querySelector('#composer button');if(send){send.innerHTML=svg('M12 19V5 M5 12l7-7 7 7');send.setAttribute('aria-label','Enviar pregunta');send.title='Enviar pregunta';}
  const paths=['M12 3v18 M3 12h18 M5 5l14 14','M3 7l9-4 9 4v11l-9 4-9-4z M3 7l9 4 9-4 M12 11v11','M6 5h12v16H6z M9 3h6v4H9z','M4 20V10 M12 20V4 M20 20v-7','M4 4h16v12H9l-5 4z'];document.querySelectorAll('.menu-icon').forEach((el,i)=>el.innerHTML=svg(paths[i]));
 }
 setup();window.addEventListener('chickenia:shell',setup);
})();
