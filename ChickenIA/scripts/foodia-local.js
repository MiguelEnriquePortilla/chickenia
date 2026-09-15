'use strict';
// Isolated pilot only. No dotenv, Neon, network calls or production credentials.
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {repository}=require('../lib/inventory-store');
const {service}=require('../lib/food-service');
async function main(){
  const root=path.resolve(__dirname,'..'),instance=process.env.FOODIA_TEST_INSTANCE||'foodia-pilot';
  if(!/^[a-z0-9-]{1,60}$/.test(instance))throw new Error('Nombre de prueba inválido.');
  const directory=path.join(root,'.local',instance);fs.mkdirSync(directory,{recursive:true});
  const lock=path.join(directory,'owner.lock');
  if(fs.existsSync(lock)){
    const owner=Number(fs.readFileSync(lock,'utf8'));let alive=true;
    try{process.kill(owner,0);}catch(e){if(e.code==='ESRCH')alive=false;}
    if(alive)throw Object.assign(new Error('La base local ya está abierta. Cierra el MCP local antes de usar la consola, o viceversa.'),{status:409});
    fs.unlinkSync(lock);
  }
  fs.writeFileSync(lock,String(process.pid),{flag:'wx'});
  process.once('exit',()=>{try{if(fs.readFileSync(lock,'utf8')===String(process.pid))fs.unlinkSync(lock);}catch{}});
  const db=new PGlite(path.join(directory,'postgres'));
  const query=async(s,p)=>(await db.query(s,p)).rows,repo=repository(query);
  const actor={id:'miguel-prueba',name:'Miguel (prueba local)',role:'manager',business:'chicanito',canWrite:true,environment:'local-test'};
  await repo.migrate();
  if(process.argv.includes('--stdio')){
    const {StdioServerTransport}=require('@modelcontextprotocol/sdk/server/stdio.js');
    const server=require('../lib/food-mcp').createServer(repo,query,actor);
    await server.connect(new StdioServerTransport());
    let closing=false;
    const close=async()=>{if(closing)return;closing=true;await server.close();await db.close();process.exit(0);};
    process.once('SIGTERM',close);process.once('SIGINT',close);process.stdin.once('end',close);return;
  }
  try{
    let raw='';for await(const chunk of process.stdin){raw+=chunk;if(Buffer.byteLength(raw)>100000)throw new Error('Entrada demasiado grande.');}
    const request=JSON.parse(raw),api=service(repo,query,actor);let result;
    switch(request.action){
      case 'inventory':result=await api.inventory(request.search||'');break;
      case 'prepare':{const {type,...values}=require('../lib/food-mcp').operation.parse(request.operation);result=await api.prepare(type,values);break;}
      case 'commit':result=await api.commit(request.draftId);break;
      case 'purchases':result=await api.purchases(request.from,request.to);break;
      case 'lists':result=await api.lists();break;
      default:throw new Error('Acción desconocida.');
    }
    process.stdout.write(JSON.stringify({environment:'LOCAL DE PRUEBAS; no son datos reales',...result},null,2)+'\n');
  }finally{await db.close();}
}
main().catch(e=>{process.stderr.write((e.status||e.name==='ZodError'?e.message:'No se pudo completar la prueba local.')+'\n');process.exitCode=1;});
