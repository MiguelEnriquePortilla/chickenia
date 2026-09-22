'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const cash=require('../lib/cash-close'),prod=require('../lib/production-daily');
const photo={format:'cierre-una-pagina-v1',sourceFile:'cierre.jpg',sourceSha256:'a'.repeat(64)};
test('photographed cash keeps combined cards, coin total and expenses separate from delivery',()=>{
  const d=cash.blank();d.photo={...photo,coinsTotal:25000,cardTotal:430000};
  for(const k of Object.keys(d.counts).filter(k=>k.startsWith('b')))d.counts[k]=0;
  d.counts.b1000=8;Object.assign(d.cash,{retained:500000,expenses:80000,firstTurn:200000,delivered:325000});
  d.payments.transfer.confirmed=100000;
  const t=cash.calculate(d);assert.equal(t.counted,825000);assert.equal(t.toDeliver,325000);assert.equal(t.deliveryPending,0);
  assert.equal(t.expenses,80000);assert.equal(t.cardTotal,430000);assert.equal(d.payments.credit.confirmed,null);
  assert.equal(t.expected,null);assert.ok(!t.missing.includes('cash.cashSales'));
  d.counts.b500=null;assert.equal(cash.calculate(d).counted,null);
});
test('three protein batches total production only and preserve unknowns and kitchen scope',()=>{
  const d=prod.blank();d.photo={...photo,deliveredBy:'',receivedBy:'',batchTimes:['08:00','14:00','']};
  const cruji=d.lines.find(r=>r.id==='freidoras-4'),rosti=d.lines.find(r=>r.id==='rosti'),costilla=d.lines.find(r=>r.id==='costilla');
  Object.assign(cruji,{previousRaw:20,receivedRaw:50,done1:80,done2:16,done3:0});
  Object.assign(rosti,{done1:10,done2:2,done3:1});Object.assign(costilla,{done1:5.5,done2:2,done3:0});
  const t=prod.calculate(d);assert.equal(t.produced['freidoras-4'],96);assert.equal(t.chickenTotal,109);assert.equal(t.costillaKg,7.5);
  assert.equal(t.active,3);assert.ok(!t.missing.some(x=>x.includes('Arroz')||x.includes('Compra:')||x.includes('plan')));
  cruji.done3=null;assert.equal(prod.calculate(d).chickenTotal,null);
  d.losses=[{productId:'costilla',state:'cocido',type:'merma',quantity:1,unit:'piezas',reason:'Daño'}];
  assert.throws(()=>prod.calculate(d),/Unidad de merma/);
});
test('photo expenses and protein totals reach reports',()=>{
  const c=cash.blank();c.photo={...photo,coinsTotal:null,cardTotal:150000};c.cash.expenses=20000;
  const p=prod.blank();p.photo={...photo,deliveredBy:'',receivedBy:'',batchTimes:['','','']};
  const text=require('../lib/daily-summary').describe({revision:1,data:c,finalized:false},{revision:1,data:p,finalized:false}).join('\n');
  assert.match(text,/Gastos de caja:.*200/);assert.match(text,/Tarjeta:.*1,500/);assert.match(text,/Pollo producido: pendiente/);
  assert.doesNotMatch(text,/Cocina: 0\/0/);
});
