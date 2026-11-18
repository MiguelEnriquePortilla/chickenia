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
      CREATE TABLE inv_state(id int PRIMARY KEY,data jsonb);
      INSERT INTO inv_state VALUES (1,'{"initialized":{"sucursal:rosti-marinado":true},"balances":{"sucursal:rosti-marinado":10000}}');
    `);
    let state = await run(query,user,null,day);
    const save = async (action, lines, extra = {}) => {
      state = await run(query,user,{action,lines,requestId:randomUUID(),revision:state.revision,...extra},day);
      return state;
    };
    const qty = (id, qty) => ({id,qty});
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
    await save('request',[qty(rosti,75),qty(carrot,3)]);
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
  } finally { await db.close(); }
});
