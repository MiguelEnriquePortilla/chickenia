const {test}=require('node:test');
const assert=require('node:assert/strict');
const {calculate,rate,validateWeek}=require('../lib/payroll');
test('sueldos completos y ajustes diarios acordados',()=>{
 for(const [name,base,daily,bonus] of [['Ana',2400,400,0],['Nancy Rentería',3500,583,1000],['Eliseo Barreto',2600,434,0],['Julissa Mendoza',2700,450,0]]){
 const row={name,fullTime:false,meal:'',days:['A','A','A','A','A','A','D'],bonus,discount:0,reason:''};
 assert.equal(calculate(row).total,base+bonus);
 row.days[0]='F';assert.equal(calculate(row).total,base-daily+bonus);
 row.days.fill('A');assert.equal(calculate(row).total,base+daily+bonus);
 row.days.fill('V');assert.equal(calculate(row).pay,0);
 }
});
test('cajera, vacaciones, permisos y descuentos manuales',()=>{
 const row={name:'Petra Estrada',fullTime:true,meal:'',days:['A','A','A','A','V','P','D'],bonus:0,discount:100,reason:'Anticipo'};
 assert.equal(rate(row).weekly,2800);assert.equal(calculate(row).total,2800-934-100);
 assert.throws(()=>validateWeek([{...row,days:['A']}]),/siete/);
 assert.throws(()=>validateWeek([{...row,reason:''}]),/motivo/);
 assert.throws(()=>validateWeek([{...row,discount:-1}]),/importe/);
 assert.throws(()=>validateWeek([{...row,name:'Ana',fullTime:true}]),/cajera/);
});
