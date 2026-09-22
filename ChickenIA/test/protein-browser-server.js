'use strict';
// Isolated, in-memory browser fixture. Never connects to Neon or sends reports.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite'),auth=require('../lib/inventory-auth');
const root=path.resolve(__dirname,'../public');
process.env.CHICKENIA_PILOT_ACCESS='0';process.env.INVENTORY_SESSION_SECRET=crypto.randomBytes(48).toString('hex');
const user={id:'test-manager',name:'Administrador de prueba',role:'manager',hash:auth.passwordHash(crypto.randomBytes(20).toString('hex'))};
process.env.INVENTORY_USERS_JSON=JSON.stringify([user]);
const payload=Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,v:crypto.createHash('sha256').update(user.hash+user.role).digest('hex')})).toString('base64url');
const token=payload+'.'+crypto.createHmac('sha256',process.env.INVENTORY_SESSION_SECRET).update(payload).digest('base64url');
(async()=>{
 const db=new PGlite();await db.exec(`CREATE TABLE locations(id serial PRIMARY KEY,code text,active boolean DEFAULT true);INSERT INTO locations(code) VALUES('rastro');CREATE TABLE inventory_items(id serial PRIMARY KEY,sku text UNIQUE,name text,category text,unit text,active boolean DEFAULT true);CREATE TABLE inventory_movements(id serial PRIMARY KEY,item_id int REFERENCES inventory_items(id),location_id int REFERENCES locations(id),movement_type text,quantity numeric,movement_date date,notes text,recorded_by text,recorded_at timestamptz DEFAULT now());`);
 // Serialize fixture connections to model separate PostgreSQL transactions on one embedded connection.
 let tail=Promise.resolve();
 const connect=async()=>{const before=tail;let done;tail=new Promise(r=>done=r);await before;return {query:(s,p)=>db.query(s,p),release:done};};
 const handler=require('../api/protein-inventory').createHandler(connect),rastro=require('../api/rastro').createHandler(connect);
 await db.exec("INSERT INTO inventory_items(sku,name,category,unit) VALUES('VER-001','Jitomate','Verduras','kg'),('RAS-011','Bolsas','Rastro','pieza');");
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');req.query=Object.fromEntries(url.searchParams);res.status=s=>{res.statusCode=s;return res;};res.json=d=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(d));};
  if(['/api/protein-inventory','/api/rastro'].includes(url.pathname)){
   let raw='';for await(const chunk of req)raw+=chunk;try{req.body=raw?JSON.parse(raw):{};}catch{return res.status(400).json({error:'JSON'});}return (url.pathname==='/api/rastro'?rastro:handler)(req,res);
  }
  if(url.pathname==='/api/inventory'){
   if(url.searchParams.get('action')==='session')return res.json({user:{id:user.id,name:user.name,role:user.role}});
   return res.json({cash:null,production:{revision:0}});
  }
  if(url.pathname==='/api/locations')return res.json([{id:1,code:'jojutla',name:'Jojutla',type:'tienda'}]);
  if(url.pathname==='/api/summary')return res.json({date:req.query.date,location:{id:1},overall_score:0,areas:[],critical_pending:[],cross_check:null});
  if(url.pathname.startsWith('/api/'))return res.json([]);
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/proteinas.html':url.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;return res.end();}
  res.setHeader('Set-Cookie',auth.cookie(token,req));res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 });
 server.listen(0,'127.0.0.1',()=>console.log('http://127.0.0.1:'+server.address().port));
})();
