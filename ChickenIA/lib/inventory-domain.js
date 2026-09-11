'use strict';

// Quantities are stored as integer thousandths, never floating-point balances.
const SCALE = 1000;
class InventoryError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const fail = (message, status) => { throw new InventoryError(message, status); };
const roles = {
  purchaseRequest: ['kitchen','manager'], approvePurchase: ['dispatch','manager'],
  initial: ['manager'], supplier: ['manager'], request: ['kitchen', 'manager'],
  send: ['dispatch', 'manager'], receive: ['manager'], transitReturn: ['manager'],
  prepare: ['processor', 'manager'], cook: ['manager'], sale: ['manager'],
  count: ['manager'], reconcile: ['manager'], catalog: ['manager'],
  consume: ['manager'], reverse: ['manager'], closeRequest: ['manager'], transform: ['manager'], purchase: ['dispatch','manager'],
  opening: ['processor', 'manager'],
};
const LOCATIONS = ['cedis', 'sucursal'];
const initialItems = [
  ['pollo-enhielado', 'Pollo enhielado', 'pollos', 'Rastro · Enhielado', 1000, 'raw'],
  ['rosti-marinado', 'ROSTI marinado', 'pollos', 'Rastro · Marinado', 1000, 'raw'],
  ['cruji-marinado', 'CRUJI marinado', 'pollos', 'Rastro · Marinado', 1000, 'raw'],
  ['rosti-cocinado', 'ROSTI cocinado', 'pollos', 'Sucursal · Cocción', 250, 'finished'],
  ['cruji-cocinado', 'CRUJI cocinado', 'piezas', 'Sucursal · Cocción', 1000, 'finished'],
  ['brocoli', 'Brócoli', 'piezas', 'Almacén · Vegetales', 1000, 'supply'],
  ['cebolla', 'Cebolla mediana', 'kg', 'Almacén · Seco', 1, 'supply'],
  ['jalapeno', 'Jalapeño / serrano', 'porciones', 'Almacén · Vegetales', 1000, 'supply'],
  ['jitomate', 'Jitomate', 'bolsas', 'Almacén · Vegetales', 1000, 'supply'],
  ['morron', 'Morrón', 'piezas', 'Almacén · Vegetales', 1000, 'supply'],
  ['nopal', 'Nopales', 'porciones', 'Almacén · Vegetales', 500, 'supply'],
  ['papa-cambray', 'Papa cambray', 'porciones', 'Almacén · Seco', 1000, 'supply'],
  ['papa-gajos', 'Papa gajos', 'porciones', 'Almacén · Seco', 1000, 'supply'],
  ['perejil', 'Perejil', 'porciones', 'Almacén · Seco', 1000, 'supply'],
  ['zanahoria', 'Zanahoria', 'porciones', 'Almacén · Vegetales', 1000, 'supply'],
  ['harina', 'Harina para CRUJI', 'bultos', 'Almacén · Seco', 1000, 'supply'],
  ['arroz', 'Arroz', 'bultos', 'Almacén · Seco', 1000, 'supply'],
  ['sal', 'Sal', 'bultos', 'Almacén · Seco', 1000, 'supply'],
  ['ajos', 'Ajos', 'bolsas', 'Almacén · Seco', 1000, 'supply'],
  ['col', 'Col', 'piezas', 'Almacén · Vegetales', 1000, 'supply'],
  ['agua', 'Agua', 'garrafones', 'Almacén · Seco', 1000, 'supply'],
  ['soya', 'Salsa de soya', 'envases', 'Almacén · Seco', 1000, 'supply'],
  ['cloro', 'Cloro', 'garrafas', 'Almacén · Limpieza', 1000, 'supply'],
  ['jabon', 'Jabón', 'bolsas', 'Almacén · Limpieza', 1000, 'supply'],
  ['bote-basura', 'Bote de basura', 'piezas', 'Almacén · Limpieza', 1000, 'equipment'],
];
function freshState() {
  return {
    schema: 1, items: initialItems.map(([id, name, unit, area, step, kind]) => ({ id, name, unit, area, step, kind })).concat(require('./kitchen-items')),
    balances: {}, initialized: {}, lastMoved: {}, requests: [], purchases: [], counts: [], openings: {},
  };
}
function text(value, label, max = 500, required = true) {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) fail(`${label}: texto inválido.`);
  return value.trim();
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail('Fecha inválida.');
  return value;
}
function today(now) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now)); }
function quantity(value, item, allowZero = true) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') fail(`Captura ${item.name}; vacío no es cero.`);
  const n = Number(value), scaled = Math.round(n * SCALE);
  if (!Number.isFinite(n) || n < 0 || n > 1000000 || Math.abs(n * SCALE - scaled) > 1e-6 || scaled % item.step || (!allowZero && !scaled)) fail(`Cantidad inválida para ${item.name} (${item.unit}).`);
  return scaled;
}
function getItem(state, id) { return state.items.find(i => i.id === id) || fail('Artículo desconocido.'); }
function getLocation(id) { return LOCATIONS.includes(id) ? id : fail('Ubicación inválida.'); }
function key(location, item) { return `${location}:${item}`; }
function balance(state, location, item) { return state.balances[key(location, item)] || 0; }
function checkedLines(state, input) {
  if (!Array.isArray(input) || !input.length || input.length > 200) fail('Incluye entre 1 y 200 artículos.');
  const ids = new Set();
  return input.map(row => {
    const item = getItem(state, row.item);
    if (ids.has(item.id)) fail('Un artículo no puede repetirse.');
    ids.add(item.id);
    return { item: item.id, qty: quantity(row.qty, item) };
  });
}
const recipes = {
  rosti: { location: 'cedis', from: 'pollo-enhielado', to: 'rosti-marinado', factor: 1, action: 'prepare' },
  cruji: { location: 'cedis', from: 'pollo-enhielado', to: 'cruji-marinado', factor: 1, action: 'prepare' },
  rostizar: { location: 'sucursal', from: 'rosti-marinado', to: 'rosti-cocinado', factor: 1, action: 'cook' },
  freir: { location: 'sucursal', from: 'cruji-marinado', to: 'cruji-cocinado', factor: 8, action: 'cook' },
};
const OPENING_TASKS = {
  sucursal: ['Levantar cortinas', 'Acomodar barras para recepción', 'Bajar lonas frontales', 'Colocar menú', 'Verificar espacio de apertura'],
  cedis: ['Verificar cámara de pollo enhielado', 'Verificar cámara de marinado y rotación FIFO', 'Preparar espacio y equipo de procesamiento'],
};

function applyOperation(original, command, actor, now = new Date().toISOString()) {
  if (!command || typeof command !== 'object' || !roles[command.type]) fail('Operación desconocida.');
  if (!roles[command.type].includes(actor.role)) fail('Tu cuenta no puede realizar esta operación.', 403);
  const state = structuredClone(original), type = command.type;
  const note = text(command.note ?? '', 'Observación', 1000, false);
  const event = { id: command.id, type, actor: { id: actor.id, name: actor.name, role: actor.role }, at: now, date: today(now), note, deltas: [], detail: {} };
  function move(location, item, delta, initializing = false) {
    const k = key(location, item);
    if (!initializing && !state.initialized[k]) fail(`Falta saldo inicial: ${getItem(state, item).name} en ${location}.`);
    const next = balance(state, location, item) + delta;
    if (!Number.isSafeInteger(next) || next < 0) fail(`Saldo insuficiente: ${getItem(state, item).name} en ${location}.`, 409);
    state.balances[k] = next;
    if (delta) {
      state.lastMoved ||= {}; state.lastMoved[k] = command.id;
      event.deltas.push({ location, item, qty: delta });
    }
  }
  if (type === 'purchaseRequest') {
    const supplier=text(command.supplier,'Proveedor',100), due=date(command.due), location=getLocation(command.location);
    if(due<event.date)fail('La compra debe programarse para hoy o una fecha futura.');
    if(!['local','foraneo'].includes(command.supplierType))fail('Tipo de proveedor inválido.');
    if(typeof command.urgent!=='boolean')fail('Indica si la compra es urgente.');
    if(command.urgent&&!note)fail('Explica por qué no puede esperar a la compra semanal.');
    const lines=checkedLines(state,command.lines).filter(l=>l.qty>0);
    if(!lines.length)fail('Indica al menos un artículo para comprar.');
    const request={id:command.id,supplier,due,location,supplierType:command.supplierType,urgent:command.urgent,lines,note,status:'requested',actor:actor.name,at:now};
    state.purchaseRequests ||= [];state.purchaseRequests.push(request);event.detail=request;
  } else if(type==='approvePurchase') {
    if(!['lilian','miguel'].includes(actor.id))fail('La compra requiere autorización de Lilian o Miguel.',403);
    const request=state.purchaseRequests?.find(r=>r.id===command.request);
    if(!request||request.status!=='requested')fail('Solicitud inexistente o ya autorizada.',409);
    const purchase={id:command.id,supplier:request.supplier,lines:request.lines,received:[],at:now,actor:actor.name,location:request.location,due:request.due,request:request.id,urgent:request.urgent};
    state.purchases ||= [];state.purchases.push(purchase);request.status='approved';request.purchase=purchase.id;request.approvedAt=now;request.approvedBy=actor.name;event.detail=purchase;
  } else if (type === 'purchase') {
    const supplier = text(command.supplier,'Proveedor',100);
    const lines = checkedLines(state,command.lines).filter(l=>l.qty>0);
    if (!lines.length) fail('Indica cantidades del pedido.');
    const purchase = {id:command.id,supplier,lines,received:[],at:now,actor:actor.name};
    state.purchases ||= []; state.purchases.push(purchase); event.detail = purchase;
  } else if (['initial', 'supplier', 'consume'].includes(type)) {
    const location = getLocation(command.location), lines = checkedLines(state, command.lines);
    if(type==='supplier'){
      const purchase=state.purchases?.find(p=>p.id===command.purchase);
      if(!purchase)fail('Selecciona el pedido validado por Lilian.');
      if(location!==(purchase.location||'cedis'))fail('Recibe en la ubicación autorizada en la orden.');
      if(purchase.request){
        const receipt=text(command.receipt,'Comprobante',150);
        const amount=Number(command.amount);if(command.amount==null||command.amount===''||!Number.isFinite(amount)||amount<0||amount>10000000||Math.abs(amount*100-Math.round(amount*100))>1e-6)fail('Importe de compra inválido.');
        if(!['caja','banco','otro'].includes(command.paymentSource))fail('Indica el origen del pago.');
        purchase.receipts ||= [];purchase.receipts.push({id:command.id,at:now,actor:actor.name,receipt,amount,paymentSource:command.paymentSource,note});
      }
      for(const line of lines){
        const requested=purchase.lines.find(l=>l.item===line.item)?.qty;
        const previous=purchase.received.find(l=>l.item===line.item);
        if(requested===undefined||line.qty+(previous?.qty||0)>requested)fail('La recepción supera el pedido autorizado.');
        if(previous)previous.qty+=line.qty;else purchase.received.push({...line});
      }
    }
    if (type !== 'initial' && !note) fail('Registra referencia o motivo.');
    for (const line of lines) {
      const k = key(location, line.item), item = getItem(state, line.item);
      if (type === 'initial') {
        if (state.initialized[k]) fail('Ese artículo ya tiene saldo inicial.', 409);
        state.initialized[k] = now;
      }
      if (type === 'consume' && item.kind !== 'supply') fail('El consumo corresponde a insumos; usa producción o ventas para pollo.');
      move(location, line.item, type === 'consume' ? -line.qty : line.qty, type === 'initial');
    }
    event.detail = { location, lines, ...(type==='supplier'?{purchase:command.purchase}:{}), ...(type==='supplier'&&state.purchases.find(p=>p.id===command.purchase)?.request?{receipt:command.receipt,amount:Number(command.amount),paymentSource:command.paymentSource}:{}) };
  } else if (type === 'request') {
    const due = date(command.due);
    if (due < event.date) fail('La solicitud debe ser para hoy o una fecha futura.');
    const lines = checkedLines(state, command.lines).filter(l => l.qty > 0);
    if (!lines.length) fail('Solicita al menos un artículo.');
    const request = { id: command.id, due, createdAt: now, actor: actor.name, status: 'open', lines, shipments: [] };
    state.requests.push(request); event.detail = request;
  } else if (['send', 'receive', 'transitReturn', 'closeRequest'].includes(type)) {
    const request = state.requests.find(r => r.id === command.request);
    if (!request) fail('Solicitud no encontrada.', 404);
    if (request.status === 'closed') fail('La solicitud está cerrada.', 409);
    if (type === 'send') {
      const lines = checkedLines(state, command.lines).filter(l => l.qty > 0);
      if (!lines.length) fail('Indica una cantidad para enviar.');
      for (const line of lines) {
        const requested = request.lines.find(l => l.item === line.item);
        if (!requested) fail('El artículo no forma parte de la solicitud.');
        const already = request.shipments.reduce((sum, s) => sum + (s.lines.find(l => l.item === line.item)?.qty || 0) - (s.returned?.find(l => l.item === line.item)?.qty || 0), 0);
        if (already + line.qty > requested.qty) fail('El envío supera lo pendiente de la solicitud.');
        move('cedis', line.item, -line.qty);
      }
      request.shipments.push({ id: command.id, at: now, actor: actor.name, carrier: 'Eliseo', lines, received: [], returned: [] });
      event.detail = { request: request.id, lines, carrier: 'Eliseo' };
    } else if (type === 'closeRequest') {
      if (!note) fail('Indica el motivo del cierre.');
      if (request.shipments.some(s => s.lines.some(l => l.qty !== (s.received.find(r => r.item === l.item)?.qty || 0) + (s.returned.find(r => r.item === l.item)?.qty || 0)))) fail('Resuelve el inventario en tránsito antes de cerrar.');
      request.status = 'closed'; request.closedAt = now; event.detail = { request: request.id };
    } else {
      const shipment = request.shipments.find(s => s.id === command.shipment);
      if (!shipment) fail('Envío no encontrado.');
      const lines = checkedLines(state, command.lines);
      let total = 0;
      for (const line of lines) {
        const sent = shipment.lines.find(l => l.item === line.item);
        if (!sent) fail('Artículo no enviado.');
        const received = shipment.received.find(l => l.item === line.item)?.qty || 0;
        const returned = shipment.returned.find(l => l.item === line.item)?.qty || 0;
        const remaining = sent.qty - received - returned;
        if (line.qty > remaining) fail('La cantidad supera el saldo de este envío.', 409);
        if ((type === 'transitReturn' || line.qty !== remaining) && !note) fail('Describe la diferencia o devolución.');
        total += line.qty;
        move(type === 'receive' ? 'sucursal' : 'cedis', line.item, line.qty);
        const target = type === 'receive' ? shipment.received : shipment.returned;
        const existing = target.find(l => l.item === line.item);
        if (existing) existing.qty += line.qty; else target.push({ ...line });
      }
      if (!total) fail('La recepción o devolución debe incluir una cantidad positiva.');
      event.detail = { request: request.id, shipment: shipment.id, lines };
    }
  } else if (type === 'prepare' || type === 'cook') {
    const recipe = recipes[command.recipe];
    if (!recipe || recipe.action !== type) fail('Proceso inválido.');
    const qty = quantity(command.qty, getItem(state, recipe.from), false);
    move(recipe.location, recipe.from, -qty); move(recipe.location, recipe.to, qty * recipe.factor);
    event.detail = { recipe: command.recipe, input: qty, output: qty * recipe.factor };
  } else if (type === 'transform') {
    const location=getLocation(command.location);
    const inputs=checkedLines(state,command.inputs),outputs=checkedLines(state,command.outputs);
    if(!note)fail('Describe la preparación y su rendimiento real.');
    if(inputs.some(l=>!l.qty)||outputs.some(l=>!l.qty))fail('Indica cantidades positivas.');
    if(outputs.some(o=>inputs.some(i=>i.item===o.item)))fail('Entrada y producto obtenido deben ser distintos.');
    for(const line of inputs){if(getItem(state,line.item).kind==='equipment')fail('El equipo no se consume en producción.');move(location,line.item,-line.qty);}
    for(const line of outputs){if(getItem(state,line.item).kind==='equipment')fail('No se produce equipo.');move(location,line.item,line.qty);}
    event.detail={location,inputs,outputs};
  } else if (type === 'sale') {
    const presentations = { entero: ['rosti-cocinado', 1000], medio: ['rosti-cocinado', 500], cuarto: ['rosti-cocinado', 250], pieza: ['cruji-cocinado', 1000], crujiEntero: ['cruji-cocinado', 8000] };
    let presentation = presentations[command.presentation];
    if (command.presentation === 'article') {
      const article = getItem(state, command.item);
      if (article.kind !== 'finished') fail('Solo se vende producto terminado.');
      const amount = quantity(command.qty,article,false);
      if (!['sale','courtesy'].includes(command.kind)) fail('Tipo inválido.');
      if (command.kind==='courtesy'&&!note) fail('Registra el motivo de la cortesía.');
      move('sucursal',article.id,-amount);
      event.detail={item:article.id,qty:amount,unit:article.unit,kind:command.kind};
      return {state,event};
    }
    if (!presentation) fail('Presentación desconocida.');
    const qty = Number(command.qty);
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > 1000000) fail('Captura un número entero de presentaciones.');
    if (!['sale', 'courtesy'].includes(command.kind)) fail('Tipo de salida inválido.');
    if (command.kind === 'courtesy' && !note) fail('Registra el motivo de la cortesía.');
    move('sucursal', presentation[0], -presentation[1] * qty);
    event.detail = { presentation: command.presentation, qty, kind: command.kind };
  } else if (type === 'count') {
    const location = getLocation(command.location), lines = checkedLines(state, command.lines);
    if (lines.some(l => !state.initialized[key(location, l.item)])) fail('Carga los saldos iniciales antes del conteo.');
    const counted = lines.map(l => ({ ...l, expected: balance(state, location, l.item), stamp: state.lastMoved?.[key(location,l.item)] || null }));
    const different = counted.some(l => l.qty !== l.expected);
    if (different && !note) fail('Describe la diferencia de conteo.');
    if (command.moment && !['apertura', 'durante', 'cierre'].includes(command.moment)) fail('Momento de verificación inválido.');
    const count = { id: command.id, location, at: now, actor: actor.name, actorId: actor.id, moment: command.moment || null, lines: counted, status: different ? 'pending' : 'matched', note };
    state.counts.push(count); event.detail = count;
  } else if (type === 'reconcile') {
    const count = state.counts.find(c => c.id === command.count);
    if (!count || count.status !== 'pending') fail('Conteo no pendiente.', 409);
    if (!note) fail('Registra el motivo de la conciliación.');
    // A physical count cannot be used to overwrite movements recorded afterwards.
    if (count.lines.some(l => balance(state, count.location, l.item) !== l.expected || (state.lastMoved?.[key(count.location,l.item)] || null) !== l.stamp)) fail('Hubo movimientos después del conteo. Realiza un conteo nuevo.', 409);
    for (const line of count.lines) move(count.location, line.item, line.qty - line.expected);
    count.status = 'reconciled'; count.resolvedAt = now; count.resolvedBy = actor.name;
    event.detail = { count: count.id, lines: count.lines };
  } else if (type === 'reverse') {
    // The repository supplies an authenticated, immutable event; never trust a client delta.
    const target = command._target;
    if (!target || !['sale', 'prepare', 'cook', 'supplier', 'consume','transform'].includes(target.type)) fail('Ese registro no admite reversión.');
    if (!note) fail('Describe la corrección.');
    for (const delta of [...target.deltas].reverse()) move(delta.location, delta.item, -delta.qty);
    if(target.type==='supplier'){
      const purchase=state.purchases?.find(p=>p.id===target.detail.purchase);
      if(!purchase)fail('Pedido de origen no disponible.');
      for(const receipt of purchase.receipts||[])if(receipt.id===target.id){receipt.reversedAt=now;receipt.reversedBy=actor.name;}
      for(const line of target.detail.lines){const received=purchase.received.find(l=>l.item===line.item);if(!received||received.qty<line.qty)fail('Recepción ya corregida.');received.qty-=line.qty;}
    }
    event.detail = { reverses: target.id };
  } else if (type === 'catalog') {
    const name = text(command.name, 'Nombre', 100), unit = text(command.unit, 'Unidad', 40), area = text(command.area, 'Área', 100);
    const kind = ['supply', 'equipment', 'finished'].includes(command.kind) ? command.kind : fail('Categoría inválida.');
    if (![1, 250, 500, 1000].includes(command.step)) fail('Precisión inválida.');
    if (state.items.some(i => i.name.toLocaleLowerCase() === name.toLocaleLowerCase())) fail('El artículo ya existe.');
    const item = { id: command.id, name, unit, area, step: command.step, kind };
    state.items.push(item); event.detail = item;
  } else if (type === 'opening') {
    const location = getLocation(command.location), tasks = OPENING_TASKS[location];
    if (!Array.isArray(command.done) || command.done.some(i => !Number.isInteger(i) || i < 0 || i >= tasks.length)) fail('Actividad inválida.');
    state.openings[`${event.date}:${location}`] = { done: [...new Set(command.done)], actor: actor.name, at: now };
    event.detail = { location, done: command.done };
  }
  // Keep the working snapshot bounded; immutable full records remain in inv_events.
  state.requests = [...state.requests.filter(r => r.status === 'open'), ...state.requests.filter(r => r.status === 'closed').slice(-50)];
  state.counts = [...state.counts.filter(c => c.status === 'pending'), ...state.counts.filter(c => c.status !== 'pending').slice(-50)];
  state.openings = Object.fromEntries(Object.entries(state.openings).slice(-60));
  return { state, event };
}
module.exports = { freshState, applyOperation, InventoryError, roles, recipes, OPENING_TASKS, today, SCALE };
