'use strict';
// Run locally. Generates credentials into gitignored .local, never prints secrets.
const fs=require('node:fs'),path=require('node:path'),{randomBytes}=require('node:crypto');
const {passwordHash}=require('../lib/inventory-auth');
const folder=path.resolve(__dirname,'../.local');fs.mkdirSync(folder,{recursive:true});
const target=path.join(folder,'inventory-production.env');
if(fs.existsSync(target))throw new Error('Ya existe configuración. No se reemplazarán las credenciales.');
const profiles=[['nancy','Nancy','manager'],['lilian','Lilian','dispatch'],['eliseo','Eliseo','processor'],['cocina','Jefa de cocina','kitchen'],['miguel','Miguel','manager']];
const credentials=profiles.map(([id,name,role])=>({id,name,role,password:randomBytes(18).toString('base64url')}));
const users=credentials.map(({password,...u})=>({...u,hash:passwordHash(password)}));
fs.writeFileSync(target,`INVENTORY_SESSION_SECRET=${randomBytes(48).toString('base64url')}\nINVENTORY_USERS_JSON=${JSON.stringify(users)}\n`,{mode:0o600});
fs.writeFileSync(path.join(folder,'inventory-accounts.json'),JSON.stringify(credentials,null,2),{mode:0o600});
console.log('Configuración generada en .local/inventory-production.env; cuentas en .local/inventory-accounts.json. No subir estos archivos a GitHub.');
