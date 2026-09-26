'use strict';
const domain=require('./protein-inventory');
const view=require('../js/protein-summary');
async function snapshot(sql,date){
 const [tables]=await sql`SELECT to_regclass('public.inventory_items') AS items, to_regclass('public.inventory_movements') AS movements`;
 if(!tables.items||!tables.movements)return {groups:view.summarize([]),lines:view.lines(view.summarize([]))};
 const catalogs=['sucursal','movil'].map(key=>({key,domain:domain.forInventory(key)}));
 const skus=catalogs.flatMap(c=>c.domain.catalog.map(i=>i.sku));
 // One database statement captures both independent ledgers at the same instant.
 const movements=await sql`SELECT m.*,m.movement_date::text AS day,i.sku FROM inventory_movements m JOIN inventory_items i ON i.id=m.item_id JOIN locations l ON l.id=m.location_id WHERE l.code='rastro' AND l.active=true AND i.sku=ANY(${skus}::text[]) ORDER BY m.movement_date,m.id`;
 const reports=catalogs.map(c=>c.domain.reportMovements(movements,date));
 const groups=view.summarize(reports);
 return {groups,lines:view.lines(groups)};
}
module.exports={snapshot};
