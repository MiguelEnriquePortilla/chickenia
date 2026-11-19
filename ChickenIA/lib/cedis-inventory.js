'use strict';
const { z } = require('zod');
const orders = require('../js/regular-orders-data');
const paper = require('./production-paper');
const { today } = require('./inventory-domain');
const { randomUUID } = require('node:crypto');

const catalog = Object.entries(orders.suppliers).flatMap(([supplier, lines]) =>
  lines.concat(supplier === 'PEREGRINA' ? orders.flour : []).map(([name, unit], index) => ({
    id: supplier + ':' + index, supplier, name, unit: unit || 'kg',
    place: supplier === 'MERPOL' ? 'Rastro' : 'Almacén',
    branch: supplier === 'MERPOL' ? 'Proteínas' : supplier === 'CENTRAL DE ABASTOS' ? 'Vegetales' : null
  })));
const paperOrder = require('./rastro-order');
const addedVegetables = new Set(['legacy:PAPA-GAJOS','legacy:APIO','legacy:RAS-005']);
const paperItems = new Map(paperOrder.map(([id,label,sku,name,unit])=>[id,{id,label,sku,name,unit}]));
for(const {id,name,unit} of paperItems.values()){
  if(name) catalog.push({id,name,unit,supplier:null,place:'Almacén',branch:addedVegetables.has(id)?'Vegetales':null});
}
const skuLinks = new Map(paperOrder.filter(([, ,sku])=>sku).map(([id,,sku])=>[sku,id]));
for(const [sku,id] of [['VER-007','CENTRAL DE ABASTOS:1'],['VER-010','CENTRAL DE ABASTOS:3']])skuLinks.set(sku,id);
async function legacyCatalog(query) {
  const items = await query("SELECT sku,name,unit FROM inventory_items WHERE active AND sku NOT LIKE 'PRO-%' AND sku <> 'POL-001' ORDER BY name");
  return items.filter(item=>!skuLinks.has(item.sku)).map(item=>({
    ...item,id:'legacy:'+item.sku,place:'Almacén',supplier:null,branch:null
  }));
}
const consumedBy = {'MERPOL:0': ['0-0', '1-0'], 'MERPOL:1': ['2-0']};
const legacyKeys = {'MERPOL:0': 'rosti-marinado', 'MERPOL:1': 'cruji-marinado'};
const quantity = z.number().min(0).max(1000000).multipleOf(.001);
const command = z.object({
  requestId: z.string().uuid(), revision: z.number().int().nonnegative(),
  action: z.enum(['count','purchase','request','receive','dispatch','correct']),
  supplier: z.string().optional(), orderId: z.string().uuid().optional(),
  lines: z.array(z.object({id: z.string(), qty: quantity})).min(1).max(500),
  note: z.string().max(1000).optional(),
  allocation: z.object({oven:quantity,rotisserie:quantity}).strict().optional()
}).strict();

const fail = (message, status = 400) => { throw Object.assign(Error(message), {status}); };
const round = value => Math.round(value * 1000) / 1000;
function consumption(lines, id){
  return (lines || []).filter(line => consumedBy[id].includes(line.id))
    .reduce((sum, line) => sum + (line.initial || 0) + (line.additional || 0), 0);
}

async function start(query, day) {
  const [legacy] = await query('SELECT data FROM inv_state WHERE id=1').catch(error => {
    if(error.code === '42P01') return [];
    throw error;
  });
  const proteins = await require('./protein-inventory').read(query, day);
  const almacén = await require('./rastro').read(query, day);
  const openingBranch = {}, openingCedis = {};
  for(const item of catalog){
    const protein = proteins.rows.find(row => item.id === (row.protein === 'rosti' ? 'MERPOL:0' : 'MERPOL:1'));
    if(protein?.total != null) openingCedis[item.id] = protein.total;
    const old = almacén.lines.find(line => line.name.toLowerCase() === item.name.toLowerCase() && line.unit === item.unit);
    if(old?.final != null) openingCedis[item.id] = old.final;
    const key = 'sucursal:' + legacyKeys[item.id];
    if(legacy?.data?.initialized?.[key]) openingBranch[item.id] = (legacy.data.balances[key] || 0) / 1000;
  }
  const [production] = await query('SELECT data FROM production_paper_days WHERE date=$1',[day]);
  const state = {day, cutover: production?.data || [], openingBranch, cedis: openingCedis, counted: {}, orders: [], requests: []};
  await query('INSERT INTO cedis_inventory(id,revision,data) VALUES (1,0,$1::jsonb) ON CONFLICT DO NOTHING',[JSON.stringify(state)]);
}
async function recoverAlmacen(query, row, day) {
  if(row.data.almacenRecovered) return row;
  const legacy = await require('./rastro').read(query,day);
  const state = row.data;
  const changed = new Set(Object.keys(state.counted));
  for(const order of state.orders)for(const id of Object.keys(order.actual || {}))changed.add(id);
  for(const id of Object.keys(state.receivedPending || {}))changed.add(id);
  for(const item of legacy.lines){
    const id = skuLinks.get(item.sku) || 'legacy:' + item.sku;
    if(item.final != null && !changed.has(id))state.cedis[id] = item.final;
  }
  state.almacenRecovered = true;
  const [saved] = await query('UPDATE cedis_inventory SET data=$1::jsonb,revision=revision+1 WHERE id=1 AND revision=$2 RETURNING revision,data',
    [JSON.stringify(state),row.revision]);
  if(saved)return saved;
  const [latest] = await query('SELECT revision,data FROM cedis_inventory WHERE id=1');
  return recoverAlmacen(query,latest,day);
}

async function load(query, day) {
  await query('CREATE TABLE IF NOT EXISTS cedis_inventory(id int PRIMARY KEY CHECK(id=1), revision int NOT NULL, data jsonb NOT NULL)');
  await paper.service(query).migrate();
  let [row] = await query('SELECT revision,data FROM cedis_inventory WHERE id=1');
  if(!row){
    await start(query,day);
    [row] = await query('SELECT revision,data FROM cedis_inventory WHERE id=1');
  }
  return recoverAlmacen(query,row,day);
}
function apply(state, input, user, day, products) {
  const lines = Object.fromEntries(input.lines.map(line => [line.id, line.qty]));
  if(Object.keys(lines).length !== input.lines.length || input.lines.some(line => !products.has(line.id))) fail('Revisa los productos.');
  const move = (id, delta) => {
    const known = state.cedis[id] != null;
    const available = known ? state.cedis[id] : state.receivedPending?.[id] || 0;
    const after = round(available + delta);
    if(after < 0) fail('Revisa la existencia en CEDIS de ' + products.get(id).name + '.',409);
    if(known) state.cedis[id] = after;
    else if(delta){state.receivedPending ??= {};state.receivedPending[id] = after;}
  };
  if(input.action === 'count'){
    for(const {id,qty} of input.lines){ state.cedis[id]=qty; state.counted[id]=day; }
    return;
  }
  if(input.action === 'purchase' || input.action === 'request'){
    if(input.allocation && (input.action!=='request' || round(input.allocation.oven+input.allocation.rotisserie)>(lines['MERPOL:0']||0)))
      fail('El reparto de Horno y Rosticero supera el Rostizado pedido.');
    const purchase = input.action === 'purchase';
    if(input.lines.some(({id,qty}) => !qty || (purchase ? products.get(id).supplier !== input.supplier : !paperItems.has(id)))) fail('Revisa las cantidades del pedido.');
    state.orders.unshift({id:randomUUID(), type:input.action,supplier:purchase ? input.supplier : null, lines, date:day, actor:user.name, note:input.note || '',allocation:input.allocation});
    return;
  }
  const order = state.orders.find(order => order.id === input.orderId);
  if(!order) fail('Pedido no encontrado.',404);
  const receive = input.action === 'receive';
  if((receive ? order.type !== 'purchase' : order.type !== 'request') ||
     (input.action === 'correct' ? !order.actual : order.actual) ||
     Object.keys(order.lines).length !== input.lines.length ||
     input.lines.some(({id}) => !Object.hasOwn(order.lines,id))) fail('El pedido cambió. Actualiza la página.',409);
  if(input.action !== 'correct'){
    for(const {id,qty} of input.lines){
      move(id, receive ? qty : -qty);
    }
    order.actual = lines;
    order.movementDate = day;
    order.movementAt = new Date().toISOString();
    order.movedBy = user.name;
  } else {
    if(input.lines.some(({id,qty}) => qty > order.actual[id])) fail('La recepción no puede superar lo que salió.');
    order.received = lines;
    order.correctedBy = user.name;
  }
}
async function view(query, row, day, items) {
  const state = row.data;
  const production = await query('SELECT date::text date,data FROM production_paper_days WHERE date BETWEEN $1 AND $2 ORDER BY date',[state.day,day]);
  const legacyShipments = await query(`
    SELECT DISTINCT m.id,i.sku,m.movement_date::text date,m.quantity,m.notes
      FROM inventory_movements m JOIN inventory_items i ON i.id=m.item_id
      JOIN locations l ON l.id=m.location_id
      WHERE l.code='rastro' AND m.movement_type='exit'
        AND i.sku IN ('PRO-ROSTI-MAR','PRO-CRUJI-MAR')
        AND m.movement_date BETWEEN $1 AND $2`,[state.day,day]);
  const sent=legacyShipments.filter(row=>{
    try{return JSON.parse(row.notes)?.action==='send';}catch{return false;}
  });
  const branch = items.filter(item => item.branch).map(item => {
    const sku = item.id==='MERPOL:0'?'PRO-ROSTI-MAR':item.id==='MERPOL:1'?'PRO-CRUJI-MAR':null;
    const historical = sent.filter(row=>row.sku===sku)
      .map(row=>({date:row.date,qty:Number(row.quantity),source:'history'}));
    const current = state.orders.filter(order=>order.type==='request'&&order.actual&&order.movementDate<=day)
      .map(order=>({date:order.movementDate,qty:(order.received||order.actual)[item.id]||0,source:'order'}))
      .filter(row=>row.qty);
    const arrivals=[...historical,...current].sort((a,b)=>a.date.localeCompare(b.date));
    const incoming=round(arrivals.reduce((sum,row)=>sum+row.qty,0));
    const tracked=Boolean(consumedBy[item.id]);
    const usage=tracked?production.map(row=>({date:row.date,qty:round(consumption(row.data,item.id)-(row.date===state.day?consumption(state.cutover,item.id):0))})).filter(row=>row.qty):[];
    const used=tracked?round(usage.reduce((sum,row)=>sum+row.qty,0)):null;
    const opening=state.openingBranch[item.id];
    return {...item,incoming,arrivals,used,usage,opening:opening??null,balance:tracked&&opening!=null?round(opening+incoming-used):null};
  });
  const orderCatalog = paperOrder.map(([id,label])=>({...items.find(item=>item.id===id),label}));
  return {day,revision:row.revision,catalog:items,orderCatalog,cedis:state.cedis,counted:state.counted,receivedPending:state.receivedPending || {},branch,orders:state.orders};
}
async function run(query, user, body, day = today(new Date())) {
  const row = await load(query,day);
  const items = [...new Map([...catalog,...await legacyCatalog(query)].map(item=>[item.id,item])).values()];
  const products = new Map(items.map(item=>[item.id,item]));
  if(!body) return view(query,row,day,items);
  const parsed = command.safeParse(body);
  if(!parsed.success) fail('Revisa las cantidades y vuelve a intentar.');
  const input = parsed.data;
  if(row.data.requests.includes(input.requestId)) return view(query,row,day,items);
  if(input.revision !== row.revision) fail('Alguien actualizó el inventario. Recarga y revisa las cantidades.',409);
  apply(row.data,input,user,day,products);
  if(input.action === 'count' && row.data.receivedPending){
    for(const {id} of input.lines) delete row.data.receivedPending[id];
  }
  row.data.requests.push(input.requestId);
  const [saved] = await query('UPDATE cedis_inventory SET data=$1::jsonb, revision=revision+1 WHERE id=1 AND revision=$2 RETURNING revision,data',
    [JSON.stringify(row.data),row.revision]);
  if(!saved) fail('Alguien actualizó el inventario. Recarga y revisa las cantidades.',409);
  return view(query,saved,day,items);
}

function shiftDay(day,offset){
  const date=new Date(day+'T12:00:00Z');
  date.setUTCDate(date.getUTCDate()+offset);
  return date.toISOString().slice(0,10);
}
async function history(query,range,day=today(new Date())){
  const ranges={today:0,yesterday:-1,three:-2,week:-((new Date(day+'T12:00:00Z').getUTCDay()+6)%7)};
  if(!Object.hasOwn(ranges,range))fail('Elige un periodo.');
  const from=shiftDay(day,ranges[range]);
  const to=range==='yesterday'?from:day;
  const {data:state}=await load(query,day);
  const movements=await query(`
    SELECT m.movement_date::text date,i.sku,m.movement_type kind,m.quantity,m.notes FROM inventory_movements m
    JOIN inventory_items i ON i.id=m.item_id JOIN locations l ON l.id=m.location_id
    WHERE l.code='rastro' AND m.movement_date BETWEEN $1 AND $2 ORDER BY m.movement_date DESC,m.id DESC`,[from,to]);
  const rows=[];
  const add=(date,id,kind,qty)=>{if(qty)rows.push({date,id,kind,qty:round(qty)});};
  for(const movement of movements){
    const protein=/^PRO-(ROSTI|CRUJI)-(RAW|MAR)$/.exec(movement.sku);
    if(protein){
      let action;try{action=JSON.parse(movement.notes)?.action;}catch{}
      if(action==='entry'||action==='send'){
        const id=protein[1]==='ROSTI'?'MERPOL:0':'MERPOL:1';
        add(movement.date,id,action==='entry'?'cedis-in':'cedis-out',Number(movement.quantity));
        if(action==='send')add(movement.date,id,'branch-in',Number(movement.quantity));
      }
    }else if(['entry','exit','rastro-adjustment'].includes(movement.kind)){
      const id=skuLinks.get(movement.sku)||'legacy:'+movement.sku;
      add(movement.date,id,{'entry':'cedis-in','exit':'cedis-out','rastro-adjustment':'cedis-adjust'}[movement.kind],Number(movement.quantity));
    }
  }
  for(const order of state.orders){
    if(!order.actual||order.movementDate<from||order.movementDate>to)continue;
    for(const [id,qty] of Object.entries(order.actual)){
      add(order.movementDate,id,order.type==='purchase'?'cedis-in':'cedis-out',qty);
      if(order.type==='request')add(order.movementDate,id,'branch-in',(order.received||order.actual)[id]||0);
    }
  }
  const production=await query('SELECT date::text date,data FROM production_paper_days WHERE date BETWEEN $1 AND $2',[from,to]);
  for(const row of production){
    for(const id of Object.keys(consumedBy))add(row.date,id,'branch-used',consumption(row.data,id));
  }
  const grouped=new Map();
  for(const row of rows){
    const key=[row.date,row.id,row.kind].join('|');
    const previous=grouped.get(key);
    if(previous)previous.qty=round(previous.qty+row.qty);
    else grouped.set(key,row);
  }
  return {from,to,rows:[...grouped.values()].sort((a,b)=>b.date.localeCompare(a.date))};
}

module.exports = {run,catalog,history};
