'use strict';
const STATES=['A','F','D','V','P'];
const key=name=>String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(' ')[0];
function rate(row){
 return row.fullTime&&row.fullTimeSalary?row.fullTimeSalary:row.salary;
}
function calculate(row){
 const r=rate(row),worked=row.days.filter(d=>d==='A').length;
 const pay=worked===0?0:Math.max(0,r.weekly+(worked-6)*r.daily);
 return {...r,worked,pay,total:Math.round((pay+Number(row.bonus||0)-Number(row.discount||0))*100)/100};
}
function validateWeek(rows,{complete=true}={}){
 if(!Array.isArray(rows)||!rows.length||rows.length>100)throw Error('Lista de personal inválida.');
 const ids=new Set();let full=0;
 for(const row of rows){
  if(row.id!==undefined){if(!Number.isInteger(row.id)||ids.has(row.id))throw Error('Empleado inválido o repetido.');ids.add(row.id);}
  if(!Array.isArray(row.days)||row.days.length!==7||row.days.some(d=>!(complete?STATES:['',...STATES]).includes(d)))throw Error('Marca los siete días de cada empleado.');
  if(typeof row.fullTime!=='boolean')throw Error('Selección de cajera inválida.');
  if(row.fullTime){full++;if(!['petra','maricruz'].includes(key(row.name)))throw Error('Solo Petra o Maricruz pueden ser cajera de tiempo completo.');}
  for(const field of ['bonus','discount'])if(typeof row[field]!=='number'||!Number.isFinite(row[field])||row[field]<0||row[field]>100000||Math.round(row[field]*100)!==row[field]*100&&Math.abs(Math.round(row[field]*100)-row[field]*100)>1e-7)throw Error('Revisa el importe de bono o descuento.');
  if(typeof row.reason!=='string'||row.reason.length>300||row.discount>0&&!row.reason.trim())throw Error('Especifica el motivo del descuento (máximo 300 caracteres).');
  if(typeof row.meal!=='string'||row.meal.length>60)throw Error('Horario de comida inválido.');
 }
 if(full>1)throw Error('Elige solo una cajera de tiempo completo.');
 if(complete&&rows.some(r=>['petra','maricruz'].includes(key(r.name)))&&full!==1)throw Error('Marca la cajera de tiempo completo de esta semana.');
}
function monday(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))throw Error('Fecha inválida.');
 const d=new Date(value+'T12:00:00Z');if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==value)throw Error('Fecha inválida.');
 d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);
}
const Payroll={STATES,key,rate,calculate,validateWeek,monday};
if(typeof module!=='undefined')module.exports=Payroll;else window.Payroll=Payroll;
