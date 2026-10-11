'use strict';
const groups=[
 ['Rosticero',[['Pollo rostizado','pollos']]],
 ['Hornos',[['Pollo rostizado adicional','pollos'],['Costilla cocinada','kg']]],
 ['Freidoras',[['Pollo crujiente (Cruji)','pollos'],['Ensalada campesina','kg'],['Salsa verde','kg'],['Papas gajo','kg'],['Ensalada de codo','kg']]],
 ['Cocina',['Arroz blanco','Arroz rojo','Espagueti preparado','Nopales','Puré de papa','Papa cambray','Adobo tradicional','Crema para espagueti','Pasta de codo cocida','Pasta de espagueti cocida','Adobo 3 chiles','Adobo Chipotle','Cebolla fileteada','Ajo preparado','Guajillo cocido','Salsa barbecue','Marinado para rostizado'].map(name=>[name,'kg'])]
];
const catalog=groups.flatMap(([area,items],g)=>items.map(([name,unit],i)=>({id:`${g}-${i}`,area,name,unit})));
catalog.push({id:'other-1',area:'Cocina',name:'Otro',unit:'kg',custom:true},{id:'other-2',area:'Cocina',name:'Otro',unit:'kg',custom:true});
const fields=['previous','initial','additional','closing'];
const blank=()=>catalog.map(p=>({id:p.id,...(p.custom?{name:'',unit:'kg'}:{}),...Object.fromEntries(fields.map(f=>[f,null]))}));
function validate(lines){
 if(!Array.isArray(lines)||lines.length!==catalog.length||new Set(lines.map(l=>l.id)).size!==catalog.length)throw Error('Lista de productos inválida.');
 const parsed=catalog.map(p=>{
  const row=lines.find(l=>l.id===p.id);if(!row)throw Error('Producto inválido.');
  const out={id:p.id};if(p.custom){if(typeof row.name!=='string'||row.name.length>100)throw Error('Nombre de producto inv?lido.');if(!['kg','pollos','porciones','piezas','litros'].includes(row.unit))throw Error('Unidad inv?lida.');out.name=row.name.trim();out.unit=row.unit;}for(const f of fields){const v=row[f];if(v!==null&&(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1000000||Math.abs(v*1000-Math.round(v*1000))>1e-7))throw Error('Usa cantidades positivas con hasta tres decimales.');out[f]=v;}
  if(p.custom&&!out.name&&fields.some(f=>out[f]!=null))throw Error('Escribe el nombre del producto adicional.');
  if(out.closing!=null&&fields.slice(0,3).every(f=>out[f]!=null)&&out.closing>out.previous+out.initial+out.additional+1e-7)throw Error(p.name+': el sobrante supera la cantidad registrada.');
  return out;
 });
 const rosti=parsed[0];if((rosti.initial||0)+(rosti.additional||0)>30)throw Error('Rosticero produce solo 30 pollos al día. El pollo adicional va en Hornos.');
 return parsed;
}
function service(query){
 async function migrate(){
  await query('CREATE TABLE IF NOT EXISTS production_paper_days(date date PRIMARY KEY,revision integer NOT NULL,data jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())');
  await query('CREATE TABLE IF NOT EXISTS production_paper_history(date date NOT NULL,revision integer NOT NULL,data jsonb NOT NULL,actor text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(date,revision))');
 }
 function dateValid(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('Fecha inválida.');}
 async function get(date){dateValid(date);await migrate();const [r]=await query('SELECT revision,data FROM production_paper_days WHERE date=$1::date',[date]);return {date,revision:r?.revision||0,lines:r?.data||blank(),catalog};}
 async function save({date,revision,lines},actor){
  dateValid(date);if(!Number.isSafeInteger(revision)||revision<0)throw Error('Versión inválida.');const parsed=validate(lines);await migrate();
  const rows=await query(`WITH saved AS (
   INSERT INTO production_paper_days(date,revision,data) SELECT $1::date,1,$3::jsonb WHERE $2::int=0 OR EXISTS(SELECT 1 FROM production_paper_days WHERE date=$1::date)
   ON CONFLICT(date) DO UPDATE SET revision=production_paper_days.revision+1,data=excluded.data,updated_at=now() WHERE production_paper_days.revision=$2 RETURNING revision,data
  ), history AS (INSERT INTO production_paper_history(date,revision,data,actor) SELECT $1::date,revision,data,$4 FROM saved)
  SELECT revision FROM saved`,[date,revision,JSON.stringify(parsed),actor]);
  if(!rows.length)throw Object.assign(Error('La captura cambió. Recarga antes de continuar.'),{status:409});
  return {date,revision:rows[0].revision,lines:parsed,catalog};
 }
 return {get,save};
}
module.exports={catalog,fields,blank,validate,service};
