'use strict';
// Explicit public allowlist: no server source, credentials, tests or local databases.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'public');
fs.mkdirSync(out,{recursive:true});
const files=['index.html','supervision.html','evaluacion-equipo.html','supervision-anterior.html','supervision-historico.html','rastro.html','proteinas.html','proteinas-movil.html','dashboard.html','entrenamiento.html','inventario.html','produccion-diaria.html','preguntale.html','pedidos.html','manifest.json','sw.js'];
for(const file of files)fs.copyFileSync(path.join(root,file),path.join(out,file));
for(const dir of ['css','js','icons'])fs.cpSync(path.join(root,dir),path.join(out,dir),{recursive:true});
// Old manuals remain local archives; publish only the maintained HTML guide.
const manual=path.join(out,'manual');
if(!manual.startsWith(out+path.sep))throw Error('Invalid build path');
fs.rmSync(manual,{recursive:true,force:true});fs.mkdirSync(manual,{recursive:true});
fs.copyFileSync(path.join(root,'manual/manual.html'),path.join(manual,'manual.html'));
console.log('Public assets assembled in public/. API remains server-side.');
const daily=path.join(out,'daily');fs.mkdirSync(daily,{recursive:true});
for(const file of ['app.js','style.css'])fs.copyFileSync(path.join(root,'lib/cash-ui',file),path.join(daily,file));
const capture=fs.readFileSync(path.join(root,'lib/cash-ui/index.html'),'utf8')
  .replace(/<body([^>]*)>/,'<body$1 data-environment="production">')
  .replace('href="/style.css"','href="/daily/style.css"').replace('src="/app.js"','src="/daily/app.js"');
fs.writeFileSync(path.join(out,'captura.html'),capture);
