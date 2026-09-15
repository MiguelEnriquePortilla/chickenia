'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {PGlite}=require('@electric-sql/pglite');
const {Client}=require('@modelcontextprotocol/sdk/client/index.js');
const {StreamableHTTPClientTransport}=require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const {createHandler}=require('../api/foodia-mcp');
const auth=require('../lib/food-auth');
const {today}=require('../lib/inventory-domain');
test('MCP por HTTP real: OAuth/JWT, descubrimiento, borrador, escritura y lectura entre usuarios',async()=>{
  const jose=await import('jose'),keys=await jose.generateKeyPair('RS256'),jwk=await jose.exportJWK(keys.publicKey);jwk.kid='local-test';
  const db=new PGlite(),query=async(s,p)=>(await db.query(s,p)).rows;
  const config={resource:'https://foodia.example/mcp',issuer:'https://identity.example/',members:[{subject:'lilian-test',id:'lilian',name:'Lilian',role:'operator',business:'chicanito'},{subject:'miguel-test',id:'miguel',name:'Miguel',role:'operator',business:'chicanito'},{subject:'reader-test',id:'reader',name:'Consulta',role:'reader',business:'chicanito'}]};
  const handler=createHandler({query,configuration:()=>config});
  const web=http.createServer((req,res)=>{if(req.url==='/keys'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({keys:[jwk]}));}return handler(req,res);});
  await new Promise(r=>web.listen(0,'127.0.0.1',r));const url=new URL('http://127.0.0.1:'+web.address().port+'/mcp');config.jwks=new URL('/keys',url).href;
  const token=async(subject,aud=config.resource,expiry='10m')=>new jose.SignJWT({scope:'foodia:read foodia:write'}).setProtectedHeader({alg:'RS256',kid:jwk.kid}).setSubject(subject).setIssuer(config.issuer).setAudience(aud).setIssuedAt().setExpirationTime(expiry).sign(keys.privateKey);
  const clients=[];
  const connect=async(subject)=>{const client=new Client({name:'foodia-test',version:'1'});clients.push(client);await client.connect(new StreamableHTTPClientTransport(url,{requestInit:{headers:{Authorization:'Bearer '+await token(subject)}}}));return client;};
  try{
    const metadata=await fetch(new URL('/mcp?resource=1',url));assert.equal(metadata.status,200);assert.equal((await metadata.json()).resource,config.resource);
    let response=await fetch(url,{method:'POST'});assert.equal(response.status,401);assert.match(response.headers.get('www-authenticate'),/oauth-protected-resource/);
    response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+await token('lilian-test','wrong')}});assert.equal(response.status,401);
    response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+await token('unknown')}});assert.equal(response.status,403);
    response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+await token('lilian-test',config.resource,'-1m')}});assert.equal(response.status,401);
    response=await fetch(url,{method:'POST',headers:{Origin:'https://evil.example',Authorization:'Bearer '+await token('lilian-test')}});assert.equal(response.status,403);
    const lilian=await connect('lilian-test'),miguel=await connect('miguel-test'),reader=await connect('reader-test');
    const tools=await lilian.listTools();assert.equal(tools.tools.length,6);assert.equal(tools.tools.find(t=>t.name==='foodia_commit').annotations.destructiveHint,true);
    const call=async(client,name,args)=>{const out=await client.callTool({name,arguments:args});assert.ok(!out.isError,JSON.stringify(out));return out.structuredContent;};
    let prepared=await call(lilian,'foodia_prepare',{operation:{type:'initial',location:'cedis',lines:[{item:'morron',qty:0}],note:'Conteo real de prueba'}});
    await call(lilian,'foodia_commit',{draftId:prepared.draftId});
    prepared=await call(lilian,'foodia_prepare',{operation:{type:'foodPurchase',date:today(new Date()),supplier:'Sam’s de prueba',market:'Sam’s',destination:'cedis',received:true,lines:[{item:'morron',stockQty:2,purchaseQty:2,purchaseUnit:'piezas',unitPriceCents:1000}],note:'Prueba aislada'}});
    assert.equal(prepared.saved,false);const saved=await call(lilian,'foodia_commit',{draftId:prepared.draftId});assert.equal(saved.saved,true);
    const retry=await call(lilian,'foodia_commit',{draftId:prepared.draftId});assert.equal(retry.repeated,true);
    const stock=await call(miguel,'foodia_inventory',{search:'morron'});assert.equal(stock.items[0].cedis,2);
    const report=await call(miguel,'foodia_purchases',{from:today(new Date()),to:today(new Date())});assert.equal(report.knownTotalCents,2000);assert.equal(report.purchases[0].actor.name,'Lilian');
    const denied=await reader.callTool({name:'foodia_commit',arguments:{draftId:prepared.draftId}});assert.equal(denied.isError,true);
    const bad=await lilian.callTool({name:'foodia_prepare',arguments:{operation:{type:'catalog',name:'X',unit:'kg',area:'Almacén',kind:'supply',step:1,unexpected:'no'}}});assert.equal(bad.isError,true);
  }finally{for(const c of clients)await c.close();await new Promise(r=>web.close(r));await db.close();}
});
test('configuración cerrada sin identidad y sin permitir otro negocio',()=>{
  assert.throws(()=>auth.configuration({}),/configurar/);
  const config={FOODIA_RESOURCE_URL:'https://foodia.example/mcp',FOODIA_OAUTH_ISSUER:'https://auth.example/',FOODIA_OAUTH_JWKS_URL:'https://auth.example/keys',FOODIA_MEMBERS_JSON:JSON.stringify([{subject:'x',id:'x',name:'X',business:'otro',role:'operator'}])};
  assert.throws(()=>auth.configuration(config),/inválidos/);
});
