'use strict';
const domain=require('../js/payroll-domain');
function withRates(row){
 const name=domain.key(row.name);
 const salary={nancy:{weekly:3500,daily:583},eliseo:{weekly:2600,daily:434},julissa:{weekly:2700,daily:450}}[name]||{weekly:2400,daily:400};
 return {...row,salary,...(['petra','maricruz'].includes(name)?{fullTimeSalary:{weekly:2800,daily:467}}:{})};
}
module.exports={...domain,withRates,rate:row=>domain.rate(withRates(row)),calculate:row=>domain.calculate(withRates(row))};
