'use strict';
// Explicit public allowlist: no server source, credentials, tests or local databases.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'public');
fs.mkdirSync(out,{recursive:true});
const files=['index.html','supervision.html','dashboard.html','entrenamiento.html','inventario.html','preguntale.html','manifest.json','sw.js'];
for(const file of files)fs.copyFileSync(path.join(root,file),path.join(out,file));
for(const dir of ['css','js','icons','manual'])fs.cpSync(path.join(root,dir),path.join(out,dir),{recursive:true});
console.log('Public assets assembled in public/. API remains server-side.');
