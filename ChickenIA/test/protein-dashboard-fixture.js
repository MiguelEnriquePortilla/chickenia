'use strict';
const domain=require('../lib/protein-inventory');
// Fictional quantities, exclusively for disposable local databases.
async function seed(query){
 const user={id:'demo',name:'Equipo de prueba',role:'manager'};
 for(const inventory of ['sucursal','movil']){
  const d=domain.forInventory(inventory);let revision=0;
  async function save(date,protein,action,extra){const r=await d.save(query,{date,protein,action,revision,...extra},user);revision=r.revision;return r;}
  await save('2026-09-21','rosti','initial',{raw:inventory==='sucursal'?150:70,marinated:inventory==='sucursal'?50:20});
  if(inventory==='sucursal')await save('2026-09-21','cruji','initial',{raw:80,marinated:55});
  for(const [date,amount] of [['2026-09-22',10],['2026-09-23',15],['2026-09-24',20]]){
   await save(date,'rosti','entry',{amount});await save(date,'rosti','marinate',{amount});
   let r=await save(date,'rosti','send',{amount,slot:'morning'});
   await save(date,'rosti','receive',{shipment:r.shipments.at(-1).id,amount});
  }
  await save('2026-09-25','rosti','send',{amount:10,slot:'other'});
  await save('2026-09-26','rosti','marinate',{amount:30});
  let r=await save('2026-09-26','rosti','send',{amount:inventory==='sucursal'?30:25,slot:'morning'});
  await save('2026-09-26','rosti','receive',{shipment:r.shipments.at(-1).id,amount:inventory==='sucursal'?29.5:25,notes:'Diferencia ficticia para demostración'});
  if(inventory==='sucursal'){
   r=await save('2026-09-26','cruji','send',{amount:30,slot:'morning'});
   await save('2026-09-26','cruji','receive',{shipment:r.shipments.at(-1).id,amount:30});
  }
 }
}
module.exports={seed};
