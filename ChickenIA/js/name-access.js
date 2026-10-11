'use strict';
(async()=>{
  const select=document.querySelector('#login-form select[name=username]');
  if(!select)return;
  try{
    const response=await fetch('/api/inventory?action=people');
    const data=await response.json();if(!response.ok)throw Error(data.error);
    for(const person of data.people){const option=document.createElement('option');option.value=person.id;option.textContent=person.name;select.append(option);}
  }catch(e){const host=document.querySelector('#login-error,#message');if(host)host.textContent=e.message;}
})();
