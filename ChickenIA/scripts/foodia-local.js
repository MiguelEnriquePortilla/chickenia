'use strict';
// Isolated pilot: no dotenv, Neon or production credentials.
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {repository}=require('../lib/inventory-store');
const {service}=require('../lib/food-service');
async function main(){
  const root=path.resolve(__dirname,'..'),instance=process.env.FOODIA_TEST_INSTANCE||'foodia-pilot';
  if(!/^[a-z0-9-]{1,60}$/.test(instance))throw new Error('Invalid test instance.');
  const directory=path.join(root,'.local',instance);fs.mkdirSync(directory,{recursive:true});
  const lock=path.join(directory,'owner.lock');
  let db,closing=false,queue=Promise.resolve();
  const query=async(s,p)=>(await db.query(s,p)).rows,repo=repository(query);
  const actor={id:'miguel-prueba',name:'Miguel (prueba local)',role:'manager',business:'chicanito',canWrite:true,environment:'local-test'};
  async function withDatabase(handler){
    if(closing)throw Object.assign(new Error('La conexion local se esta cerrando.'),{status:503});
    const deadline=Date.now()+15000;
    for(;;){
      try{fs.writeFileSync(lock,String(process.pid),{flag:'wx'});break;}
      catch(e){
        if(e.code!=='EEXIST')throw e;
        if(Date.now()>=deadline)throw Object.assign(new Error('Otra conexion ocupa la base local. Reintenta el mismo borrador. Si persiste, revisa el proceso de owner.lock; no borres la base.'),{status:409});
        await new Promise(resolve=>setTimeout(resolve,100));
      }
    }
    try{db=new PGlite(path.join(directory,'postgres'));await repo.migrate();return await handler();}
    finally{
      // Release only after flushing. On crash keep the lock for explicit recovery.
      if(db)await db.close();db=undefined;
      fs.unlinkSync(lock);
    }
  }
  const run=(handler,name)=>{
    if(name==='foodia_session')return handler();
    const result=queue.then(()=>withDatabase(handler));queue=result.catch(()=>{});return result;
  };
  if(process.argv.includes('--stdio')){
    const {StdioServerTransport}=require('@modelcontextprotocol/sdk/server/stdio.js');
    const server=require('../lib/food-mcp').createServer(repo,query,actor,run);
    await server.connect(new StdioServerTransport());
    const close=async()=>{if(closing)return;closing=true;await queue;await server.close();process.exit(0);};
    process.once('SIGTERM',close);process.once('SIGINT',close);process.stdin.once('end',close);return;
  }
  let raw='';for await(const chunk of process.stdin){raw+=chunk;if(Buffer.byteLength(raw)>100000)throw new Error('Input too large.');}
  const request=JSON.parse(raw),api=service(repo,query,actor);
  const result=await run(async()=>{
    switch(request.action){
      case 'inventory':return api.inventory(request.search||'');
      case 'prepare':{const {type,...values}=require('../lib/food-mcp').operation.parse(request.operation);return api.prepare(type,values);}
      case 'commit':return api.commit(request.draftId);
      case 'purchases':return api.purchases(request.from,request.to);
      case 'lists':return api.lists();
      case 'movements':return api.movements(request.from,request.to);
      default:throw new Error('Unknown action.');
    }
  });
  process.stdout.write(JSON.stringify({environment:'LOCAL DE PRUEBAS; no son datos reales',...result},null,2)+'\n');
}
main().catch(e=>{process.stderr.write((e.status||e.name==='ZodError'?e.message:'No se pudo completar la prueba local.')+'\n');process.exitCode=1;});
