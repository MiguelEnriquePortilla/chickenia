'use strict';
// Temporary shared access explicitly requested for the UI/operation pilot.
// Set CHICKENIA_PILOT_ACCESS=0 to restore configured individual accounts.
const {createHash}=require('node:crypto');
const enabled=()=>process.env.CHICKENIA_PILOT_ACCESS!=='0';
const hash='scrypt$1b60466535844cb6fe5491c007e51044$24edefa1b588f2d6568a7bcd3e427a02c4954d6a4b608206e4cc1eca95da60a93a968adf05a918edf6b73f88cdb1a8f125ac7b231e28f237626bac15d67b2441';
const canonical=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
function user(name,users=[]){
  if(typeof name!=='string')return null;
  name=name.trim().replace(/\s+/g,' ');
  if(name.length<2||name.length>40||!/[\p{L}\p{N}]/u.test(name)||/[^\p{L}\p{N} .'-]/u.test(name))return null;
  const key=canonical(name),existing=users.find(u=>canonical(u.id)===key||canonical(u.name)===key);
  const id=existing?.id||key.replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'piloto-'+createHash('sha256').update(key).digest('hex').slice(0,16);
  return {id,name:existing?.name||name,role:'manager',pilot:true,hash};
}
module.exports={enabled,hash,user};
