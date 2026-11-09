'use strict';
const core=require('./calibre');
function responsibilities(query){
 async function migrate(){
  await require('./attendance-roster').correctMaurilio(query);
  await query('CREATE TABLE IF NOT EXISTS calibre_assignment_settings(id INT PRIMARY KEY CHECK(id=1),start_date DATE NOT NULL)');
  await query("INSERT INTO calibre_assignment_settings VALUES(1,(now() AT TIME ZONE 'America/Mexico_City')::date) ON CONFLICT DO NOTHING");
  await query('CREATE TABLE IF NOT EXISTS calibre_assignments(location_id INT NOT NULL REFERENCES locations(id),date DATE NOT NULL,area TEXT NOT NULL,employee_id INT NOT NULL REFERENCES employees(id),actor TEXT NOT NULL,assigned_at TIMESTAMPTZ NOT NULL,PRIMARY KEY(location_id,date,area),UNIQUE(date,employee_id))');
 }
 async function start(){return (await query('SELECT start_date::text FROM calibre_assignment_settings WHERE id=1'))[0].start_date;}
 async function list(location,date){return query('SELECT a.area,a.employee_id AS id,e.name,a.actor,a.assigned_at FROM calibre_assignments a JOIN employees e ON e.id=a.employee_id WHERE a.location_id=$1 AND a.date=$2::date',[location,date]);}
 async function employees(){return query('SELECT id,name,active FROM employees ORDER BY order_index,id');}
 async function requireAssigned(location,date){if(date<await start())return;const rows=await list(location,date);return rows;}
 async function assign(location,date,body,user,now){
  if(date!==core.day(now))core.fail('El histórico se conserva. Solo puedes asignar el día actual.',409);
  if(!core.AREAS.some(a=>a.code===body.area))core.fail('Área desconocida.');
  if(!Number.isSafeInteger(body.employeeId)||body.employeeId<1)core.fail('Selecciona una persona activa.');
  const existing=(await list(location,date)).find(a=>a.area===body.area);
  if(existing){if(existing.id===body.employeeId)return;core.fail('El responsable del área ya está asignado y no puede cambiar hoy.',409);}
  const [employee]=await query('SELECT id FROM employees WHERE id=$1 AND active=true',[body.employeeId]);
  if(!employee)core.fail('Selecciona una persona activa.');
  const added=await query('INSERT INTO calibre_assignments(location_id,date,area,employee_id,actor,assigned_at) SELECT $1,$2::date,$3,id,$5,$6::timestamptz FROM employees WHERE id=$4 AND active=true ON CONFLICT DO NOTHING RETURNING employee_id',[location,date,body.area,body.employeeId,user.name,now.toISOString()]);
  if(!added.length){const same=(await list(location,date)).find(a=>a.area===body.area&&a.id===body.employeeId);if(!same)core.fail('La persona o el área ya tiene una asignación para hoy. No se permite cambiarla.',409);}
 }
 async function personHistory(location,employeeId,from,to){
  if(!Number.isSafeInteger(employeeId)||employeeId<1||!core.dateOK(from)||!core.dateOK(to)||from>to||Date.parse(to)-Date.parse(from)>366*86400000)core.fail('Elige una persona y un periodo válido de hasta un año.');
  const [person]=await query('SELECT id,name,active FROM employees WHERE id=$1',[employeeId]);if(!person)core.fail('Persona desconocida.',404);
  const rows=await query('SELECT a.date::text,a.area,a.actor AS assigned_by,a.assigned_at,d.spec,d.data FROM calibre_assignments a LEFT JOIN calibre_days d ON d.location_id=a.location_id AND d.date=a.date AND d.area=a.area WHERE a.location_id=$1 AND a.employee_id=$2 AND a.date BETWEEN $3::date AND $4::date ORDER BY a.date DESC',[location,employeeId,from,to]);
  const entries=rows.map(r=>{const spec=r.spec||core.AREAS.find(a=>a.code===r.area),data=r.data||core.blank();return {date:r.date,area:r.area,areaName:spec.name,assignedBy:r.assigned_by,assignedAt:r.assigned_at,...core.checklistScore(spec,data),points:data.checklistPoints||data.points||{},extras:core.simpleExtras(data),feedback:data.feedback||null,feedbackStatus:core.feedback.status(r.date,data),spec};});
  const scored=entries.filter(e=>e.score!==null);return {person,from,to,entries,evaluated:scored.length,average:scored.length?scored.reduce((n,e)=>n+e.score,0)/scored.length:null};
 }
 return {migrate,start,list,employees,requireAssigned,assign,personHistory};
}
module.exports={responsibilities};
