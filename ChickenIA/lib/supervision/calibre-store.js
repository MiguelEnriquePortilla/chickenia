'use strict';
const core=require('./calibre');
function store(query){
 async function incidents(location,date){
  const rows=await query('SELECT area,data FROM calibre_days WHERE location_id=$1 AND date<=$2::date ORDER BY date,updated_at',[location,date]);
  const all=new Map();
  for(const row of rows)for(const incident of row.data.incidents){const old=all.get(incident.id);if(!old||(!old.resolvedAt&&incident.resolvedAt))all.set(incident.id,{...incident,sourceArea:incident.sourceArea||row.area});}
  return [...all.values()].filter(i=>!i.resolvedAt||core.day(new Date(i.due))===date);
 }
 function withIncidents(row,all){
  if(row.data.final)return row.data;
  return {...row.data,incidents:all.filter(i=>row.spec.code==='supervision'||i.sourceArea===row.spec.code)};
 }
 async function migrate(){
  await query(`CREATE TABLE IF NOT EXISTS calibre_settings(id INT PRIMARY KEY CHECK(id=1),start_date DATE NOT NULL)`);
  await query(`INSERT INTO calibre_settings(id,start_date) VALUES(1,(now() AT TIME ZONE 'America/Mexico_City')::date) ON CONFLICT DO NOTHING`);
  await query(`CREATE TABLE IF NOT EXISTS calibre_days(location_id INT NOT NULL REFERENCES locations(id),date DATE NOT NULL,area TEXT NOT NULL,version TEXT NOT NULL,spec JSONB NOT NULL,data JSONB NOT NULL,revision INT NOT NULL DEFAULT 0,updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(location_id,date,area))`);
  await query(`CREATE TABLE IF NOT EXISTS calibre_events(id BIGSERIAL PRIMARY KEY,location_id INT NOT NULL,date DATE NOT NULL,area TEXT NOT NULL,revision INT NOT NULL,action TEXT NOT NULL,data JSONB NOT NULL,actor TEXT NOT NULL,recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(location_id,date,area,revision))`);
  await query(`CREATE TABLE IF NOT EXISTS calibre_reports(id BIGSERIAL PRIMARY KEY,location_id INT NOT NULL,date DATE NOT NULL,scope TEXT NOT NULL,kind TEXT NOT NULL,message TEXT NOT NULL,snapshot JSONB NOT NULL,actor TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
 }
 async function get(location,date,now){
  const [settings]=await query('SELECT start_date::text FROM calibre_settings WHERE id=1');
  const rows=await query('SELECT area,spec,data,revision FROM calibre_days WHERE location_id=$1 AND date=$2::date ORDER BY area',[location,date]);
  const all=await incidents(location,date);
  const areas=core.AREAS.map(spec=>{const r=rows.find(r=>r.area===spec.code),saved=spec,data=withIncidents({spec:saved,data:r?.data||core.blank()},all);return {spec:saved,data,revision:r?.revision||0,summary:data.final?data.finalSummary:core.summary(saved,data,now,date)};});
  const history=await query('SELECT id,date::text,scope,kind,message,actor,created_at FROM calibre_reports WHERE location_id=$1 AND date BETWEEN ($2::date-29) AND $2::date ORDER BY id DESC LIMIT 100',[location,date]);
  const days=await query('SELECT date::text,area,revision,data->\'finalSummary\' AS summary FROM calibre_days WHERE location_id=$1 AND date BETWEEN ($2::date-29) AND $2::date AND data->>\'final\'=\'true\' ORDER BY date DESC,area',[location,date]);
  const checklistHistory=await query('SELECT date::text,area,spec,data->\'checklistPoints\' AS points,data->\'points\' AS original_points FROM calibre_days WHERE location_id=$1 AND date BETWEEN ($2::date-29) AND $2::date ORDER BY date DESC,area',[location,date]);
  const week=core.weekDates(date),weekRows=await query('SELECT date::text,area,spec,data FROM calibre_days WHERE location_id=$1 AND date BETWEEN $2::date AND $3::date',[location,week[0],week[6]]);
  const weekly={dates:week,areas:core.AREAS.map(spec=>({code:spec.code,name:spec.name,days:week.map(date=>{const r=weekRows.find(r=>r.date===date&&r.area===spec.code);return {date,...(r?core.checklistScore(r.spec,r.data):{done:0,total:spec.points.length,score:null})};})}))};
  return {date,start:settings.start_date,version:core.VERSION,areas,history,days,checklistHistory,weekly,canWrite:date===core.day(now),serverTime:now.toISOString()};
 }
 async function save(location,date,body,user,now){
  if(date!==core.day(now))core.fail('El histórico se conserva. Solo puedes registrar el día actual.',409);
  const spec=core.AREAS.find(a=>a.code===body.area);if(!spec)core.fail('Área desconocida.');
  if(!Number.isSafeInteger(body.revision)||body.revision<0)core.fail('Versión inválida.');
  await query(`INSERT INTO calibre_days(location_id,date,area,version,spec,data) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb) ON CONFLICT DO NOTHING`,[location,date,spec.code,core.VERSION,JSON.stringify(spec),JSON.stringify(core.blank())]);
  const [row]=await query('SELECT spec,data,revision FROM calibre_days WHERE location_id=$1 AND date=$2::date AND area=$3',[location,date,spec.code]);
  if(row.revision!==body.revision)core.fail('Alguien actualizó esta área. Recarga antes de guardar; tu captura sigue visible.',409);
  const source=withIncidents(row,await incidents(location,date));
  const data=core.apply(spec,source,body.command,user,now,date);
  const result=await query(`WITH saved AS (UPDATE calibre_days SET data=$5::jsonb,revision=revision+1,updated_at=$6::timestamptz WHERE location_id=$1 AND date=$2::date AND area=$3 AND revision=$4 RETURNING revision)
   INSERT INTO calibre_events(location_id,date,area,revision,action,data,actor,recorded_at) SELECT $1,$2::date,$3,revision,$7,$5::jsonb,$8,$6::timestamptz FROM saved RETURNING revision`,[location,date,spec.code,body.revision,JSON.stringify(data),now.toISOString(),body.command.action,user.name]);
  if(!result.length)core.fail('Alguien actualizó esta área. Recarga antes de guardar.',409);
  return get(location,date,now);
 }
 async function saveReport(location,date,scope,kind,user,now){
  if(!['avance','cierre','simple'].includes(kind))core.fail('Tipo de reporte inválido.');
  const view=await get(location,date,now),rows=view.areas.filter(r=>scope==='general'||r.spec.code===scope);
  if(!rows.length||rows.every(r=>!r.revision))core.fail('Primero registra el avance del área.');
  const message=kind==='simple'?core.simpleReport(rows,date):core.report(rows,date,kind,now);
  const [report]=await query('INSERT INTO calibre_reports(location_id,date,scope,kind,message,snapshot,actor,created_at) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8) RETURNING id,created_at',[location,date,scope,kind,message,JSON.stringify(rows),user.name,now.toISOString()]);
  return {...report,message};
 }
 return {migrate,get,save,saveReport};
}
module.exports={store};
