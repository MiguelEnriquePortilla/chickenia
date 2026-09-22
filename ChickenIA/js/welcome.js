'use strict';
(()=>{
 const screen=document.getElementById('chicken-welcome'),home=document.getElementById('chicken-home');
 if(!screen||!home)return;
 const mascot=screen.querySelector('img'),skip=screen.querySelector('button');
 let finished=false,started=false,displayTimer;
 function finish(){
  if(finished)return;finished=true;
  clearTimeout(displayTimer);clearTimeout(failsafe);
  const moveFocus=screen.contains(document.activeElement);
  screen.hidden=true;home.inert=false;home.removeAttribute('aria-hidden');document.body.classList.remove('welcome-active');
  if(moveFocus)home.querySelector('a')?.focus({preventScroll:true});
 }
 // Never leave an unavailable image or slow connection blocking the app.
 const failsafe=setTimeout(finish,4500);
 async function ready(){
  if(started||finished)return;started=true;
  try{if(mascot.decode)await mascot.decode();}catch{return finish();}
  if(finished)return;
  screen.dataset.ready='true';displayTimer=setTimeout(finish,2000);
 }
 screen.hidden=false;home.inert=true;home.setAttribute('aria-hidden','true');document.body.classList.add('welcome-active');
 skip.addEventListener('click',finish);
 mascot.addEventListener('load',ready,{once:true});mascot.addEventListener('error',finish,{once:true});
 if(mascot.complete){if(mascot.naturalWidth)ready();else finish();}
 // Browser Back/Forward and a warm resume must not revive a blocked home screen.
 window.addEventListener('pagehide',finish,{once:true});
 window.addEventListener('pageshow',event=>{if(event.persisted)finish();});
})();
