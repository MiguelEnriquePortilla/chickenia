'use strict';
const {z}=require('zod');
const amount=z.number().int().min(0).max(1000000000).nullable();
const words=z.string().trim().max(1000);
const denominations={b1000:100000,b500:50000,b200:20000,b100:10000,b50:5000,b20:2000,m20:2000,m10:1000,m5:500,m2:200,m1:100,m050:50};
const cashKeys=['opening','cashSales','otherIn','refunds','expenses','firstTurn','withdrawals','otherCoins','retained','delivered'];
const paymentKeys=['cash','credit','debit','transfer','other'];
const schema=z.object({
  photo:z.object({format:z.literal('cierre-una-pagina-v1'),sourceFile:z.string().max(250),sourceSha256:z.string().regex(/^[a-f0-9]{64}$/),coinsTotal:amount,cardTotal:amount}).strict().optional(),
  cashier:words,cut:words,receiver:words,deliveryTime:words,receipt:words,explanation:words,
  cash:z.object(Object.fromEntries(cashKeys.map(k=>[k,amount]))).strict(),
  counts:z.object(Object.fromEntries(Object.keys(denominations).map(k=>[k,z.number().int().min(0).max(100000).nullable()]))).strict(),
  salesTotal:amount,
  payments:z.object(Object.fromEntries(paymentKeys.map(k=>[k,z.object({expected:amount,confirmed:amount}).strict()]))).strict(),
  terminals:z.array(z.object({reference:words,method:z.enum(['credit','debit']),count:z.number().int().min(1).max(10000),charged:amount,refunded:amount}).strict()).max(100),
  incidents:z.array(z.object({type:z.enum(['cancelacion','descuento','devolucion','cortesia']),ticket:words,amount,reason:words,authorizedBy:words,payment:words}).strict()).max(100),
  movements:z.array(z.object({type:z.enum(['entrada','gasto','retiro']),concept:words,receipt:words,amount,person:words}).strict()).max(100),
  evidence:z.object(Object.fromEntries(['cut','terminals','transfers','refunds','expenses','deliveries'].map(k=>[k,z.enum(['pending','available','na'])]))).strict(),
}).strict();
function blank(){return {cashier:'',cut:'Diario',receiver:'',deliveryTime:'',receipt:'',explanation:'',cash:Object.fromEntries(cashKeys.map(k=>[k,null])),counts:Object.fromEntries(Object.keys(denominations).map(k=>[k,null])),salesTotal:null,payments:Object.fromEntries(paymentKeys.map(k=>[k,{expected:null,confirmed:null}])),terminals:[],incidents:[],movements:[],evidence:Object.fromEntries(['cut','terminals','transfers','refunds','expenses','deliveries'].map(k=>[k,'pending']))};}
const sum=values=>values.some(v=>v===null)?null:values.reduce((s,v)=>s+v,0);
const difference=(a,b)=>a===null||b===null?null:a-b;
function calculate(data){
  const d=schema.parse(data),c=d.cash;
  const expected=sum([c.opening,c.cashSales,c.otherIn,c.refunds===null?null:-c.refunds,c.expenses===null?null:-c.expenses,c.firstTurn===null?null:-c.firstTurn,c.withdrawals===null?null:-c.withdrawals]);
  const counted=d.photo?sum([...Object.entries(denominations).filter(([k])=>k.startsWith('b')).map(([k,v])=>d.counts[k]===null?null:d.counts[k]*v),d.photo.coinsTotal]):sum([...Object.entries(denominations).map(([k,v])=>d.counts[k]===null?null:d.counts[k]*v),c.otherCoins]);
  const toDeliver=difference(counted,c.retained),cashDifference=difference(counted,expected),deliveryPending=difference(toDeliver,c.delivered);
  const payments=Object.fromEntries(paymentKeys.map(k=>[k,difference(d.payments[k].confirmed,d.payments[k].expected)]));
  const paymentTotal=sum(paymentKeys.map(k=>d.payments[k].expected));
  const salesDifference=difference(paymentTotal,d.salesTotal);
  const missing=[];
  if(!d.cashier)missing.push('Nombre de quien prepara');
  if(!d.cut)missing.push('Identificador del corte');
  (d.photo?['expenses','firstTurn','retained','delivered']:cashKeys).filter(k=>c[k]===null).forEach(k=>missing.push('cash.'+k));
  Object.keys(denominations).filter(k=>(!d.photo||k.startsWith('b'))&&d.counts[k]===null).forEach(k=>missing.push('counts.'+k));
  if(!d.photo)paymentKeys.forEach(k=>{if(d.payments[k].expected===null||d.payments[k].confirmed===null)missing.push('payments.'+k);});
  if(!d.photo&&d.salesTotal===null)missing.push('Venta del corte');
  if(!d.receiver)missing.push('Quién recibe');
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.deliveryTime))missing.push('Hora de entrega HH:MM');
  if(!d.receipt)missing.push('Referencia de entrega');
  if(d.photo){if(d.photo.coinsTotal===null)missing.push('Total de monedas');if(d.photo.cardTotal===null)missing.push('Total tarjeta');if(d.payments.transfer.confirmed===null)missing.push('Total transferencia');}
  if(!d.photo&&Object.values(d.evidence).includes('pending'))missing.push('Revisión de comprobantes');
  const warnings=[];
  if(expected!==null&&expected<0)warnings.push('Las salidas exceden el efectivo disponible');
  if(toDeliver!==null&&toDeliver<0)warnings.push('Se deja más efectivo del contado');
  if(cashDifference)warnings.push('Diferencia de efectivo');
  if(deliveryPending)warnings.push(deliveryPending>0?'Entrega pendiente':'Entrega superior a la calculada');
  if(salesDifference)warnings.push('Las formas de pago no suman la venta del corte');
  if(Object.values(payments).some(v=>v!==null&&v!==0))warnings.push('Diferencia en formas de pago');
  d.terminals.forEach((t,i)=>{if(t.charged===null||t.refunded===null||!t.reference)missing.push('Terminal '+(i+1));if(t.refunded>t.charged&&t.charged!==null)warnings.push('Devolución de terminal superior al cobro');});
  for(const method of ['credit','debit']){
    const rows=d.terminals.filter(t=>t.method===method);
    const total=sum(rows.map(t=>difference(t.charged,t.refunded)));
    if(rows.length&&total!==null&&d.payments[method].confirmed!==null&&total!==d.payments[method].confirmed)warnings.push('Terminal no coincide con '+method);
  }
  d.incidents.forEach((r,i)=>{if(r.amount===null||!r.ticket||!r.reason||!r.authorizedBy||(r.type==='devolucion'&&!r.payment))missing.push('Incidencia '+(i+1));});
  d.movements.forEach((r,i)=>{if(r.amount===null||!r.concept||!r.person||!r.receipt)missing.push('Movimiento '+(i+1));});
  for(const [type,key]of [['entrada','otherIn'],['gasto','expenses'],['retiro','withdrawals']]){
    const rows=d.movements.filter(r=>r.type===type),total=sum(rows.map(r=>r.amount));
    if(rows.length&&total!==null&&c[key]!==null&&total!==c[key])warnings.push('Detalle no coincide con '+type);
  }
  if(warnings.length&&!d.explanation)missing.push('Motivo de diferencias');
  return {expenses:c.expenses,cardTotal:d.photo?d.photo.cardTotal:sum([d.payments.credit.confirmed,d.payments.debit.confirmed]),transferTotal:d.payments.transfer.confirmed,expected,counted,cashDifference,toDeliver,deliveryPending,paymentTotal,salesDifference,payments,missing,warnings,canFinalize:missing.length===0};
}
function validDate(date){return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;}
function cashService(databaseQuery,actor){
  const live=actor.environment==='production';
  const query=(sql,params)=>databaseQuery(live?sql.replaceAll('cash_close_pilot','cash_close_daily_live'):sql,params);
  const fail=(msg,status=400)=>{throw Object.assign(new Error(msg),{status});};
  if(!['local-test','production'].includes(actor.environment)||actor.business!=='chicanito')fail('Cierre disponible solo en el piloto local.',403);
  async function migrate(){await query('CREATE TABLE IF NOT EXISTS cash_close_pilot(date date PRIMARY KEY, revision int NOT NULL, data jsonb NOT NULL, finalized boolean NOT NULL DEFAULT false, updated_by text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())');await query('CREATE TABLE IF NOT EXISTS cash_close_pilot_history(date date NOT NULL, revision int NOT NULL, data jsonb NOT NULL, finalized boolean NOT NULL, actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(date,revision))');}
  async function get(date){if(!validDate(date))fail('Fecha inválida.');await migrate();const [row]=await query('SELECT revision,data,finalized,updated_at FROM cash_close_pilot WHERE date=$1::date',[date]);const result=row||{revision:0,data:blank(),finalized:false};return {environment:actor.environment,date,...result,totals:calculate(result.data)};}
  async function save({date,revision,data,finalize=false}){
    if(!actor.canWrite)fail('Sin permiso de escritura.',403);
    if(!validDate(date)||!Number.isSafeInteger(revision)||revision<0||typeof finalize!=='boolean')fail('Fecha o versión inválida.');
    const parsed=schema.parse(data),totals=calculate(parsed);
    if(finalize&&!totals.canFinalize)fail('Faltan datos: '+totals.missing.join(', '));
    await migrate();
    const rows=await query(`WITH saved AS (
      INSERT INTO cash_close_pilot(date,revision,data,finalized,updated_by)
      SELECT $1::date,1,$3::jsonb,$4,$5 WHERE $2::int=0 OR EXISTS(SELECT 1 FROM cash_close_pilot WHERE date=$1::date)
      ON CONFLICT(date) DO UPDATE SET revision=cash_close_pilot.revision+1,data=excluded.data,finalized=excluded.finalized,updated_by=excluded.updated_by,updated_at=now()
      WHERE cash_close_pilot.revision=$2 AND NOT cash_close_pilot.finalized
      RETURNING *
    ), history AS (INSERT INTO cash_close_pilot_history(date,revision,data,finalized,actor) SELECT date,revision,data,finalized,updated_by FROM saved)
    SELECT revision,finalized FROM saved`,[date,revision,JSON.stringify(parsed),finalize,actor.id]);
    if(!rows.length)fail('El cierre cambió o ya fue finalizado. Recupera la versión guardada antes de continuar.',409);
    return {environment:actor.environment,saved:true,date,...rows[0],data:parsed,totals};
  }
  return {get,save};
}
module.exports={schema,blank,calculate,cashService,denominations};
