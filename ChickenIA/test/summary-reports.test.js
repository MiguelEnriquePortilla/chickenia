const {test}=require('node:test');
const assert=require('node:assert/strict');
const {build}=require('../js/summary-reports');
test('protein report preserves date, destination, quantities, missing values and private notes',()=>{
 const r={protein:'rosti',name:'Rosti',total:138,entries:0,sent:75,raw:{current:0,previous:0},marinated:{current:138,previous:213},notes:'PRIVATE',waste:0,adjustment:0};
 const data=[{inventory:'sucursal',rows:[r],week:[{date:'2026-10-28',rows:[r]}]},{inventory:'movil',unavailable:true}];
 const text=build('proteins',data,'2026-10-28','sucursal:rosti');
 assert.match(text,/28\/10\/2026/);assert.match(text,/Había: 213 pollos/);assert.match(text,/proveedor: 0/);assert.match(text,/Quedan en CEDIS: 138/);assert.doesNotMatch(text,/PRIVATE|Destino: Móvil/);
 const missing=build('proteins',[{...data[0],rows:[{...r,total:null,raw:{current:null},marinated:{current:null}}]}],'2026-10-28');assert.match(missing,/Quedan en CEDIS: Sin captura/);
});
test('evaluation and production reports distinguish unreviewed, provisional and zero',()=>{
 const text=build('evaluation',{weekly:{areas:[{code:'cocina',name:'Cocina',days:[{date:'2026-10-28',score:0,done:0,total:14}]},{code:'trastes',name:'Trastes',days:[{date:'2026-10-28',score:null}]}]}},'2026-10-28');
 assert.match(text,/0% · 0\/14/);assert.match(text,/Sin revisión/);
 assert.match(build('production',{production:{revision:0}},'2026-10-28'),/Sin captura/);
 assert.match(build('production',{production:{revision:1,totals:{active:0,pendingBatches:0,missing:[],chickenTotal:0,costillaKg:null}}},'2026-10-28'),/Borrador · Provisional/);
});
test('CEDIS report uses selected day and original units without summing products',()=>{
 const data={lines:[{id:1,name:'Ajo',unit:'kg'},{id:2,name:'Cloro',unit:'garrafa'}],days:[{date:'2026-10-28',lines:[{id:1,previous:8,entry:0,exit:2,final:6},{id:2,previous:null,entry:null,exit:null,final:null}]}]};
 const text=build('cedis',data,'2026-10-28');assert.match(text,/Quedan: 6 kg/);assert.match(text,/Sin captura garrafa/);
 assert.doesNotMatch(build('cedis',data,'2026-10-28','1'),/Cloro/);
});
