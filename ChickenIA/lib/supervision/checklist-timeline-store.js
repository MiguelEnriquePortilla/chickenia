'use strict';
const timeline=require('./checklist-timeline');
async function migrate(sql){
 await sql`ALTER TABLE activity_checks ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ`;
 await sql`CREATE TABLE IF NOT EXISTS checklist_check_events (
  id BIGSERIAL PRIMARY KEY,activity_id INT NOT NULL,location_id INT NOT NULL,check_date DATE NOT NULL,
  done BOOLEAN NOT NULL,quality_score INT,checked_by TEXT NOT NULL,verified_at TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp())`;
 await sql`CREATE INDEX IF NOT EXISTS checklist_check_events_day ON checklist_check_events(location_id,check_date,recorded_at,id)`;
 await sql`CREATE TABLE IF NOT EXISTS checklist_timeline_days (
  location_id INT NOT NULL, date DATE NOT NULL, catalog JSONB NOT NULL,
  closed BOOLEAN NOT NULL DEFAULT false,closed_reason TEXT,closed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(location_id,date))`;
 await sql`CREATE TABLE IF NOT EXISTS checklist_timeline_calendar_events (
  id BIGSERIAL PRIMARY KEY,location_id INT NOT NULL,date DATE NOT NULL,closed BOOLEAN NOT NULL,
  reason TEXT NOT NULL,actor TEXT NOT NULL,recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp())`;
 // The trigger journals every writer atomically, including older clients. No reconstruction of old timestamps.
 await sql`CREATE OR REPLACE FUNCTION journal_checklist_check() RETURNS trigger LANGUAGE plpgsql AS $$
 BEGIN
  IF TG_OP='DELETE' THEN
   INSERT INTO checklist_check_events(activity_id,location_id,check_date,done,quality_score,checked_by,verified_at)
    VALUES(OLD.activity_id,OLD.location_id,OLD.check_date,false,NULL,OLD.checked_by,NULL);
   RETURN OLD;
  END IF;
  INSERT INTO checklist_check_events(activity_id,location_id,check_date,done,quality_score,checked_by,verified_at)
   VALUES(NEW.activity_id,NEW.location_id,NEW.check_date,NEW.done,NEW.quality_score,NEW.checked_by,NEW.verified_at);
  RETURN NEW;
 END $$`;
 await sql`DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='checklist_check_journal') THEN
   CREATE TRIGGER checklist_check_journal AFTER INSERT OR UPDATE OR DELETE ON activity_checks FOR EACH ROW EXECUTE FUNCTION journal_checklist_check();
  END IF;
 END $$`;
}
async function ensureDay(sql,location,date){
 if(date!==timeline.day())return;
 const found=await sql`SELECT 1 FROM checklist_timeline_days WHERE location_id=${location} AND date=${date}::date`;
 if(found.length)return;
 const rows=await sql`SELECT a.id,a.name,a.weight,a.measurement,a.routine_block,ar.code AS area_code,ar.name AS area_name
  FROM activities a JOIN areas ar ON ar.id=a.area_id JOIN locations l ON l.type=ar.location_type
  WHERE l.id=${location} AND l.type='tienda' AND ar.active AND a.active
   AND (a.valid_from IS NULL OR a.valid_from<=${date}::date) AND (a.valid_until IS NULL OR a.valid_until>${date}::date)
   AND (a.frequency<>'weekly' OR EXISTS(SELECT 1 FROM kitchen_plans kp WHERE kp.activity_id=a.id AND kp.plan_date=${date}::date))
  ORDER BY ar.order_index,a.order_index`;
 if(!rows.length)return;
 const catalog=rows.map(r=>({...r,schedule:timeline.schedule(r)}));
 await sql`INSERT INTO checklist_timeline_days(location_id,date,catalog) VALUES(${location},${date}::date,${JSON.stringify(catalog)}::jsonb) ON CONFLICT DO NOTHING`;
}
async function get(sql,location,date,now=new Date()){
 await ensureDay(sql,location,timeline.day(now));
 const days=await sql`SELECT date::text,catalog,closed,closed_reason FROM checklist_timeline_days WHERE location_id=${location} AND date BETWEEN ${date}::date-29 AND ${date}::date ORDER BY date`;
 const events=await sql`SELECT id,activity_id,check_date::text,done,quality_score,checked_by,verified_at,recorded_at FROM checklist_check_events WHERE location_id=${location} AND check_date BETWEEN ${date}::date-29 AND ${date}::date ORDER BY recorded_at,id`;
 const results=days.map(d=>({...timeline.evaluate(d.catalog,events.filter(e=>e.check_date===d.date),d.date,now),closed:d.closed,closedReason:d.closed_reason}));
 const current=results.find(d=>d.date===date)||{date,active:false,cuts:[],areas:[],final:false,missing:true};
 return {...current,start:timeline.START,serverTime:new Date(now).toISOString(),periods:[7,30].map(n=>timeline.averages(results,date,n)),history:results.map(({date,areas,final,closed,active})=>({date,areas,final,closed,active}))};
}
async function setClosed(sql,location,date,closed,reason,actor){
 const rows=await sql`WITH updated AS (
  UPDATE checklist_timeline_days SET closed=${closed},closed_reason=${reason},closed_by=${actor}
  WHERE location_id=${location} AND date=${date}::date RETURNING location_id,date
 ) INSERT INTO checklist_timeline_calendar_events(location_id,date,closed,reason,actor)
 SELECT location_id,date,${closed},${reason},${actor} FROM updated RETURNING id`;
 if(!rows.length)throw Object.assign(Error('No hay un día registrado para cambiar.'),{status:409});
}
module.exports={migrate,ensureDay,get,setClosed};
