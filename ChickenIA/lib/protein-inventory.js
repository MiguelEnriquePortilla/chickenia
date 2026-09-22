'use strict';
const {z}=require('zod');
const {randomUUID}=require('node:crypto');
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
const qty=z.number().finite().min(0).max(1000000).multipleOf(.001);
const catalog=[
  {sku:'PRO-ROSTI-RAW',protein:'rosti',state:'raw',name:'Rostizado · Pollo por preparar'},
  {sku:'PRO-ROSTI-MAR',protein:'rosti',state:'marinated',name:'Rostizado · Pollos Marinados'},
  {sku:'PRO-CRUJI-RAW',protein:'cruji',state:'raw',name:'Crujiente · Pollo por preparar'},
  {sku:'PRO-CRUJI-MAR',protein:'cruji',state:'marinated',name:'Crujiente · Pollos Marinados'},
];
const names={rosti:'Rostizado',cruji:'Crujiente'};
const base={date,revision:z.number().int().nonnegative(),protein:z.enum(['rosti','cruji']),notes:z.string().trim().max(1000).default('')};
const request=z.discriminatedUnion('action',[
 z.object({...base,action:z.literal('initial'),raw:qty,marinated:qty}).strict(),
 ...['entry','marinate'].map(action=>z.object({...base,action:z.literal(action),amount:qty.positive()}).strict()),
 z.object({...base,action:z.literal('send'),amount:qty.positive(),slot:z.enum(['morning','noon','other'])}).strict(),
 z.object({...base,action:z.literal('receive'),amount:qty,shipment:z.number().int().positive()}).strict(),
 z.object({...base,action:z.literal('count'),raw:qty,marinated:qty}).strict(),
 z.object({...base,action:z.literal('rectify'),raw:qty,marinated:qty}).strict(),
 z.object({...base,action:z.literal('waste'),amount:qty.positive(),state:z.enum(['raw','marinated'])}).strict(),
]);
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const units=v=>Math.round(Number(v)*1000),decimal=v=>v/1000;
const stockKinds=['initial','entry','exit','protein-adjustment'];
const sign=m=>m.movement_type==='exit'?-1:1;
function metadata(value){try{return JSON.parse(value)||{};}catch{return {};}}
async function location(query){
 const [row]=await query("SELECT id FROM locations WHERE code='rastro' AND active=true");
 if(!row)fail('Falta configurar CEDIS / Rastro.',409);
 return row.id;
}
async function ensureCatalog(query){
 for(const item of catalog)await query("INSERT INTO inventory_items(sku,name,category,unit) VALUES($1,$2,'proteina','pollos') ON CONFLICT(sku) DO NOTHING",[item.sku,item.name]);
 const rows=await query('SELECT sku,unit,active FROM inventory_items WHERE sku=ANY($1::text[])',[catalog.map(i=>i.sku)]);
 if(rows.some(i=>i.unit!=='pollos'||!i.active))fail('El catálogo de proteínas requiere revisión; no se cambiaron unidades ni saldos.',409);
}
async function records(query){
 const locationId=await location(query);
 const items=await query('SELECT id,sku FROM inventory_items WHERE sku=ANY($1::text[])',[catalog.map(i=>i.sku)]);
 const movements=await query('SELECT *,movement_date::text AS day FROM inventory_movements WHERE location_id=$1 AND item_id=ANY($2::int[]) ORDER BY movement_date,id',[locationId,items.map(i=>i.id)]);
 const events=movements.map(m=>({...m,...catalog.find(i=>i.sku===items.find(i=>i.id===m.item_id)?.sku),meta:metadata(m.notes)}));
 if(events.some(e=>!stockKinds.concat(['protein-count','protein-received']).includes(e.movement_type)))fail('Hay movimientos de proteínas incompatibles; revisa el historial.',409);
 return {locationId,items,events,revision:events.reduce((n,e)=>Math.max(n,e.id),0)};
}
function stateAt(events,protein,state,day){
 const relevant=events.filter(e=>e.protein===protein&&e.state===state&&e.day<=day);
 const stock=relevant.filter(e=>stockKinds.includes(e.movement_type));
 const initialized=stock.some(e=>e.movement_type==='initial');
 const sum=rows=>decimal(rows.reduce((n,e)=>n+units(e.quantity)*sign(e),0));
 const current=initialized?sum(stock):null;
 const count=relevant.filter(e=>e.movement_type==='protein-count').at(-1);
 return {current,previous:initialized?sum(stock.filter(e=>e.day<day||e.movement_type==='initial')):null,
  initialDate:stock.find(e=>e.movement_type==='initial')?.day||null,
  count:count?{quantity:Number(count.quantity),expected:count.meta.expected,difference:decimal(units(count.quantity)-units(count.meta.expected)),actor:count.recorded_by,at:count.recorded_at,date:count.day,notes:count.meta.notes,
   movedSince:stock.some(e=>e.day>count.day||(e.day===count.day&&e.id>count.id))}:null};
}
function summarize(events,day){
 const rows=Object.keys(names).map(protein=>{
  const raw=stateAt(events,protein,'raw',day),marinated=stateAt(events,protein,'marinated',day);
  const daily=events.filter(e=>e.protein===protein&&e.day===day);
  const amount=(action,kind)=>decimal(daily.filter(e=>e.meta.action===action&&(!kind||e.movement_type===kind)).reduce((n,e)=>n+units(e.quantity),0));
  const correction=events.filter(e=>e.protein===protein&&e.day<=day&&e.meta.action==='rectify').at(-1);
  return {protein,name:names[protein],raw,marinated,total:raw.current===null||marinated.current===null?null:decimal(units(raw.current)+units(marinated.current)),
   entries:amount('entry'),prepared:amount('marinate','entry'),sent:amount('send'),received:amount('receive'),waste:amount('waste'),adjustment:amount('rectify'),
   correction:correction?{date:correction.day,actor:correction.recorded_by,at:correction.recorded_at,notes:correction.meta.notes,before:correction.meta.before,after:correction.meta.after}:null};
 });
 return rows;
}
function report(data,day){
 const {events,revision}=data;
 const start=new Date(day+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7);
 const week=Array.from({length:7},(_,i)=>{const d=new Date(start);d.setUTCDate(d.getUTCDate()+i);const value=d.toISOString().slice(0,10);return {date:value,rows:value<=day?summarize(events,value):null};});
 const shipments=events.filter(e=>e.meta.action==='send'&&e.day<=day).map(e=>{
  const receipt=events.find(r=>r.meta.action==='receive'&&r.meta.shipment===e.id&&r.day<=day);
  return {id:e.id,protein:e.protein,date:e.day,slot:e.meta.slot,sent:Number(e.quantity),actor:e.recorded_by,at:e.recorded_at,notes:e.meta.notes,
   receipt:receipt?{amount:Number(receipt.quantity),difference:decimal(units(receipt.quantity)-units(e.quantity)),actor:receipt.recorded_by,at:receipt.recorded_at,date:receipt.day,notes:receipt.meta.notes}:null};
 });
 return {date:day,revision,unit:'pollos',rows:summarize(events,day),week,shipments,
  pending:shipments.filter(s=>!s.receipt).length,
  history:events.filter(e=>e.day<=day&&e.day>=week[0].date).map(e=>({id:e.id,date:e.day,protein:e.protein,state:e.state,quantity:Number(e.quantity),kind:e.movement_type,...e.meta,actor:e.recorded_by,at:e.recorded_at})).reverse()};
}
async function read(query,day){date.parse(day);return report(await records(query),day);}
async function save(query,body,user){
 const d=request.parse(body);
 const allowed=['initial','rectify'].includes(d.action)?['manager']:d.action==='receive'?['manager','kitchen']:['manager','processor','dispatch'];
 if(!allowed.includes(user.role))fail('Tu cuenta no tiene permiso para este movimiento.',403);
 if(d.date>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City'}).format(new Date()))fail('No se pueden registrar movimientos futuros.');
 await query("SELECT id FROM locations WHERE code='rastro' FOR UPDATE");
 await ensureCatalog(query);
 const data=await records(query);
 if(data.revision!==d.revision)fail('El inventario cambió. Recarga y revisa antes de guardar; no se duplicó la captura.',409);
 const own=data.events.filter(e=>e.protein===d.protein),row=summarize(data.events,d.date).find(r=>r.protein===d.protein);
 if(d.action==='initial'){
  if(own.length)fail('Esta proteína ya tiene existencia inicial.',409);
 }else if(row.raw.current===null||row.marinated.current===null)fail('Gerencia debe registrar primero las existencias iniciales de esta proteína.',409);
 if(['initial','entry','marinate','send','waste'].includes(d.action)&&own.some(e=>e.movement_type==='protein-count'&&e.day>d.date))fail('Hay un conteo físico posterior. Registra el ajuste en la fecha actual para conservar esa verificación.',409);
 if(['entry','marinate','send','waste'].includes(d.action)&&own.some(e=>e.meta.action==='rectify'&&e.day>d.date))fail('Ya se rectificó el inventario después de esa fecha. Usa la fecha actual para registrar el movimiento.',409);
 if(d.action==='rectify'){
  if(d.notes.length<3)fail('Escribe el motivo de la rectificación.');
  const latest=own.at(-1)?.day;
  if(latest>d.date)fail('Ya hay registros posteriores. Selecciona una fecha desde '+latest+' y escribe cuántos pollos quedan realmente en CEDIS.',409);
  if(d.raw===row.raw.current&&d.marinated===row.marinated.current)fail('Las cantidades son iguales a las guardadas. No hay nada que rectificar.');
 }
 if(d.action==='waste'&&!d.notes)fail('Indica el motivo de la merma.');
 if(d.action==='count'&&(d.raw!==row.raw.current||d.marinated!==row.marinated.current)&&!d.notes)fail('Explica la diferencia del conteo en Observaciones.');
 if(d.action==='receive'){
  const shipment=own.find(e=>e.id===d.shipment&&e.meta.action==='send');
  if(!shipment||shipment.day>d.date)fail('El envío no existe en la fecha seleccionada.');
  if(own.some(e=>e.meta.action==='receive'&&e.meta.shipment===d.shipment))fail('Este envío ya tiene recepción confirmada.',409);
  if(units(d.amount)!==units(shipment.quantity)&&!d.notes)fail('Explica la diferencia entre lo enviado y lo recibido.');
 }
 const operation=randomUUID();
 async function add(state,kind,quantity,extra={}){
  const sku=catalog.find(i=>i.protein===d.protein&&i.state===state).sku,item=data.items.find(i=>i.sku===sku);
  const meta={action:d.action,operation,notes:d.notes,actorId:user.id,...extra};
  await query('INSERT INTO inventory_movements(item_id,location_id,movement_type,quantity,movement_date,notes,recorded_by) VALUES($1,$2,$3,$4,$5::date,$6,$7)',[item.id,data.locationId,kind,quantity,d.date,JSON.stringify(meta),user.name||user.id]);
 }
 switch(d.action){
  case 'initial':await add('raw','initial',d.raw);await add('marinated','initial',d.marinated);break;
  case 'entry':await add('raw','entry',d.amount);break;
  case 'marinate':await add('raw','exit',d.amount);await add('marinated','entry',d.amount);break;
  case 'send':await add('marinated','exit',d.amount,{slot:d.slot});break;
  case 'receive':await add('marinated','protein-received',d.amount,{shipment:d.shipment});break;
  case 'count':await add('raw','protein-count',d.raw,{expected:row.raw.current});await add('marinated','protein-count',d.marinated,{expected:row.marinated.current});break;
  case 'rectify':{
   const before={raw:row.raw.current,marinated:row.marinated.current},after={raw:d.raw,marinated:d.marinated};
   // Signed adjustments are distinct from provider entries, shipments and waste.
   // Preserve both original balances and targets; never rewrite prior movements.
   for(const state of ['raw','marinated'])await add(state,'protein-adjustment',decimal(units(after[state])-units(before[state])),{before,after});
   break;
  }
  case 'waste':await add(d.state,'exit',d.amount);break;
 }
 const next=await records(query);
 // Validate the full chronology, including future records after a backdated entry.
 for(const state of ['raw','marinated']){
  let balance=0,initial=false;
  for(const e of next.events.filter(e=>e.protein===d.protein&&e.state===state&&stockKinds.includes(e.movement_type))){
   if(e.movement_type==='initial'){if(initial)fail('Existencia inicial duplicada.',409);initial=true;}
   if(!initial)fail('El movimiento es anterior a la existencia inicial.');
   balance+=units(e.quantity)*sign(e);if(balance<0)fail('La salida supera los pollos disponibles '+(state==='raw'?'por preparar.':'marinados.'));
  }
 }
 return report(next,d.date);
}
module.exports={catalog,request,read,save,report,summarize};
