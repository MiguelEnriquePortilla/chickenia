'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const auth=require('../lib/inventory-auth'),handler=require('../lib/daily-handler');
test('retired financial routes reject reads, calculations and writes without touching storage',async()=>{
 const original=auth.authenticate;auth.authenticate=()=>({id:'test',role:'manager'});
 try{for(const [action,method] of [['daily-get','GET'],['daily-save','POST'],['daily-calculate','POST']]){
  let status;await handler({method,query:{action,mode:'close'},body:{mode:'close'},headers:{host:'test.local',origin:'https://test.local','content-type':'application/json'}},{setHeader(){},status(s){status=s;return this;},json(){}},()=>{throw Error('Storage must not be accessed');});
  assert.equal(status,410);
 }}finally{auth.authenticate=original;}
});
test('daily overview only loads production and reports no financial data',async()=>{
 const production=require('../lib/production-daily'),originalAuth=auth.authenticate,originalService=production.service;
 auth.authenticate=()=>({id:'test',role:'manager'});production.service=()=>({get:async()=>({revision:0})});
 try{let result;await handler({method:'GET',query:{action:'daily-overview',date:'2026-10-28'},headers:{}},{setHeader(){},status(s){assert.equal(s,200);return this;},json(data){result=data;}},()=>{throw Error('Unexpected storage');});assert.equal('cash' in result,false);assert.deepEqual(result.production,{revision:0});}
 finally{auth.authenticate=originalAuth;production.service=originalService;}
});
test('catalogues and reports no longer require financial closing',()=>{
 for(const file of ['calibre-catalog','kpi-catalog'])assert.ok(require('../lib/supervision/'+file).AREAS.every(a=>(a.code||a.id)!=='caja'));
 const summary=require('../lib/daily-summary').describe({revision:1,data:{}},null).join('\n');assert.doesNotMatch(summary,/caja|efectivo|transferencia/i);
 const kpi=require('../lib/supervision/kpi'),checks=require('../lib/supervision/kpi-catalog').requirements('cierre').map(r=>({id:r.id,status:'ready',note:''}));
 const evaluated=kpi.evaluate({checks,products:[]},'cierre',{products:[],productionRevision:1,productionFinalized:true});
 for(const area of evaluated.areas)assert.doesNotMatch([...area.missing,...area.issues].join(' '),/caja|cuadre/i);
});
