'use strict';
const {z}=require('zod');
const skus=['VER-001','VER-002','VER-003','VER-005','VER-006','VER-007','VER-008','VER-009','VER-010','SEC-001','SEC-002','COND-001','COND-002',...Array.from({length:12},(_,i)=>'RAS-'+String(i+1).padStart(3,'0'))];
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
const qty=z.number().finite().min(0).max(1000000).multipleOf(0.001);
const request=z.object({date,revision:z.number().int().nonnegative(),lines:z.array(z.object({itemId:z.number().int().positive(),initial:qty.optional(),entry:qty.optional(),exit:qty.optional()}).strict()).min(1).max(30),notes:z.string().trim().max(1000).default(''),deliveredBy:z.string().trim().max(200).default(''),receivedBy:z.string().trim().max(200).default('')}).strict();
const correctionRequest=z.object({action:z.literal('rectify'),date,revision:z.number().int().nonnegative(),itemId:z.number().int().positive(),quantity:qty,notes:z.string().trim().max(1000)}).strict();
const kinds=['initial','entry','exit','rastro-adjustment'];
const units=v=>Math.round(Number(v)*1000);
function note(value){try{return JSON.parse(value)||{};}catch{return {};}}
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
function validateDay(day){if(day>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City'}).format(new Date()))fail('No se pueden registrar movimientos futuros.');}
async function read(query,day){
  date.parse(day);
  const [location]=await query("SELECT id FROM locations WHERE code='rastro' AND active=true");
  if(!location)fail('Falta configurar la ubicación Rastro.',409);
  const items=await query('SELECT id,sku,name,unit FROM inventory_items WHERE active=true AND sku=ANY($1::text[]) ORDER BY name',[skus]);
  const movements=await query('SELECT *,movement_date::text AS day FROM inventory_movements WHERE location_id=$1 AND item_id=ANY($2::int[]) ORDER BY movement_date,id',[location.id,items.map(i=>i.id)]);
  for(const movement of movements)movement.movement_date=movement.day;
  if(movements.some(m=>!kinds.includes(m.movement_type)))fail('Rastro tiene movimientos de otro formato. Revisa el historial antes de continuar.',409);
  const revision=movements.reduce((n,m)=>Math.max(n,m.id),0);
  const linesAt=day=>items.map(item=>{
    const all=movements.filter(m=>m.item_id===item.id),initial=all.find(m=>m.movement_type==='initial');
    const relevant=all.filter(m=>String(m.movement_date).slice(0,10)<=day);
    const known=!!initial&&String(initial.movement_date).slice(0,10)<=day;
    const amount=kind=>relevant.filter(m=>m.movement_type===kind).reduce((n,m)=>n+Math.round(Number(m.quantity)*1000),0);
    const onDay=kind=>relevant.filter(m=>m.movement_type===kind&&String(m.movement_date).slice(0,10)===day).reduce((n,m)=>n+Math.round(Number(m.quantity)*1000),0)/1000;
    const final=known?(amount('initial')+amount('entry')-amount('exit')+amount('rastro-adjustment'))/1000:null;
    const latest=relevant.filter(m=>m.movement_type==='rastro-adjustment').at(-1),meta=note(latest?.notes);
    return {...item,initialized:!!initial,initialDate:initial?String(initial.movement_date).slice(0,10):null,previous:final===null?null:Math.round((final-onDay('entry')+onDay('exit')-onDay('rastro-adjustment'))*1000)/1000,entry:onDay('entry'),exit:onDay('exit'),adjustment:onDay('rastro-adjustment'),final,
      correction:latest?{date:latest.day,before:meta.before,after:meta.after,notes:meta.note,actor:latest.recorded_by,at:latest.recorded_at}:null};
  });
  const days=[-2,-1,0].map(offset=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);const value=d.toISOString().slice(0,10);return {date:value,lines:linesAt(value)};});
  return {date:day,locationId:location.id,revision,lines:days[2].lines,days,history:movements.filter(m=>String(m.movement_date).slice(0,10)<=day).slice(-200).reverse()};
}
async function rectify(query,body,user){
  if(user.role!=='manager')fail('Solo supervisión o gerencia puede rectificar el inventario.',403);
  const d=correctionRequest.parse(body);validateDay(d.date);
  if(d.notes.length<3)fail('Explica qué error estás corrigiendo.');
  await query("SELECT id FROM locations WHERE code='rastro' FOR UPDATE");
  const current=await read(query,d.date);
  if(d.revision!==current.revision)fail('El inventario cambió. Recarga y revisa antes de rectificar; no se duplicó la corrección.',409);
  const item=current.lines.find(i=>i.id===d.itemId);
  if(!item)fail('Producto no disponible.');
  if(item.final===null)fail('Primero registra la existencia inicial de este producto.',409);
  if(item.unit==='pieza'&&!Number.isInteger(d.quantity))fail('Usa piezas enteras para '+item.name+'.');
  const [later]=await query('SELECT movement_date::text AS day FROM inventory_movements WHERE location_id=$1 AND item_id=$2 AND movement_date>$3::date ORDER BY movement_date DESC LIMIT 1',[current.locationId,item.id,d.date]);
  if(later)fail('Este producto tiene registros posteriores. Selecciona una fecha desde '+later.day+' y escribe cuánto queda realmente en Rastro.',409);
  const delta=units(d.quantity)-units(item.final);
  if(!delta)fail('La cantidad es igual a la guardada. No hay nada que rectificar.');
  await query('INSERT INTO inventory_movements(item_id,location_id,movement_type,quantity,movement_date,notes,recorded_by) VALUES($1,$2,$3,$4,$5::date,$6,$7)',[item.id,current.locationId,'rastro-adjustment',delta/1000,d.date,JSON.stringify({action:'rectify',before:item.final,after:d.quantity,note:d.notes,actorId:user.id}),user.name||user.id]);
  return read(query,d.date);
}
async function save(query,body,user){
  if(body?.action==='rectify')return rectify(query,body,user);
  const d=request.parse(body);
  validateDay(d.date);
  if(new Set(d.lines.map(l=>l.itemId)).size!==d.lines.length)fail('Producto repetido.');
  // The caller holds this lock in a transaction. Serializes every Rastro write.
  await query("SELECT id FROM locations WHERE code='rastro' FOR UPDATE");
  const current=await read(query,d.date);
  if(current.revision!==d.revision)fail('El inventario cambió. Recarga y revisa antes de guardar; no se duplicó la captura.',409);
  for(const l of d.lines){
    const item=current.lines.find(i=>i.id===l.itemId);
    if(!item)fail('Producto no disponible.');
    if(item.initialized&&l.initial!==undefined)fail('La existencia inicial ya está registrada.');
    if(!item.initialized&&l.initial===undefined)fail('Captura primero la existencia anterior de '+item.name+'.');
    if(item.initialDate&&d.date<item.initialDate)fail('La fecha es anterior al inicio del inventario.');
    const [laterCorrection]=await query("SELECT id FROM inventory_movements WHERE location_id=$1 AND item_id=$2 AND movement_type='rastro-adjustment' AND movement_date>$3::date LIMIT 1",[current.locationId,item.id,d.date]);
    if(laterCorrection)fail('Este producto ya fue rectificado después de esa fecha. Registra el movimiento en la fecha actual.',409);
    if(item.unit==='pieza'&&[l.initial,l.entry,l.exit].some(v=>v!==undefined&&!Number.isInteger(v)))fail('Usa piezas enteras para '+item.name+'.');
    for(const [key,kind] of [['initial','initial'],['entry','entry'],['exit','exit']]){
      if(l[key]===undefined||(key!=='initial'&&l[key]===0))continue;
      await query('INSERT INTO inventory_movements(item_id,location_id,movement_type,quantity,movement_date,notes,recorded_by) VALUES($1,$2,$3,$4,$5::date,$6,$7)',[item.id,current.locationId,kind,l[key],d.date,JSON.stringify({note:d.notes,deliveredBy:d.deliveredBy,receivedBy:d.receivedBy}),user.name||user.id]);
    }
    // Include future records: a backdated output must not make any later day negative.
    const rows=await query('SELECT movement_type,quantity FROM inventory_movements WHERE location_id=$1 AND item_id=$2 ORDER BY movement_date, CASE movement_type WHEN \'initial\' THEN 0 WHEN \'entry\' THEN 1 ELSE 2 END, id',[current.locationId,item.id]);
    let balance=0;
    for(const row of rows){if(!kinds.includes(row.movement_type))fail('Hay movimientos de otro formato; requiere revisión.',409);balance+=Math.round(Number(row.quantity)*1000)*(row.movement_type==='exit'?-1:1);if(balance<0)fail('La salida supera la existencia de '+item.name+'.');}
  }
  return read(query,d.date);
}
module.exports={read,save,request};
