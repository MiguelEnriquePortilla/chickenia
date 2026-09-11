const routines = require('./rosticero-routines');

module.exports = async function migrateRoutines(sql, weights) {
  await sql`ALTER TABLE activities ADD COLUMN IF NOT EXISTS routine_block TEXT`;
  await sql`ALTER TABLE activities ADD COLUMN IF NOT EXISTS valid_from DATE`;
  await sql`ALTER TABLE activities ADD COLUMN IF NOT EXISTS valid_until DATE`;
  await sql`CREATE TABLE IF NOT EXISTS checklist_catalog_versions (
    version TEXT PRIMARY KEY, effective_date DATE NOT NULL
  )`;
  await sql`ALTER TABLE activities ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'daily'`;
  await sql`CREATE TABLE IF NOT EXISTS kitchen_plans (activity_id INT REFERENCES activities(id), plan_date DATE, kg NUMERIC NOT NULL CHECK(kg>0), scheduled_by TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT now(), PRIMARY KEY(activity_id, plan_date))`;
  for (const [areaCode, versionId, catalog] of [['rosticero','rosticero-routines-2026-09-11',routines],['cocina','cocina-routines-2026-09-11',require('./cocina-routines')]]) {
  const records = catalog.map(([name, criticality, requires_quantity, unit, indicator_type, target, routine_block, frequency='daily'], i) => ({
    name, criticality, weight: weights[criticality], requires_quantity, unit,
    indicator_type, target, routine_block, frequency, order_index: i + 1,
  }));
  // One atomic statement: only the request that claims this version changes the
  // catalogue. Old activity IDs/checks remain available for dates before activation.
  await sql`
    WITH version AS (
      INSERT INTO checklist_catalog_versions (version, effective_date)
      SELECT ${versionId}, (now() AT TIME ZONE 'America/Mexico_City')::date
        + CASE WHEN EXISTS (
          SELECT 1 FROM activity_checks c JOIN activities a ON a.id=c.activity_id
          JOIN areas ar ON ar.id=a.area_id WHERE ar.code=${areaCode}
            AND c.check_date=(now() AT TIME ZONE 'America/Mexico_City')::date
        ) THEN 1 ELSE 0 END
      WHERE EXISTS (SELECT 1 FROM areas WHERE code = ${areaCode})
      ON CONFLICT DO NOTHING RETURNING effective_date
    ), retired AS (
      UPDATE activities SET valid_until = version.effective_date
      FROM areas, version
      WHERE activities.area_id = areas.id AND areas.code = ${areaCode}
        AND activities.active = true AND activities.valid_until IS NULL
      RETURNING activities.id
    )
    INSERT INTO activities (area_id, name, criticality, weight, requires_quantity,
      unit, indicator_type, target, routine_block, frequency, order_index, valid_from)
    SELECT areas.id, r.name, r.criticality, r.weight, r.requires_quantity,
      r.unit, r.indicator_type, r.target, r.routine_block, r.frequency, r.order_index, version.effective_date
    FROM areas CROSS JOIN version CROSS JOIN jsonb_to_recordset(${JSON.stringify(records)}::jsonb)
      AS r(name TEXT, criticality TEXT, weight INT, requires_quantity BOOLEAN,
        unit TEXT, indicator_type TEXT, target TEXT, routine_block TEXT, frequency TEXT, order_index INT)
    WHERE areas.code = ${areaCode}
  `;
  }
};
