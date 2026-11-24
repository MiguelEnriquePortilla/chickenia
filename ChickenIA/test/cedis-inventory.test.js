'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const { run, catalog } = require('../lib/cedis-inventory');
const paper = require('../lib/production-paper');

test('one capture updates both locations and daily production changes the branch once', async () => {
  const db = new PGlite();
  const query = async (sql, params) => (await db.query(sql, params)).rows;
  const user = {name:'ANA',role:'manager'};
  const day = '2026-11-18';
  const rosti = 'MERPOL:0', cruji = 'MERPOL:1';
  const carrot = catalog.find(item => item.name === 'Zanahoria').id;
  try {
    await db.exec(`
      CREATE TABLE locations(id serial PRIMARY KEY, code text, active boolean);
      INSERT INTO locations(code,active) VALUES('rastro',true);
      CREATE TABLE inventory_items(id serial PRIMARY KEY, sku text, name text, unit text, active boolean);
      CREATE TABLE inventory_movements(id serial PRIMARY KEY,item_id int,location_id int,movement_type text,quantity numeric,movement_date date,notes text,recorded_by text,recorded_at timestamptz DEFAULT now());
      INSERT INTO inventory_items(sku,name,unit,active) VALUES ('SEC-002','Harina para crujientes','kg',true);
      INSERT INTO inventory_movements(item_id,location_id,movement_type,quantity,movement_date) VALUES (1,1,'initial',130,'2026-11-17'),(1,1,'exit',11,'2026-11-18');
      CREATE TABLE inv_state(id int PRIMARY KEY,data jsonb);
      INSERT INTO inv_state VALUES (1,'{"initialized":{"sucursal:rosti-marinado":true},"balances":{"sucursal:rosti-marinado":10000}}');
    `);
    await db.exec(`
      CREATE TABLE cedis_inventory(id int PRIMARY KEY CHECK(id=1), revision int NOT NULL, data jsonb NOT NULL);
      INSERT INTO cedis_inventory VALUES (1,0,'{"day":"2026-11-18","cutover":[],"openingBranch":{"MERPOL:0":10},"cedis":{"legacy:SEC-002":119,"PEREGRINA:19":458,"legacy:RAS-010":2},"counted":{},"orders":[],"requests":[],"almacenRecovered":true}');
    `);
    let state = await run(query,user,null,day);
    assert.equal(state.cedis['legacy:SEC-002'],119);
    assert.equal(state.cedis['PEREGRINA:19'],undefined);
    assert.equal(state.cedis['legacy:RAS-010'],undefined);
    assert.equal(state.aliases['PEREGRINA:19'],'legacy:SEC-002');
    assert.ok(state.catalog.every(item=>item.unit==='kg'||item.supplier==='MERPOL'&&item.unit==='pollos'));
    const [audit]=await query("SELECT data->'previousUnits' AS prior FROM cedis_inventory");
    assert.deepEqual(audit.prior.cedis['PEREGRINA:19'],{qty:458,unit:'bultos'});
    assert.equal(state.orderCatalog.length,23);
    const save = async (action, lines, extra = {}) => {
      state = await run(query,user,{action,lines,requestId:randomUUID(),revision:state.revision,...extra},day);
      return state;
    };
    const qty = (id, qty) => ({id,qty});
    await save('purchase',[qty('PEREGRINA:19',25)],{supplier:'PEREGRINA'});
    assert.equal(state.orders[0].lines['legacy:SEC-002'],25);
    await save('receive',[qty('legacy:SEC-002',25)],{orderId:state.orders[0].id});
    assert.equal(state.cedis['legacy:SEC-002'],144);
    const rostiInBranch = () => state.branch.find(item=>item.id===rosti);
    await save('count',[qty(rosti,50),qty(cruji,0)]);
    await save('count',[qty(carrot,0)]);
    assert.equal(state.cedis[rosti],50);
    assert.equal(state.cedis[cruji],0);
    await save('purchase',[qty(rosti,80)],{supplier:'MERPOL'});
    const receipt = {action:'receive',requestId:randomUUID(),revision:state.revision,orderId:state.orders[0].id,lines:[qty(rosti,75)]};
    state = await run(query,user,receipt,day);
    assert.equal(state.cedis[rosti],125);
    state = await run(query,user,receipt,day);
    assert.equal(state.cedis[rosti],125);
    await save('purchase',[qty(carrot,10)],{supplier:'CENTRAL DE ABASTOS'});
    await save('receive',[qty(carrot,10)],{orderId:state.orders[0].id});
    assert.equal(state.cedis[carrot],10);
    await save('request',[qty(rosti,75),qty(carrot,3)],{allocation:{oven:20,rotisserie:30}});
    assert.deepEqual(state.orders[0].allocation,{oven:20,rotisserie:30});
    const orderId = state.orders[0].id;
    await save('dispatch',[qty(rosti,75),qty(carrot,3)],{orderId});
    assert.equal(state.cedis[rosti],50);
    assert.equal(state.cedis[carrot],7);
    assert.equal(rostiInBranch().balance,85);
    assert.equal(state.branch.find(item=>item.id===carrot).balance,null);
    assert.equal(state.branch.find(item=>item.id===carrot).incoming,3);
    const lines = paper.blank();
    lines[0].initial=30;lines[1].initial=30;
    await paper.service(query).save({date:day,revision:0,lines},user.name);
    state = await run(query,user,null,day);
    assert.equal(rostiInBranch().balance,25);
    lines[1].initial=29;
    await paper.service(query).save({date:day,revision:1,lines},user.name);
    state = await run(query,user,null,day);
    assert.equal(rostiInBranch().balance,26);
    await save('correct',[qty(rosti,74),qty(carrot,3)],{orderId});
    assert.equal(rostiInBranch().balance,25);
    assert.equal(state.cedis[rosti],50);
    await db.exec(`
      INSERT INTO inventory_items(id,sku,name,unit,active) VALUES
        (100,'PRO-ROSTI-MAR','Rostizado','pollos',true);
      INSERT INTO inventory_movements (item_id,location_id,movement_type,quantity,movement_date,notes) VALUES
        (100,1,'exit',60,'2026-11-18','{"action": "send"}'),
        (100,1,'exit',90,'2026-11-18','{"action": "waste"}');
    `);
    state = await run(query,user,null,day);
    assert.equal(rostiInBranch().incoming,134);
    assert.deepEqual(rostiInBranch().arrivals.map(row=>[row.qty,row.source]),[[60,'history'],[74,'order']]);
    assert.equal(rostiInBranch().used,59);
    assert.equal(rostiInBranch().balance,85);
    const direct={action:'request-delivered',revision:state.revision,requestId:randomUUID(),
      lines:[qty(rosti,10),qty(carrot,2)],allocation:{oven:4,rotisserie:6}};
    await assert.rejects(run(query,user,{...direct,lines:[qty(carrot,2),qty(rosti,51)]},day),error=>error.status===409);
    state=await run(query,user,null,day);
    assert.equal(state.cedis[carrot],7);
    state=await run(query,user,direct,day);
    assert.equal(state.cedis[rosti],40);
    assert.equal(state.cedis[carrot],7);
    assert.equal(rostiInBranch().incoming,144);
    assert.equal(state.orders[0].receivedAtCapture,true);
    assert.deepEqual(state.orders[0].lines,state.orders[0].actual);
    const correctedOrder = state.orders[0];
    await save('amend-quantity',[qty(rosti,8)],{orderId:correctedOrder.id,note:'Se anotaron dos pollos de más'});
    assert.equal(state.cedis[rosti],42);
    assert.equal(state.branch.find(item=>item.id===rosti).incoming,142);
    assert.equal(state.orders[0].movementDate,day);
    assert.equal(state.orders[0].actual[rosti],8);
    assert.equal(state.adjustments[0].before,10);
    assert.equal(state.adjustments[0].after,8);
    await assert.rejects(save('amend-quantity',[qty(rosti,7)],{orderId:correctedOrder.id,note:' '}),error=>error.status===400);
    assert.equal(state.adjustments.length,1);
    const revision=state.revision;
    state=await run(query,user,direct,day);
    assert.equal(state.revision,revision);
    assert.equal(state.cedis[rosti],42);
    const count=state.counts.find(entry=>entry.id===rosti);
    await save('amend-count',[qty(rosti,52)],{orderId:count.captureId,note:'Recuento de la hoja'});
    assert.equal(state.cedis[rosti],44);
    assert.deepEqual([state.adjustments[0].before,state.adjustments[0].after],[50,52]);
    await assert.rejects(run(query,user,{action:'amend-count',lines:[qty(rosti,53)],orderId:count.captureId,
      note:'Fuera de la semana',revision:state.revision,requestId:randomUUID()},'2026-11-23'),error=>error.status===409);
  } finally { await db.close(); }
});
