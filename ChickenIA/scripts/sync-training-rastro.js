'use strict';
// Refresh only these three sections of the standalone training sheet.
const fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'../entrenamiento.html');
const catalogs=require('../lib/supervision/rastro-sucursal-routines').build(require('../lib/supervision/db').SEED_ACTIVITIES);
let html=fs.readFileSync(file,'utf8');
const start=html.indexOf("  { name: 'Rastro', activities:");
const end=html.indexOf("  { name: 'Cocina',",start);
if(start<0||end<0)throw new Error('No se localizaron los apartados de entrenamiento.');
html=html.slice(0,start)+"  { name: 'Rastro', activities: "+JSON.stringify(catalogs.rastro,null,2)+" },\n  { name: 'Apertura de Sucursal', activities: "+JSON.stringify(catalogs.sucursal_apertura,null,2)+" },\n"+html.slice(end);
const supervisionStart=html.indexOf("  { name: 'Supervisión (tienda)',");
const supervisionEnd=html.indexOf("  { name: 'Moto — Recepción',",supervisionStart);
if(supervisionStart<0||supervisionEnd<0)throw new Error('No se localizó Supervisión.');
html=html.slice(0,supervisionStart)+"  { name: 'Supervisión (tienda)', activities: "+JSON.stringify(catalogs.supervision,null,2)+" },\n"+html.slice(supervisionEnd);
fs.writeFileSync(file,html);
console.log('Training sections synchronized.');
