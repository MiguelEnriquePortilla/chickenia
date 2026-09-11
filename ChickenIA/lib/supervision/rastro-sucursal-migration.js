'use strict';
module.exports=async function migrate(sql,weights,legacy){
  const catalogs=require('./rastro-sucursal-routines').build(legacy);
  await sql`INSERT INTO areas(code,name,location_type,order_index) VALUES('sucursal_apertura','Apertura de Sucursal','tienda',9) ON CONFLICT(code) DO NOTHING`;
  const records=Object.entries(catalogs).flatMap(([area_code,rows])=>rows.map(([name,criticality,requires_quantity,unit,indicator_type,target,routine_block],i)=>({area_code,name,criticality,weight:weights[criticality],requires_quantity,unit,indicator_type:indicator_type||null,target:target||null,routine_block,order_index:i+1})));
  // All three areas switch on one date and in one statement. Today's captured
  // catalogue stays intact; no partial rollout can double-count a transferred task.
  await sql`WITH version AS (
    INSERT INTO checklist_catalog_versions(version,effective_date)
    VALUES('rastro-sucursal-supervision-v1', (now() AT TIME ZONE 'America/Mexico_City')::date + CASE WHEN EXISTS(
      SELECT 1 FROM activity_checks c JOIN activities a ON a.id=c.activity_id JOIN areas ar ON ar.id=a.area_id
      WHERE ar.code IN ('rastro','sucursal_apertura','supervision') AND c.check_date=(now() AT TIME ZONE 'America/Mexico_City')::date
    ) THEN 1 ELSE 0 END) ON CONFLICT DO NOTHING RETURNING effective_date
  ), retired AS (
    UPDATE activities SET valid_until=version.effective_date FROM areas,version
    WHERE activities.area_id=areas.id AND areas.code IN ('rastro','sucursal_apertura','supervision')
      AND activities.active=true AND activities.valid_until IS NULL RETURNING activities.id
  ) INSERT INTO activities(area_id,name,criticality,weight,requires_quantity,unit,indicator_type,target,routine_block,frequency,order_index,valid_from)
    SELECT ar.id,r.name,r.criticality,r.weight,r.requires_quantity,r.unit,r.indicator_type,r.target,r.routine_block,'daily',r.order_index,version.effective_date
    FROM version CROSS JOIN jsonb_to_recordset(${JSON.stringify(records)}::jsonb)
      AS r(area_code TEXT,name TEXT,criticality TEXT,weight INT,requires_quantity BOOLEAN,unit TEXT,indicator_type TEXT,target TEXT,routine_block TEXT,order_index INT)
    JOIN areas ar ON ar.code=r.area_code`;
};
