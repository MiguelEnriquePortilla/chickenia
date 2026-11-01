const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {build}=require('../js/summary-reports');
const summary=require('../js/protein-summary');
const row={protein:'rosti',name:'Rostizado',total:12,entries:2,sent:3,raw:{current:4,previous:5},marinated:{current:8,previous:8}};
const reports=[{inventory:'sucursal',date:'2026-11-01',rows:[row],week:[]},{inventory:'movil',date:'2026-11-01',rows:[{...row,total:999}],week:[]}];
test('daily cards and their share source exclude Mobile while keeping Sucursal',()=>{
 const host={innerHTML:''};let shared;
 const window={ChickenProteinDashboard:{daily:()=>null},ChickenRastroView:{},DashboardReports:{set:(_type,data)=>shared=data}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/dashboard-cards'),'utf8'),{window});
 window.ChickenProteinDashboard.mount(host,reports,'2026-11-01');
 assert.match(host.innerHTML,/Sucursal/);assert.match(host.innerHTML,/12/);
 assert.doesNotMatch(host.innerHTML,/Móvil|movil|999/);assert.deepEqual(shared,[reports[0]]);
});
test('WhatsApp and report lines omit Mobile even if older clients supply both ledgers',()=>{
 const text=build('proteins',reports,'2026-11-01');
 assert.match(text,/Sucursal/);assert.doesNotMatch(text,/Móvil|999/);
 const lines=summary.lines(summary.summarize(reports)).join('\n');
 assert.match(lines,/SUCURSAL/);assert.doesNotMatch(lines,/MÓVIL|999/);
});
test('location picker hides only Mobile and preserves other active locations',async()=>{
 const rows=[{id:1,code:'jojutla',type:'tienda'},{id:2,code:'moto-1',type:'moto'},{id:3,code:'rastro',type:'cedis'},{id:4,code:'almacen',type:'almacen'}];
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../api/locations'),'utf8'),{module,require:()=>({ensureTables:async()=>async()=>rows})});
 let result;const res={status(code){assert.equal(code,200);return this;},json(data){result=data;}};
 await module.exports({},res);
 assert.deepEqual(result,[rows[0],rows[2],rows[3]]);assert.equal(rows.length,4);
});
