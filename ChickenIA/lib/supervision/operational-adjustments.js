'use strict';
// New versions of only the changed tasks; previous IDs and captures remain intact.
const changes = [
 {area:'cocina',old:'Zanahoria en palitos para campesina',to:'freidoras',name:'Zanahoria en palitos para campesina',block:'apertura'},
 {area:'rosticero',old:'Recibir y montar producción inicial de cocina y freidoras',remove:true},
 {area:'rosticero',old:'Verificar desechables, consumibles y adobo envasado para apertura',remove:true},
 {area:'ventas_barras',old:'Organizar barras para arranque',name:'Organizar barras para arranque',target:'Cruji · Papas gajo · Campesina · Salsas · Ensalada de col · Puré de papa · Codo · Desechables · Consumibles',block:'apertura'},
 {area:'ventas_barras',old:'Mantener productos hidratados todo el día',name:'Mantener productos hidratados todo el día, incluyendo ensaladas',measurement:'percentage',target:'Cumplimiento observado de 0 a 100%. Meta: 100%.',block:'operacion'},
 {area:'ventas_barras',old:'Atención al cliente según estándares Chicanito',name:'Atención al cliente según estándares Chicanito',measurement:'percentage',target:'Cumplimiento observado de 0 a 100%. Meta: 100%.',block:'operacion'},
 {area:'ventas_barras',old:'Ofrecer promociones y ensaladas',name:'Promo del día',measurement:'promotion',target:'Ofrecer la promoción del día. Escribir cuál es en Observaciones.',block:'operacion'},
 {area:'ventas_barras',old:'Bajar productos a partir de las 5pm',name:'Cierre parcial de barra con conteo de inventario sobrante',measurement:'bar-close',target:'Contar el sobrante a esta hora y solicitar autorización antes de bajar productos.',block:'operacion'},
 {area:'supervision',old:'Preparar el reporte de apertura',remove:true},
];
async function migrate(sql) {
 await sql`ALTER TABLE activities ADD COLUMN IF NOT EXISTS measurement TEXT`;
 await sql`ALTER TABLE activity_checks ADD COLUMN IF NOT EXISTS closure JSONB`;
 await sql`WITH version AS (
  INSERT INTO checklist_catalog_versions(version,effective_date)
  VALUES('operational-adjustments-2026-09-25-v1',(now() AT TIME ZONE 'America/Mexico_City')::date)
  ON CONFLICT DO NOTHING RETURNING effective_date
 ), retired AS (
  UPDATE activities a SET valid_until=v.effective_date
  FROM version v, areas ar, jsonb_to_recordset(${JSON.stringify(changes)}::jsonb) r(area TEXT,old TEXT)
  WHERE a.area_id=ar.id AND ar.code=r.area AND a.name=r.old AND a.active=true AND a.valid_until IS NULL
  RETURNING a.*
 ) INSERT INTO activities(area_id,name,criticality,weight,requires_quantity,unit,indicator_type,target,routine_block,frequency,order_index,valid_from,measurement)
 SELECT dest.id,r.name,a.criticality,a.weight,a.requires_quantity,a.unit,
  CASE WHEN r.measurement='percentage' THEN 'CALIDAD' ELSE a.indicator_type END,
  COALESCE(r.target,a.target),COALESCE(r.block,a.routine_block),a.frequency,
  CASE WHEN r."to" IS NOT NULL THEN 4 ELSE a.order_index END,v.effective_date,r.measurement
 FROM retired a JOIN areas ar ON ar.id=a.area_id
 JOIN jsonb_to_recordset(${JSON.stringify(changes)}::jsonb)
  r(area TEXT,old TEXT,"to" TEXT,name TEXT,remove BOOLEAN,target TEXT,block TEXT,measurement TEXT)
  ON r.area=ar.code AND r.old=a.name
 JOIN areas dest ON dest.code=COALESCE(r."to",r.area)
 CROSS JOIN version v WHERE NOT COALESCE(r.remove,false)`;
}
module.exports={changes,migrate};
