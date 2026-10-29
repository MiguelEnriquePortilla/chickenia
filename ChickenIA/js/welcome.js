'use strict';
(()=>{
 const screen=document.getElementById('chicken-welcome'),home=document.getElementById('chicken-home');
 if(!screen||!home)return;
 let internal=false;
 try{const stamp=Number(sessionStorage.getItem('chickenia_internal_home'));sessionStorage.removeItem('chickenia_internal_home');internal=stamp>0&&Date.now()-stamp<15000;}catch{}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(internal||reduced.matches){document.documentElement.classList.remove('welcome-pending');return;}
 const mascot=screen.querySelector('img'),skip=screen.querySelector('button');
 let finished=false,started=false,displayTimer,exitTimer;
 function finish(){
  if(finished)return;finished=true;
  clearTimeout(displayTimer);clearTimeout(exitTimer);clearTimeout(failsafe);
  const moveFocus=screen.contains(document.activeElement);
  document.documentElement.classList.remove('welcome-pending');screen.hidden=true;home.inert=false;home.removeAttribute('aria-hidden');document.body.classList.remove('welcome-active');
  if(moveFocus)home.querySelector('a')?.focus({preventScroll:true});
 }
 function exit(){if(finished||screen.hasAttribute('data-exiting'))return;screen.dataset.exiting='true';exitTimer=setTimeout(finish,180);}
 // Slow or unavailable artwork must never block the operational home.
 const failsafe=setTimeout(finish,5000);
 async function ready(){
  if(started||finished)return;started=true;
  try{if(mascot.decode)await mascot.decode();}catch{return finish();}
  if(finished)return;
  screen.dataset.ready='true';displayTimer=setTimeout(exit,3500);
 }
 screen.hidden=false;home.inert=true;home.setAttribute('aria-hidden','true');document.body.classList.add('welcome-active');
 skip.addEventListener('click',finish);
 screen.addEventListener('keydown',event=>{if(event.key==='Escape')finish();});
 reduced.addEventListener('change',event=>{if(event.matches)finish();});
 mascot.addEventListener('load',ready,{once:true});mascot.addEventListener('error',finish,{once:true});
 if(mascot.complete){if(mascot.naturalWidth)ready();else finish();}
 window.addEventListener('pagehide',finish,{once:true});
 window.addEventListener('pageshow',event=>{if(event.persisted)finish();});
})();
