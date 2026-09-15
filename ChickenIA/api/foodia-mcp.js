'use strict';
const {StreamableHTTPServerTransport}=require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const {repository}=require('../lib/inventory-store');
const {createServer}=require('../lib/food-mcp');
const auth=require('../lib/food-auth');
function createHandler({query,authenticate=auth.authenticate,configuration=auth.configuration}={}){
  let repo,migration;
  return async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    let config;
    try{
      config=configuration();
      if(req.query?.resource==='1'||new URL(req.url,'http://localhost').searchParams.get('resource')==='1'){
        if(req.method!=='GET'){res.statusCode=405;return res.end();}
        res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(auth.metadata(config)));
      }
      if(req.headers.origin&&req.headers.origin!==new URL(config.resource).origin){res.statusCode=403;return res.end('Origen no permitido.');}
      const actor=await authenticate(req,config);
      if(req.method!=='POST'){res.setHeader('Allow','POST');res.statusCode=405;return res.end();}
      if(!String(req.headers['content-type']||'').startsWith('application/json')){res.statusCode=415;return res.end();}
      if(Number(req.headers['content-length']||0)>100000){res.statusCode=413;return res.end();}
      if(req.body===undefined){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>100000){res.statusCode=413;return res.end();}}try{req.body=JSON.parse(raw);}catch{res.statusCode=400;return res.end('JSON inválido.');}}
      if(Buffer.byteLength(JSON.stringify(req.body))>100000){res.statusCode=413;return res.end();}
      if(!query){if(!process.env.DATABASE_URL)throw Object.assign(new Error('Falta configurar la base.'),{status:503});const sql=require('@neondatabase/serverless').neon(process.env.DATABASE_URL);query=(s,p)=>sql(s,p);}
      repo ||= repository(query);migration ||= repo.migrate().catch(e=>{migration=null;throw e;});await migration;
      const server=createServer(repo,query,actor),transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
      await server.connect(transport);
      try{await transport.handleRequest(req,res,req.body);}finally{await server.close();}
    }catch(e){
      if(res.headersSent)return;
      if(e.status===401&&config)res.setHeader('WWW-Authenticate',`Bearer resource_metadata="${new URL('/.well-known/oauth-protected-resource',config.resource).href}"`);
      res.statusCode=e.status||500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:e.status?e.message:'FoodIA no disponible. Reintenta.'}));
    }
  };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
