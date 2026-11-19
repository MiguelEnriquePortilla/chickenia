'use strict';
const {today,InventoryError}=require('./inventory-domain');

async function quickReport(query,view,day=today(new Date())){
  if(view==='arrivals'||view==='attendance-pending'){
    const people=await query(`
      SELECT e.name,a.entrada,a.salida FROM employees e
      JOIN locations l ON l.code='jojutla' AND l.active
      LEFT JOIN attendance_checks a ON a.employee_id=e.id AND a.location_id=l.id AND a.check_date=$1
      WHERE e.active
      ORDER BY a.entrada NULLS LAST,e.order_index,e.name`,[day]);
    const rows=view==='arrivals'?people.filter(row=>row.entrada).map(({name,entrada})=>({name,entrada})):
      people.filter(row=>!row.entrada||!row.salida).map(({name,entrada,salida})=>({
        name,missing:!entrada&&!salida?'both':!entrada?'entry':'exit'
      }));
    return {day,rows};
  }
  if(view==='operations'||view==='operations-pending'){
    const activities=await query(`
      SELECT s.name area,a.name,COALESCE(c.done,false) done,c.activity_id IS NOT NULL recorded
      FROM activities a JOIN areas s ON s.id=a.area_id
      JOIN locations l ON l.code='jojutla' AND l.active AND s.location_type=l.type
      LEFT JOIN activity_checks c ON c.activity_id=a.id AND c.location_id=l.id AND c.check_date=$1
      WHERE a.active AND s.active AND s.code<>'caja'
        AND a.name !~* '(^|[^a-z])caja([^a-z]|$)|cuadre|efectivo'
        AND (a.frequency IS DISTINCT FROM 'weekly' OR EXISTS
          (SELECT 1 FROM kitchen_plans kp WHERE kp.activity_id=a.id AND kp.plan_date=$1))
        AND (a.valid_from IS NULL OR a.valid_from<=$1)
        AND (a.valid_until IS NULL OR a.valid_until>$1)
      ORDER BY s.order_index,a.order_index,a.id`,[day]);
    if(view==='operations-pending')return {day,rows:activities.filter(row=>!row.done)};
    const areas=new Map();
    for(const {area,done} of activities){
      if(!areas.has(area))areas.set(area,{name:area,done:0,pending:0});
      areas.get(area)[done?'done':'pending']++;
    }
    return {day,rows:[...areas.values()]};
  }
  throw new InventoryError('Elige una consulta.',400);
}
module.exports={quickReport};
