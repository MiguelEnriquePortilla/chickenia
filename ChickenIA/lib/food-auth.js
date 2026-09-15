'use strict';
const {InventoryError}=require('./inventory-domain');
function configuration(env=process.env){
  const resource=env.FOODIA_RESOURCE_URL,issuer=env.FOODIA_OAUTH_ISSUER,jwks=env.FOODIA_OAUTH_JWKS_URL;
  for(const value of [resource,issuer,jwks]){
    let url;try{url=new URL(value);}catch{throw new InventoryError('Falta configurar el acceso FoodIA.',503);}
    if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search)throw new InventoryError('Configuración FoodIA inválida.',503);
  }
  let members;try{members=JSON.parse(env.FOODIA_MEMBERS_JSON);}catch{throw new InventoryError('Falta configurar usuarios FoodIA.',503);}
  if(!Array.isArray(members)||!members.length||members.some(m=>typeof m.subject!=='string'||!m.subject||typeof m.id!=='string'||!m.id||typeof m.name!=='string'||!m.name||m.business!=='chicanito'||!['reader','operator'].includes(m.role)))throw new InventoryError('Usuarios FoodIA inválidos.',503);
  if(new Set(members.map(m=>m.subject)).size!==members.length||new Set(members.map(m=>m.id)).size!==members.length)throw new InventoryError('Identidades FoodIA duplicadas.',503);
  return {resource,issuer,jwks,members};
}
function metadata(config){return {resource:config.resource,authorization_servers:[config.issuer],scopes_supported:['foodia:read','foodia:write'],bearer_methods_supported:['header']};}
let keyUrl,keySet;
async function authenticate(req,config=configuration(),verify){
  const match=/^Bearer ([^\s]+)$/i.exec(req.headers.authorization||'');
  if(!match||match[1].length>16000)throw new InventoryError('Vincula tu cuenta con FoodIA.',401);
  try{
    const jose=await import('jose');
    if(!verify){if(keyUrl!==config.jwks){keyUrl=config.jwks;keySet=jose.createRemoteJWKSet(new URL(keyUrl));}verify=(token)=>jose.jwtVerify(token,keySet,{issuer:config.issuer,audience:config.resource,algorithms:['RS256'],requiredClaims:['sub','exp','iat'],maxTokenAge:'1h',clockTolerance:5});}
    const {payload}=await verify(match[1]);
    const member=config.members.find(m=>m.subject===payload.sub);
    if(!member)throw new InventoryError('Tu cuenta no tiene acceso a este negocio.',403);
    const scopes=typeof payload.scope==='string'?payload.scope.split(' '):[];
    if(!scopes.includes('foodia:read'))throw new InventoryError('Falta permiso de consulta.',403);
    return {id:member.id,name:member.name,role:'manager',business:member.business,canWrite:member.role==='operator'&&scopes.includes('foodia:write')};
  }catch(e){if(e instanceof InventoryError)throw e;throw new InventoryError('Sesión FoodIA inválida o vencida.',401);}
}
module.exports={configuration,metadata,authenticate};
