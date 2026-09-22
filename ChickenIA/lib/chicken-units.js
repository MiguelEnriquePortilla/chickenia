'use strict';
// The old inventory ledger retains its original units (cooked CRUJI in pieces).
// Convert only at the explicit pollos API boundary, including historical views.
const ids=['pollo-enhielado','rosti-marinado','cruji-marinado','rosti-cocinado','cruji-cocinado'];
const cooked='cruji-cocinado';
function display(value,parentItem){
 if(Array.isArray(value))return value.map(v=>display(v,parentItem));
 if(!value||typeof value!=='object')return value;
 const item=value.item||(ids.includes(value.id)?value.id:parentItem),out={};
 for(const [key,v] of Object.entries(value)){
  if(key==='balances'){out[key]=Object.fromEntries(Object.entries(v).map(([k,n])=>[k,k.endsWith(':'+cooked)?n/8:n]));continue;}
  if(item===cooked&&['qty','quantity','expected','previous','entries','exits','current','difference','output'].includes(key)&&typeof v==='number'){out[key]=v/8;continue;}
  if(ids.includes(item)&&key==='unit'){out[key]='pollos';continue;}
  if(ids.includes(item)&&key==='step'){out[key]=1;continue;}
  out[key]=display(v,item);
 }
 if(value.recipe==='freir'&&typeof value.output==='number')out.output=value.output/8;
 return out;
}
function command(value){
 const out=structuredClone(value);
 for(const key of ['lines','inputs','outputs'])if(Array.isArray(out[key]))for(const line of out[key])if(line.item===cooked)line.qty=toPieces(line.qty);
 if(out.type==='sale'&&out.presentation==='article'&&out.item===cooked)out.qty=toPieces(out.qty);
 return out;
}
function toPieces(value){
 const n=Number(value);
 if(!['string','number'].includes(typeof value)||String(value).trim()===''||!Number.isFinite(n)||n<0||n>1000000||Math.abs(n*1000-Math.round(n*1000))>1e-6)throw Object.assign(Error('Captura pollos con hasta tres decimales.'),{status:400});
 return Math.round(n*1000)*8/1000;
}
const isChicken=a=>a.unit==='pollos'||/pollo|cruji/i.test(a.name||'')&&['pieza','piezas'].includes(a.unit);
const legacyActivity=a=>isChicken(a)&&a.unit!=='pollos';
function activity(a){return legacyActivity(a)?{...a,unit:'pollos',target:a.target?.includes('piezas')?a.target.replace(/\d+(?:\.\d+)?/g,n=>String(Number(n)/8)).replace(/piezas/g,'pollos'):a.target}:a;}
function check(row,a){return row&&isChicken(a)?{...row,unit:'pollos',quantity:legacyActivity(a)&&row.quantity!=null?Number(row.quantity)/8:row.quantity}:row;}
module.exports={ids,display,command,isChicken,legacyActivity,activity,check,toPieces};
