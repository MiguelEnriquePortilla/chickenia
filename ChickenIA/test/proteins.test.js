const {test} = require('node:test');
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {freshState, applyOperation} = require('../lib/inventory-domain');
const {proteinReport} = require('../lib/protein-report');
test('protein ledger keeps residual once, separates transit and attributes physical counts', () => {
  let state=freshState(), version=0; const events=[];
  const nancy={id:'nancy',name:'Nancy',role:'manager'};
  function run(type, values, at='2026-09-11T16:00:00Z', actor=nancy) {
    const result=applyOperation(state,{id:randomUUID(),type,...values},actor,at);
    state=result.state;events.push({version:++version,data:result.event});return result.event;
  }
  run('initial',{location:'cedis',lines:[{item:'rosti-marinado',qty:100}]},'2026-09-10T16:00:00Z');
  run('initial',{location:'sucursal',lines:[{item:'rosti-marinado',qty:0}]},'2026-09-10T16:00:00Z');
  const request=run('request',{due:'2026-09-11',lines:[{item:'rosti-marinado',qty:20}]});
  const sent=run('send',{request:request.id,lines:[{item:'rosti-marinado',qty:20}]});
  run('receive',{request:request.id,shipment:sent.id,lines:[{item:'rosti-marinado',qty:15}],note:'Faltan cinco'});
  run('count',{location:'sucursal',lines:[{item:'rosti-marinado',qty:14}],moment:'apertura',note:'Diferencia detectada'});
  run('count',{location:'cedis',lines:[{item:'rosti-marinado',qty:80}],moment:'durante'},'2026-09-11T16:00:01Z',{id:'miguel',name:'Miguel',role:'manager'});
  const report=proteinReport({version,data:state},events.filter(e=>e.data.date==='2026-09-11'),'2026-09-11');
  const rastro=report.rows.find(r=>r.location==='cedis'&&r.item==='rosti-marinado');
  assert.equal(rastro.previous,100000);assert.equal(rastro.current,80000);assert.equal(rastro.exits,20000);
  assert.equal(report.transit[0].quantity,5000);
  const branch=report.rows.find(r=>r.location==='sucursal'&&r.item==='rosti-marinado');
  assert.equal(branch.current,15000);assert.equal(branch.previous,0);assert.equal(branch.entries,15000);
  assert.equal(branch.verification.quantity,14000);assert.equal(branch.verification.difference,-1000);
  assert.equal(report.nancy.verified,1);assert.equal(report.nancy.receiptsToday,1);
  assert.equal(report.unresolved.length,1);
  assert.equal(events.at(-2).data.deltas.length,0,'count is not another stock entry');
});
