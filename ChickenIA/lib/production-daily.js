'use strict';
const {z}=require('zod');
const qty=z.number().min(0).max(1000000).multipleOf(0.001).nullable();
const units=z.enum(['kg','litros','porciones','piezas','pollos']).nullable();
const extraFields=['receivedRaw','done3'];
const fields=['previousRaw','previousCooked','plan1','done1','plan2','done2','closingCooked','closingRaw'];
const catalog=[
  ...['Arroz blanco','Arroz rojo','Espagueti preparado','Nopales','Puré de papa','Papas cambray','Ensalada de col','Adobo tradicional','Adobo tres chiles','Salsa barbecue','Marinado para rostizado','Espagueti y verduras','Rajas con papas','Crema para espagueti','Pasta de codo cocida','Pasta de espagueti cocida'].map((name,i)=>({id:'cocina-'+i,name,area:'Cocina',rawUnit:null,unit:null})),
  ...['Salsa verde','Ensalada campesina','Sopa de codo','Papas gajo','Cruji'].map((name,i)=>({id:'freidoras-'+i,name,area:'Freidoras',rawUnit:i===4?'pollos':null,unit:i===4?'piezas':null})),
  {id:'rosti',name:'Rosti',area:'Rosticero',rawUnit:'pollos',unit:'pollos'},
  {id:'costilla',name:'Costilla',area:'Rosticero',rawUnit:'kg',unit:'kg'},
];
const schema=z.object({photo:z.object({format:z.literal('cierre-una-pagina-v1'),sourceFile:z.string().max(250),sourceSha256:z.string().regex(/^[a-f0-9]{64}$/),deliveredBy:z.string().max(200),receivedBy:z.string().max(200),batchTimes:z.array(z.string().max(20)).length(3)}).strict().optional(),losses:z.array(z.object({productId:z.enum(['freidoras-4','rosti','costilla']),state:z.enum(['crudo','cocido']),type:z.enum(['merma','cortesia','consumo','devolucion']),quantity:qty,unit:units,reason:z.string().max(1000)}).strict()).max(100).optional(),responsible:z.string().trim().max(200),employeeMeal:z.string().trim().max(1000),notes:z.string().trim().max(1000),
  lines:z.array(z.object({id:z.string(),active:z.boolean(),unit:units,...Object.fromEntries(extraFields.map(k=>[k,qty.optional()])),...Object.fromEntries(fields.map(k=>[k,qty]))}).strict()).length(catalog.length),
  purchases:z.object(Object.fromEntries(['Leche','Aceite','Crema LALA'].map(k=>[k,z.object({qty,unit:z.string().trim().max(50)}).strict()]))).strict(),
}).strict();
function blank(){return {responsible:'',employeeMeal:'',notes:'',lines:catalog.map(r=>({id:r.id,active:true,unit:r.unit,...Object.fromEntries(fields.map(k=>[k,null]))})),purchases:Object.fromEntries(['Leche','Aceite','Crema LALA'].map(k=>[k,{qty:null,unit:''}]))};}
function calculate(data){
  const d=schema.parse(data),missing=[],warnings=[],photo=!!d.photo;
  const included=r=>r.active&&(!photo||['freidoras-4','rosti','costilla'].includes(r.id));
  if(new Set(d.lines.map(r=>r.id)).size!==catalog.length||d.lines.some(r=>!catalog.some(c=>c.id===r.id)))throw Object.assign(Error('Catálogo de producción inválido.'),{status:400});
  if(!d.responsible)missing.push('Responsable');
  let pending=0;
  for(const r of d.lines){
    const c=catalog.find(c=>c.id===r.id);
    if(c.unit&&c.unit!==r.unit)throw Object.assign(Error('Conserva la unidad de '+c.name),{status:400});
    if(!included(r))continue;
    if(!r.unit)missing.push('Unidad de '+c.name);
    for(const k of photo?['previousRaw','previousCooked','receivedRaw','done1','done2','done3','closingCooked','closingRaw']:fields){
      const raw=k==='previousRaw'||k==='closingRaw'||k==='receivedRaw';
      if(raw&&!c.rawUnit)continue;
      if(r[k]==null)missing.push(c.name+': '+k);
      const unit=raw?c.rawUnit:r.unit;
      if(r[k]!=null&&['pollos','piezas','porciones'].includes(unit)&&!Number.isInteger(r[k]))throw Object.assign(Error(c.name+': usa cantidades enteras para '+unit),{status:400});
    }
    if(fields.some(k=>r[k]!==null)&&!r.unit)warnings.push('Define la unidad de '+c.name);
    for(const n of photo?[]:[1,2])if(r['plan'+n]>0&&(r['done'+n]===null||r['done'+n]<r['plan'+n]))pending++;
    if(r.previousCooked!==null&&r.done1!==null&&r.done2!==null&&(!photo||r.done3!=null)&&r.closingCooked!==null&&r.closingCooked>r.previousCooked+r.done1+r.done2+(photo?r.done3:0))warnings.push(c.name+': el sobrante supera lo disponible registrado');
  }
  if(!photo)for(const [name,p]of Object.entries(d.purchases))if(p.qty===null||(p.qty>0&&!p.unit))missing.push('Compra: '+name);
  if(!photo&&!d.employeeMeal)missing.push('Comida de empleados (o Sin comida)');
  if(warnings.length&&!d.notes)missing.push('Aclaraciones');
  const produced=Object.fromEntries(d.lines.filter(included).map(r=>{const values=photo?[r.done1,r.done2,r.done3]:[r.done1,r.done2];return [r.id,values.some(v=>v==null)?null:values.reduce((a,b)=>a+b,0)];}));
  const chickenPieces=produced['freidoras-4']==null||produced.rosti==null?null:produced['freidoras-4']+produced.rosti*8;
  for(const loss of d.losses||[]){const c=catalog.find(c=>c.id===loss.productId);const expectedUnit=loss.state==='crudo'?c.rawUnit:c.unit;if(loss.unit!==expectedUnit)throw Object.assign(Error('Unidad de merma inválida para '+c.name),{status:400});if(loss.quantity==null||!loss.reason)missing.push('Merma o consumo: cantidad y motivo');}
  return {produced,chickenPieces,costillaKg:produced.costilla??null,active:d.lines.filter(included).length,pendingBatches:pending,missing,warnings,canFinalize:missing.length===0};
}
function service(databaseQuery,actor){
  const live=actor.environment==='production';
  const query=(sql,params)=>databaseQuery(live?sql.replaceAll('production_daily_pilot','production_daily_live'):sql,params);
  const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
  if(!['local-test','production'].includes(actor.environment)||actor.business!=='chicanito')fail('Producción disponible solo en pruebas locales.',403);
  const valid=date=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;
  async function migrate(){await query('CREATE TABLE IF NOT EXISTS production_daily_pilot(date date PRIMARY KEY,revision int NOT NULL,data jsonb NOT NULL,finalized boolean NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())');await query('CREATE TABLE IF NOT EXISTS production_daily_pilot_history(date date NOT NULL,revision int NOT NULL,data jsonb NOT NULL,finalized boolean NOT NULL,actor text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(date,revision))');}
  async function get(date){if(!valid(date))fail('Fecha inválida.');await migrate();const [row]=await query('SELECT revision,data,finalized,updated_at FROM production_daily_pilot WHERE date=$1::date',[date]);const result=row||{revision:0,data:blank(),finalized:false};return {environment:actor.environment,date,...result,catalog,totals:calculate(result.data)};}
  async function save({date,revision,data,finalize=false}){
    if(!actor.canWrite)fail('Sin permiso de escritura.',403);
    if(!valid(date)||!Number.isSafeInteger(revision)||revision<0||typeof finalize!=='boolean')fail('Fecha o versión inválida.');
    const parsed=schema.parse(data),totals=calculate(parsed);
    if(finalize&&!totals.canFinalize)fail('Faltan datos: '+totals.missing.join(', '));
    await migrate();
    const [previous]=await query('SELECT data FROM production_daily_pilot WHERE date=$1::date',[date]);
    if(previous)for(const line of parsed.lines){
      const old=previous.data.lines.find(r=>r.id===line.id);
      if(old&&old.unit!==line.unit&&[...fields,...extraFields].some(k=>old[k]!=null)&&[...fields,...extraFields].some(k=>line[k]!=null))fail('Para cambiar unidad, vacía primero las cantidades del producto y vuelve a capturarlas con la unidad correcta.');
    }
    const rows=await query(`WITH saved AS (
      INSERT INTO production_daily_pilot(date,revision,data,finalized) SELECT $1::date,1,$3::jsonb,$4 WHERE $2::int=0 OR EXISTS(SELECT 1 FROM production_daily_pilot WHERE date=$1::date)
      ON CONFLICT(date) DO UPDATE SET revision=production_daily_pilot.revision+1,data=excluded.data,finalized=excluded.finalized,updated_at=now()
      WHERE production_daily_pilot.revision=$2 AND NOT production_daily_pilot.finalized RETURNING *
    ), history AS (INSERT INTO production_daily_pilot_history(date,revision,data,finalized,actor) SELECT date,revision,data,finalized,$5 FROM saved)
    SELECT revision,finalized FROM saved`,[date,revision,JSON.stringify(parsed),finalize,actor.id]);
    if(!rows.length)fail('La captura cambió o ya fue finalizada. Recupera la versión guardada.',409);
    return {environment:actor.environment,saved:true,date,...rows[0],data:parsed,catalog,totals};
  }
  return {get,save};
}
module.exports={schema,blank,calculate,service,catalog};
