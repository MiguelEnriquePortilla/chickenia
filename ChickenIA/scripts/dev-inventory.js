'use strict';
// Local PostgreSQL (PGlite), actual API and actual static UI. Never connects to Neon.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const { repository } = require('../lib/inventory-store');
const { passwordHash } = require('../lib/inventory-auth');
process.env.CHICKENIA_PILOT_ACCESS ??= '0'; // Existing local account fixtures stay reproducible; opt in explicitly.
const root = path.resolve(__dirname,'..');
const dataDir=path.resolve(root,'.local',process.env.DEV_INSTANCE||'development');
if(!dataDir.startsWith(path.join(root,'.local')+path.sep))throw new Error('Directorio local inválido.');
fs.mkdirSync(dataDir,{recursive:true});
const credentialsPath=path.join(dataDir,'dev-credentials.json');
let credentials;
if(fs.existsSync(credentialsPath))credentials=JSON.parse(fs.readFileSync(credentialsPath));
else {
  credentials={username:process.env.DEV_USER||'nancy',password:randomBytes(18).toString('base64url')};
  fs.writeFileSync(credentialsPath,JSON.stringify(credentials));
}
process.env.INVENTORY_SESSION_SECRET=randomBytes(48).toString('base64url');
const devAccounts=[{id:credentials.username,name:credentials.username==='nancy'?'Nancy':'Miguel',role:'manager',hash:passwordHash(credentials.password)}];
if(credentials.username!=='nancy')devAccounts.push({id:'nancy',name:'Nancy',role:'manager',hash:passwordHash(credentials.password)});
process.env.INVENTORY_USERS_JSON=JSON.stringify(devAccounts);
const db=new PGlite(path.join(dataDir,'inventory-pg'));
const query=async(s,p)=>(await db.query(s,p)).rows;
const repo=repository(query);
const handler=require('../api/inventory').createHandler(()=>repo,query);
const chickenHandler=require('../api/chicken-ia').createHandler(query);
const kitchenHandler=require('../api/kitchen-plan').createHandler(require('./local-kitchen')(db));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  res.status=code=>{res.statusCode=code;return res;};res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
  if(['/api/inventory','/api/kitchen-plan','/api/chicken-ia'].includes(url.pathname)){
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>100000){res.status(413).json({error:'Demasiados datos'});return;}}
    try{req.body=raw?JSON.parse(raw):{};}catch{res.status(400).json({error:'JSON inválido'});return;}
    req.query=Object.fromEntries(url.searchParams);return (url.pathname==='/api/kitchen-plan'?kitchenHandler:url.pathname==='/api/chicken-ia'?chickenHandler:handler)(req,res);
  }
  // Only public assets, never scripts, env, databases, test files or server code.
  const relative=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';
  if(!/^(?:[a-z-]+\.html|manifest\.json|sw\.js|(?:css|js|icons)\/[a-z0-9_.-]+)$/.test(relative)){res.statusCode=404;return res.end('No encontrado');}
  const file=path.join(root,relative);
  if(!fs.existsSync(file)){res.statusCode=404;return res.end('No encontrado');}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
server.listen(Number(process.env.PORT||8940),'127.0.0.1',()=>console.log('ChickenIA local: http://127.0.0.1:'+server.address().port+'/inventario.html (credenciales en .local/dev-credentials.json)'));
