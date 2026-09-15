'use strict';
const {randomUUID}=require('node:crypto');
const {InventoryError,applyOperation}=require('./inventory-domain');
const uuid=id=>typeof id==='string'&&/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id);
function service(repo,query,actor){
  if(actor.business!=='chicanito')throw new InventoryError('Negocio no habilitado en este piloto.',403);
  const write=()=>{if(!actor.canWrite)throw new InventoryError('Tu cuenta solo tiene permiso de lectura.',403);};
  async function prepare(type,values){
    write();const snapshot=await repo.snapshot();
    const command={...values,type,id:randomUUID(),version:snapshot.version};
    const preview=applyOperation(snapshot.data,command,actor).event;
    await query('INSERT INTO food_drafts(id,actor_id,command) VALUES($1::uuid,$2,$3::jsonb)',[command.id,actor.id,JSON.stringify(command)]);
    return {draftId:command.id,preview,expiresInHours:24,saved:false,message:'Borrador guardado; aún no modifica compras ni existencias.'};
  }
  async function commit(id){
    write();if(!uuid(id))throw new InventoryError('Borrador inválido.');
    const rows=await query('SELECT command,created_at FROM food_drafts WHERE id=$1::uuid AND actor_id=$2',[id,actor.id]);
    if(!rows.length)throw new InventoryError('Borrador no encontrado para tu cuenta.',404);
    // An already committed ID is safe to retry even after draft expiry.
    const logged=await query('SELECT version FROM inv_events WHERE id=$1::uuid',[id]);
    if(!logged.length&&Date.now()-new Date(rows[0].created_at).getTime()>86400000)throw new InventoryError('Borrador vencido; prepara uno nuevo.',409);
    const result=await repo.execute(rows[0].command,actor);
    return {saved:true,folio:id,...result};
  }
  async function inventory(search=''){
    const current=await repo.snapshot(),term=search.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const items=current.data.items.filter(i=>(i.id+' '+i.name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(term));
    return {version:current.version,queriedAt:new Date().toISOString(),source:'ChickenIA inv_state',items:items.map(i=>({...i,step:i.step/1000,cedis:current.data.initialized['cedis:'+i.id]?current.data.balances['cedis:'+i.id]/1000:null,sucursal:current.data.initialized['sucursal:'+i.id]?current.data.balances['sucursal:'+i.id]/1000:null})),message:'Saldo null significa inicial desconocido, no cero. Respeta la unidad del catálogo.'};
  }
  async function purchases(from,to){
    const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
    if(!validDate(from)||!validDate(to)||from>to)throw new InventoryError('Periodo inválido.');
    const rows=await query("SELECT data FROM food_purchases WHERE business_id='chicanito' AND data->>'date'>=$1 AND data->>'date'<=$2 ORDER BY data->>'date',id",[from,to]);
    const docs=rows.map(r=>r.data),valid=docs.filter(d=>d.status!=='void');
    return {from,to,currency:'MXN',source:'FoodIA food_purchases',queriedAt:new Date().toISOString(),purchases:docs,knownTotalCents:valid.reduce((n,d)=>n+d.knownTotalCents,0),missingCostDocuments:valid.filter(d=>d.costStatus!=='complete').length,knownPaidCents:valid.reduce((n,d)=>n+(d.paidCents??0),0),missingPaymentDocuments:valid.filter(d=>d.paidCents===null).length,note:'Importes en centavos; cantidades de renglón en milésimas. Solo compras registradas por FoodIA, no gastos históricos de otras fuentes.'};
  }
  async function lists(){return {lists:(await query("SELECT data FROM food_lists WHERE business_id='chicanito' ORDER BY data->>'date' DESC LIMIT 100",[])).map(r=>r.data),note:'Cantidades en milésimas de la unidad declarada; guías orientadoras, sin candados.'};}
  async function movements(from,to){
    const valid=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
    if(!valid(from)||!valid(to)||from>to)throw new InventoryError('Periodo inválido.');
    const current=await repo.snapshot(),items=new Map(current.data.items.map(i=>[i.id,i]));
    const lines=rows=>rows.map(l=>({item:l.item,name:items.get(l.item)?.name||l.item,unit:items.get(l.item)?.unit||null,qty:l.qty/1000}));
    const requests=current.data.requests.filter(r=>r.due>=from&&r.due<=to).map(r=>({...r,lines:lines(r.lines),shipments:r.shipments.map(s=>({...s,lines:lines(s.lines),received:lines(s.received),returned:lines(s.returned||[])}))}));
    return {from,to,version:current.version,requests,source:'ChickenIA inv_state.requests',note:'Cantidades humanas. Filtrado por fecha solicitada, no por fecha del envío. Solicitar no mueve saldo; enviar descuenta CEDIS; recibir suma sucursal. Incluye solicitudes abiertas y hasta las últimas 50 cerradas conservadas; no es un histórico completo. Existencia anterior y entradas de una hoja no se infieren de estos datos.'};
  }
  return {prepare,commit,inventory,purchases,lists,movements};
}
module.exports={service};
