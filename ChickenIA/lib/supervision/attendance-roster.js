'use strict';
// Apply once, preserving retired employee IDs and all attendance records.
async function migrate(sql){
 await sql`CREATE TABLE IF NOT EXISTS attendance_roster_versions(version TEXT PRIMARY KEY,applied_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp())`;
 await sql`WITH version AS (
  INSERT INTO attendance_roster_versions(version) VALUES('roster-2026-10-11-diana-silvia')
  ON CONFLICT DO NOTHING RETURNING version
 ), retired AS (
  UPDATE employees SET active=false
  WHERE name IN ('Herman Melo','Rocío Mata') AND EXISTS(SELECT 1 FROM version)
  RETURNING id
 ) INSERT INTO employees(name,active,order_index)
 SELECT r.name,true,r.position FROM version,
  (VALUES ('Diana',9),('Silvia Najera',10)) AS r(name,position)
 ON CONFLICT(name) DO UPDATE SET active=true,order_index=EXCLUDED.order_index`;
}
module.exports={migrate};
