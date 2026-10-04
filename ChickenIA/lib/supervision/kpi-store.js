'use strict';
const kpi=require('./kpi');
const production=require('../production-daily'),cash=require('../cash-close');
const areaIds={Cocina:'cocina',Freidoras:'freidoras',Rosticero:'rosticero'};
function store(query){
 async function migrate(){
  await query(`CREATE TABLE IF NOT EXISTS supervision_kpi_config(version text PRIMARY KEY,start_date date NOT NULL)`);
  await query(`CREATE TABLE IF NOT EXISTS supervision_kpi_heads(location_id int NOT NULL,date date NOT NULL,cut text NOT NULL,revision int NOT NULL,PRIMARY KEY(location_id,date,cut))`);
  await query(`CREATE TABLE IF NOT EXISTS supervision_kpi_events(location_id int NOT NULL,date date NOT NULL,cut text NOT NULL,revision int NOT NULL,version text NOT NULL,data jsonb NOT NULL,sources jsonb NOT NULL,evaluation jsonb NOT NULL,actor text NOT NULL,actor_name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(location_id,date,cut,revision))`);
  await query(`INSERT INTO supervision_kpi_config(version,start_date) VALUES($1,(now() AT TIME ZONE 'America/Mexico_City')::date+1) ON CONFLICT DO NOTHING`,[kpi.VERSION]);
 }
 async function config(){const [r]=await query('SELECT start_date::text FROM supervision_kpi_config WHERE version=$1',[kpi.VERSION]);return r.start_date;}
 async function sources(date){
  const [tables]=await query("SELECT to_regclass('public.production_daily_live') AS production,to_regclass('public.cash_close_daily_live') AS cash");
  const [p]=tables.production?await query('SELECT data,revision,finalized FROM production_daily_live WHERE date=$1::date',[date]):[];
  const [c]=tables.cash?await query('SELECT data,revision,finalized FROM cash_close_daily_live WHERE date=$1::date',[date]):[];
  const data=p?production.chickens(p.data):production.blank();
  const ct=c?cash.calculate(c.data):null;
  const products=production.catalog.map(spec=>{
   const line=data.lines.find(l=>l.id===spec.id),values=[line.done1,line.done2,line.done3];
   return {id:spec.id,name:spec.name,area:areaIds[spec.area],active:line.active,unit:line.unit,previous:line.previousCooked,produced:values.every(v=>v==null)?null:Math.round(values.reduce((n,v)=>n+(v??0),0)*1000)/1000,planned:line.plan1,closing:line.closingCooked};
  });
  return {productionRevision:p?.revision||0,productionFinalized:!!p?.finalized,cashRevision:c?.revision||0,cashFinalized:!!c?.finalized,
   cashBalanced:!!ct&&ct.cashDifference===0&&ct.deliveryPending===0&&ct.salesDifference===0&&Object.values(ct.payments).every(v=>v===0)&&ct.cardTotal===c.data.payments.credit.confirmed+c.data.payments.debit.confirmed&&c.data.payments.cash.confirmed===c.data.cash.cashSales-c.data.cash.refunds,products};
 }
 async function events(location,date,from=date){return query('SELECT date::text,cut,revision,data,sources,evaluation,actor_name,created_at FROM supervision_kpi_events WHERE location_id=$1 AND date BETWEEN $2::date AND $3::date ORDER BY date,cut,revision',[location,from,date]);}
 async function get(location,date,now){
  const activation=await config(),from=new Date(Date.parse(date+'T12:00:00Z')-29*86400000).toISOString().slice(0,10);
  const history=await events(location,date,from),result=kpi.summarize(date,history,activation,now);
  const periods=[7,30].map(days=>{
   let met=0,due=0;const byArea=Object.fromEntries(kpi.AREAS.map(a=>[a.id,{met:0,due:0}]));
   for(let i=0;i<days;i++){
    const d=new Date(Date.parse(date+'T12:00:00Z')-i*86400000).toISOString().slice(0,10),s=kpi.summarize(d,history,activation,now);
    met+=s.met;due+=s.due;for(const a of s.areas){byArea[a.id].met+=a.met;byArea[a.id].due+=a.due;}
   }
   return {days,met,due,score:due?Math.round(met*100/due):null,areas:byArea};
  });
  return {...result,activation,periods,sources:await sources(date)};
 }
 async function save(location,body,actor,now){
  const {date,cut,revision,sourceRevision,cashRevision}=body;
  if(!kpi.validDate(date)||date!==kpi.day(now))kpi.fail('Solo puedes verificar el día actual. El histórico se conserva.',409);
  const idx=kpi.CUTS.findIndex(c=>c.id===cut);
  if(idx<0||!Number.isSafeInteger(revision)||revision<0)kpi.fail('Corte o versión inválidos.');
  if(idx>0&&new Date(now)<kpi.deadline(date,kpi.CUTS[idx-1]))kpi.fail('Este punto de control todavía no inicia.',409);
  const source=await sources(date);
  if(sourceRevision!==source.productionRevision||cashRevision!==source.cashRevision)kpi.fail('Producción o caja cambiaron. Recarga para verificar las cantidades actuales.',409);
  const previous=await events(location,date);
  const first=previous.find(e=>e.sources.productionRevision>0);
  if(first&&JSON.stringify(first.sources.products.filter(p=>p.active).map(p=>p.id))!==JSON.stringify(source.products.filter(p=>p.active).map(p=>p.id)))kpi.fail('Conserva los productos aplicables del primer corte en Producción Diaria. No se pueden retirar productos de la evaluación durante el día.',409);
  const data=kpi.validate(body.data,cut,source.products),evaluation=kpi.evaluate(data,cut,source);
  const rows=await query(`WITH head AS (
   INSERT INTO supervision_kpi_heads(location_id,date,cut,revision)
   SELECT $1,$2::date,$3,1 WHERE $4::int=0 OR EXISTS(SELECT 1 FROM supervision_kpi_heads WHERE location_id=$1 AND date=$2::date AND cut=$3)
   ON CONFLICT(location_id,date,cut) DO UPDATE SET revision=supervision_kpi_heads.revision+1 WHERE supervision_kpi_heads.revision=$4 RETURNING revision
  ) INSERT INTO supervision_kpi_events(location_id,date,cut,revision,version,data,sources,evaluation,actor,actor_name)
   SELECT $1,$2::date,$3,head.revision,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10 FROM head RETURNING revision,created_at`,
   [location,date,cut,revision,kpi.VERSION,JSON.stringify(data),JSON.stringify(source),JSON.stringify(evaluation),actor.id,actor.name]);
  if(!rows.length)kpi.fail('Otro usuario actualizó este corte. Recarga antes de guardar.',409);
  return {saved:true,...rows[0],evaluation};
 }
 return {migrate,config,sources,events,get,save};
}
module.exports={store};
