'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const {Client}=require('@modelcontextprotocol/sdk/client/index.js');
const {StdioClientTransport}=require('@modelcontextprotocol/sdk/client/stdio.js');
const {today}=require('../lib/inventory-domain');
test('MCP local persistente: lista flexible, producto nuevo, compra, costo y recepción separados',async()=>{
  const root=path.resolve(__dirname,'..'),script=path.join(root,'scripts/foodia-local.js'),instance='foodia-flow-'+randomUUID();
  const start=async()=>{const client=new Client({name:'foodia-local-flow',version:'1'});await client.connect(new StdioClientTransport({command:process.execPath,args:[script,'--stdio'],env:{...process.env,FOODIA_TEST_INSTANCE:instance},stderr:'pipe'}));return client;};
  let client=await start();const day=today(new Date());
  const call=async(name,args={})=>{const out=await client.callTool({name,arguments:args});assert.equal(out.isError,undefined,JSON.stringify(out));assert.equal(out.structuredContent.environment,'local-test');return out.structuredContent;};
  const save=async(operation)=>{const draft=await call('foodia_prepare',{operation});return call('foodia_commit',{draftId:draft.draftId});};
  try{
    const conflict=spawnSync(process.execPath,[script],{input:JSON.stringify({action:'inventory'}),encoding:'utf8',env:{...process.env,FOODIA_TEST_INSTANCE:instance}});assert.equal(conflict.status,0,conflict.stderr);
    const other=await start();
    try{
      assert.equal((await other.listTools()).tools.length,7);
      const both=await Promise.all([client.callTool({name:'foodia_inventory',arguments:{search:'morron'}}),other.callTool({name:'foodia_inventory',arguments:{search:'morron'}})]);
      for(const out of both)assert.ok(!out.isError,JSON.stringify(out));
      const draft=await client.callTool({name:'foodia_prepare',arguments:{operation:{type:'initial',location:'cedis',lines:[{item:'morron',qty:0}],note:'Concurrent local test'}}});
      assert.ok(!draft.isError,JSON.stringify(draft));
      const commits=await Promise.all([client,other].map(c=>c.callTool({name:'foodia_commit',arguments:{draftId:draft.structuredContent.draftId}})));
      for(const out of commits)assert.ok(!out.isError,JSON.stringify(out));
      assert.equal(commits.filter(out=>out.structuredContent.repeated).length,1);
      const bad=await other.callTool({name:'foodia_prepare',arguments:{operation:{type:'send',request:randomUUID(),lines:[{item:'morron',qty:1}]}}});assert.ok(bad.isError);
      assert.ok(!(await client.callTool({name:'foodia_inventory',arguments:{search:'morron'}})).isError);
    }finally{await other.close();}
    const product=(await save({type:'catalog',name:'Papa piloto por kilogramo',unit:'kg',area:'Almacén · Vegetales',kind:'supply',step:1})).event.detail;
    await save({type:'initial',location:'cedis',lines:[{item:product.id,qty:5}],note:'Cinco kg ficticios antes de comprar'});
    const list=(await save({type:'foodList',date:day,market:'Central de Abastos',lines:[{item:product.id,qty:20,observedQty:5,min:10,max:20}],note:'Guía ficticia, no candados'})).event.detail.list;
    const purchase=(await save({type:'foodPurchase',date:day,supplier:'Puesto ficticio',market:'Central de Abastos',destination:'cedis',received:false,list:list.id,lines:[{item:product.id,stockQty:45,purchaseQty:45,purchaseUnit:'kg'}],note:'Compra ficticia superior al máximo; costo pendiente'})).event.detail.document;
    assert.equal((await call('foodia_inventory',{search:product.id})).items[0].cedis,5);
    let report=await call('foodia_purchases',{from:day,to:day});assert.equal(report.missingCostDocuments,1);
    await save({type:'foodCost',purchase:purchase.id,lines:[{item:product.id,unitPriceCents:1800}],paidCents:81000,note:'Importe ficticio confirmado'});
    await save({type:'foodReceive',purchase:purchase.id,lines:[{item:product.id,qty:40}],note:'Llegaron 40 kg ficticios; quedan cinco'});
    assert.equal((await call('foodia_inventory',{search:product.id})).items[0].cedis,45);
    await save({type:'foodReceive',purchase:purchase.id,lines:[{item:product.id,qty:5}],note:'Llegaron los cinco restantes'});
    await client.close();client=await start();
    assert.equal((await call('foodia_inventory',{search:product.id})).items[0].cedis,50);
    report=await call('foodia_purchases',{from:day,to:day});assert.equal(report.knownTotalCents,81000);assert.equal(report.missingCostDocuments,0);assert.equal(report.purchases[0].status,'received');
    const out=path.join(root,'test/results');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'foodia-flow.json'),JSON.stringify({environment:'SYNTHETIC LOCAL TEST',initialKg:5,guideMaxKg:20,boughtKg:45,pricePesosPerKg:18,totalPesos:810,finalKg:50,persistedAfterRestart:true,report},null,2));
  }finally{await client.close();}
});
