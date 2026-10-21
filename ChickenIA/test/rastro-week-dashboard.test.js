'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const domain=require('../lib/protein-inventory'),view=require('../js/rastro-week-dashboard');
const row=(protein,total)=>({protein,total,raw:{previous:10,current:10},marinated:{previous:20,current:total-10},entries:5,sent:7,waste:0,adjustment:0});
test('Rastro shows seven days, split deliveries and balances, ignoring the mobile ledger',()=>{
 const report={inventory:'sucursal',rows:[row('rosti',28),row('cruji',30)],week:Array.from({length:7},(_,i)=>({date:`2026-10-${19+i}`,rows:i<=2?[row('rosti',28),row('cruji',30)]:null})),shipments:[{date:'2026-10-21',protein:'rosti',slot:'morning',sent:5},{date:'2026-10-21',protein:'rosti',slot:'noon',sent:2}],lastRecordedAt:null};
 assert.equal(view.daily(report,'2026-10-21','rosti').previous,30);
 assert.equal(view.daily(report,'2026-10-21','rosti').morning,5);
 assert.equal(view.daily(report,'2026-10-21','rosti').noon,2);
 const html=view.render([report,{inventory:'movil',rows:[row('rosti',9999)]}],'2026-10-21');
 assert.equal((html.match(/class="rw-kpi rw-kpi-/g)||[]).length,8);
 assert.equal((html.match(/scope="row"/g)||[]).length,16);
 assert(!html.includes('9999'));assert(html.includes('Posterior a la fecha consultada'));
 assert(html.includes('Salió mañana'));assert(html.includes('Salió mediodía'));
 assert(!html.includes('pd-track'));assert(html.includes('28'));
});
test('missing initialization and failed API are never represented as zero stock',()=>{
 const r={inventory:'sucursal',rows:[row('rosti',null)],week:[{date:'2026-10-21',rows:[row('rosti',null)]}],shipments:[]};
 assert.equal(view.daily(r,'2026-10-21','rosti'),null);
 assert(view.render([r],'2026-10-21').includes('Sin captura'));
 assert(view.render([{inventory:'sucursal',unavailable:true}],'2026-10-21').includes('role="alert"'));
});
test('real ledger conversion is not double counted; other shipments, losses and corrections reconcile',()=>{
 const events=[];let id=0;
 const add=(day,state,movement_type,quantity,meta)=>events.push({id:++id,day,sku:state==='raw'?'PRO-ROSTI-RAW':'PRO-ROSTI-MAR',movement_type,quantity,notes:JSON.stringify(meta)});
 add('2026-10-19','raw','initial',100,{action:'initial'});add('2026-10-19','marinated','initial',50,{action:'initial'});
 add('2026-10-20','raw','entry',20,{action:'entry'});
 add('2026-10-20','raw','exit',10,{action:'marinate'});add('2026-10-20','marinated','entry',10,{action:'marinate'});
 add('2026-10-20','marinated','exit',5,{action:'send',slot:'other'});
 add('2026-10-20','raw','exit',2,{action:'waste'});add('2026-10-20','raw','protein-adjustment',-1,{action:'rectify'});
 const report=domain.reportMovements(events,'2026-10-20'),r=view.daily(report,'2026-10-20','rosti');
 assert.equal(r.previous,150);assert.equal(r.entries,20);assert.equal(r.sent,5);assert.equal(r.other,5);assert.equal(r.total,162);
 const html=view.render([report],'2026-10-20');assert(html.includes('Otras salidas'));assert(html.includes('Rectificación'));assert(html.includes('Merma'));
});
