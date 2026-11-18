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
const products = new Map(catalog.map(item => [item.id, item]));
const consumedBy = {'MERPOL:0': ['0-0', '1-0'], 'MERPOL:1': ['2-0']};
const legacyKeys = {'MERPOL:0': 'rosti-marinado', 'MERPOL:1': 'cruji-marinado'};
const quantity = z.number().min(0).max(1000000).multipleOf(.001);
const command = z.object({
  requestId: z.string().uuid(), revision: z.number().int().nonnegative(),
  action: z.enum(['count','purchase','request','receive','dispatch','correct']),
  supplier: z.string().optional(), orderId: z.string().uuid().optional(),
  lines: z.array(z.object({id: z.string(), qty: quantity})).min(1).max(catalog.length),
  note: z.string().max(1000).optional()
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
async function load(query, day) {
  await query('CREATE TABLE IF NOT EXISTS cedis_inventory(id int PRIMARY KEY CHECK(id=1), revision int NOT NULL, data jsonb NOT NULL)');
  await paper.service(query).migrate();
  let [row] = await query('SELECT revision,data FROM cedis_inventory WHERE id=1');
  if(!row){
    await start(query,day);
    [row] = await query('SELECT revision,data FROM cedis_inventory WHERE id=1');
  }
  return row;
}
function apply(state, input, user, day) {
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
    const purchase = input.action === 'purchase';
    if(input.lines.some(({id,qty}) => !qty || (purchase ? products.get(id).supplier !== input.supplier : !products.get(id).branch))) fail('Revisa las cantidades del pedido.');
    state.orders.unshift({id:randomUUID(), type:input.action,supplier:purchase ? input.supplier : null, lines, date:day, actor:user.name, note:input.note || ''});
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
    order.movedBy = user.name;
  } else {
    if(input.lines.some(({id,qty}) => qty > order.actual[id])) fail('La recepción no puede superar lo que salió.');
    order.received = lines;
    order.correctedBy = user.name;
  }
}
async function view(query, row, day) {
  const state = row.data;
  const production = await query('SELECT data FROM production_paper_days WHERE date BETWEEN $1 AND $2 ORDER BY date',[state.day,day]);
  const branch = catalog.filter(item => item.branch).map(item => {
    const incoming = round(state.orders.filter(order => order.type === 'request' && order.actual)
      .reduce((sum, order) => sum + ((order.received || order.actual)[item.id] || 0), 0));
    const tracked = Boolean(consumedBy[item.id]);
    const used = tracked ? round(production.reduce((sum, row) => sum + consumption(row.data,item.id),0) - consumption(state.cutover,item.id)) : null;
    const opening = state.openingBranch[item.id];
    return {...item, incoming, used, balance:tracked && opening != null ? round(opening + incoming - used) : null};
  });
  return {day,revision:row.revision,catalog,cedis:state.cedis,counted:state.counted,receivedPending:state.receivedPending || {},branch,orders:state.orders};
}
async function run(query, user, body, day = today(new Date())) {
  const row = await load(query,day);
  if(!body) return view(query,row,day);
  const parsed = command.safeParse(body);
  if(!parsed.success) fail('Revisa las cantidades y vuelve a intentar.');
  const input = parsed.data;
  if(row.data.requests.includes(input.requestId)) return view(query,row,day);
  if(input.revision !== row.revision) fail('Alguien actualizó el inventario. Recarga y revisa las cantidades.',409);
  apply(row.data,input,user,day);
  if(input.action === 'count' && row.data.receivedPending){
    for(const {id} of input.lines) delete row.data.receivedPending[id];
  }
  row.data.requests.push(input.requestId);
  const [saved] = await query('UPDATE cedis_inventory SET data=$1::jsonb, revision=revision+1 WHERE id=1 AND revision=$2 RETURNING revision,data',
    [JSON.stringify(row.data),row.revision]);
  if(!saved) fail('Alguien actualizó el inventario. Recarga y revisa las cantidades.',409);
  return view(query,saved,day);
}
module.exports = {run,catalog};
