'use strict';
(()=>{
 const arrow='M19 12H5 M11 6l-6 6 6 6',home='M3 10l9-7 9 7 M5 9v12h14V9 M9 21v-8h6v8';
 document.querySelectorAll('#back,header>a[href="/"],.points-header>a[href="/index.html"]').forEach(a=>{
  const isHome=['/','/index.html'].includes(a.getAttribute('href'));
  const label=isHome?'Inicio':a.textContent.replace(/^[←\s]+/,'').replace('Supervisión y Asistencia','Supervisión');
  a.classList.add('nav-return');a.replaceChildren();
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.6');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',isHome?home:arrow);svg.append(path);a.append(svg,document.createTextNode(label));
 });
})();
