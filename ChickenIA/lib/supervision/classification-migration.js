'use strict';

module.exports = async function classify(sql, legacy) {
  const records = require('./report-guidance').classifications(legacy);
  // Correct metadata in place without replacing IDs, weights, or captured checks.
  await sql`WITH version AS (
    INSERT INTO checklist_catalog_versions(version,effective_date)
    VALUES('routine-classification-2026-09-16-v1',(now() AT TIME ZONE 'America/Mexico_City')::date)
    ON CONFLICT DO NOTHING RETURNING version
  ) UPDATE activities a SET routine_block=r.routine_block
    FROM areas ar, version, jsonb_to_recordset(${JSON.stringify(records)}::jsonb)
      AS r(area_code TEXT,name TEXT,routine_block TEXT)
    WHERE a.area_id=ar.id AND ar.code=r.area_code AND a.name=r.name
      AND a.active=true AND a.valid_until IS NULL
      AND (a.routine_block IS NULL OR (ar.code='supervision' AND a.routine_block='operacion'))`;
};
