'use strict';
// Isolated in-memory PostgreSQL, real handler and signed fixture session. No remote calls.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite'),auth=require('../lib/inventory-auth');
const root=path.resolve(__dirname,'../public');
process.env.INVENTORY_SESSION_SECRET=crypto.randomBytes(48).toString('hex');
const user={id:'miguel',name:'MIGUEL',role:'manager',hash:'isolated-fixture'};process.env.INVENTORY_USERS_JSON=JSON.stringify([user]);
const p=Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,v:crypto.createHash('sha256').update(user.hash+user.role).digest('hex')})).toString('base64url');
const token=p+'.'+crypto.createHmac('sha256',process.env.INVENTORY_SESSION_SECRET).update(p).digest('base64url');
(async()=>{
 const db=new PGlite();await db.exec("CREATE TABLE locations(id int PRIMARY KEY,code text,name text,type text);INSERT INTO locations VALUES(1,'jojutla','Jojutla','tienda')");
 const q=async(s,p)=>(await db.query(s,p)).rows,handler=require('../lib/supervision/calibre-handler').createHandler(q,()=>new Date('2026-10-21T18:00:00Z'));
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');req.query=Object.fromEntries(url.searchParams);res.status=c=>{res.statusCode=c;return res;};res.json=d=>{res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(d));};
  if(url.pathname==='/api/summary'&&req.query.calibre==='1'){let raw='';for await(const c of req)raw+=c;req.body=raw?JSON.parse(raw):{};return handler(req,res);}
  if(url.pathname==='/api/inventory')return res.json({user:{id:user.id,name:user.name,role:user.role},cash:null,production:{revision:0}});
  if(url.pathname==='/api/locations')return res.json([{id:1,code:'jojutla',name:'Jojutla',type:'tienda'}]);
  if(url.pathname.startsWith('/api/'))return res.json([]);
  const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.status(404).end();
  res.setHeader('Set-Cookie',auth.cookie(token,req));res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]+'; charset=utf-8');fs.createReadStream(file).pipe(res);
 });
 server.listen(0,'127.0.0.1',()=>console.log('http://127.0.0.1:'+server.address().port));
})().catch(e=>{console.error(e);process.exitCode=1;});
