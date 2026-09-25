'use strict';
// Refresh training from the actual catalogs and apply the current adjustments.
const fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'../entrenamiento.html');
const legacy=require('../lib/supervision/db').SEED_ACTIVITIES;
const catalogs={...legacy,...require('../lib/supervision/rastro-sucursal-routines').build(legacy),cocina:require('../lib/supervision/cocina-routines'),rosticero:require('../lib/supervision/rosticero-routines')};
const {changes}=require('../lib/supervision/operational-adjustments');
const labels={rastro:'Rastro',sucursal_apertura:'Apertura de Sucursal',cocina:'Cocina',freidoras:'Freidoras',rosticero:'Rosticero',ventas_barras:'Ventas / Barras',supervision:'Supervisión (tienda)'};
let html=fs.readFileSync(file,'utf8');
const match=html.match(/const AREAS = ([\s\S]*?\n\]);/);
if(!match)throw Error('No se encontró el catálogo imprimible.');
const entries=require('node:vm').runInNewContext('('+match[1]+')');
for(const [code,name] of Object.entries(labels)){
 const entry=entries.find(e=>e.name===name);if(!entry)throw Error('Falta '+name);
 entry.activities=catalogs[code].map(r=>[...r]);delete entry.blankRows;
}
for(const c of changes){
 const source=entries.find(e=>e.name===labels[c.area]);
 const i=source.activities.findIndex(r=>r[0]===c.old);if(i<0)throw Error('Falta '+c.old);
 const row=source.activities[i];
 if(c.remove||c.to)source.activities.splice(i,1);
 if(c.remove)continue;
 row[0]=c.name;if(c.target)row[5]=c.target;if(c.block)row[6]=c.block;
 if(c.to)entries.find(e=>e.name===labels[c.to]).activities.push(row);
}
html=html.replace(match[0],'const AREAS = '+JSON.stringify(entries,null,2)+';');
fs.writeFileSync(file,html);
console.log('Training sections synchronized.');
