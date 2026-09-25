'use strict';
const products=[['cruji','Cruji','pollos'],['papas','Papas gajo','kg'],['campesina','Campesina','kg'],['salsas','Salsas','kg'],['col','Ensalada de col','kg'],['pure','Puré de papa','kg'],['codo','Codo','kg']];
function credit(row){
 if(!row.done)return 0;
 if(row.measurement!=='percentage')return 1;
 return Number.isInteger(row.quality_score)&&row.quality_score>=0&&row.quality_score<=100?row.quality_score/100:0;
}
function validate(activity,body,user){
 const fail=message=>{throw Object.assign(Error(message),{status:400});};
 if(activity.measurement==='percentage'&&(body.done||body.quality_score!=null)){
  if(!Number.isInteger(body.quality_score)||body.quality_score<0||body.quality_score>100)fail('Captura un porcentaje entero entre 0 y 100.');
 }
 if(activity.measurement==='promotion'&&body.done&&(!body.notes||body.notes.trim().length<3))fail('Escribe cuál es la promo del día en Observaciones.');
 if(activity.measurement!=='bar-close')return null;
 if(user?.role!=='manager')throw Object.assign(Error('El cierre parcial requiere la autorización de gerencia con la sesión actual de ChickenIA.'),{status:403});
 if(!body.done)return null;
 if(body.authorize_closure!==true)fail('Confirma la autorización del cierre parcial.');
 const lines=body.closure?.lines;
 if(!Array.isArray(lines)||lines.length!==products.length)fail('Completa el conteo de todos los productos; escribe 0 cuando no haya sobrante.');
 const normalized=products.map(([id,name,unit])=>{
  const matches=lines.filter(l=>l.product===id),line=matches[0];
  if(matches.length!==1||line.unit!==unit||typeof line.quantity!=='number'||!Number.isFinite(line.quantity)||line.quantity<0||line.quantity>1000000||Math.abs(line.quantity*1000-Math.round(line.quantity*1000))>1e-6)fail('Revisa el sobrante de '+name+' en '+unit+'.');
  return {product:id,name,unit,quantity:line.quantity};
 });
 return {lines:normalized,authorized_by:user.id,authorized_name:user.name,authorized_at:new Date().toISOString()};
}
module.exports={credit,validate,products};
