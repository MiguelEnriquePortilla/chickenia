'use strict';
// Isolated payroll fixture: in-memory PostgreSQL, never loads production env.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {randomBytes}=require('node:crypto');
const root=path.resolve(__dirname,'..');
process.env.INVENTORY_SESSION_SECRET=randomBytes(48).toString('hex');
const {passwordHash}=require('../lib/inventory-auth');
process.env.INVENTORY_USERS_JSON=JSON.stringify([{id:'lilian',name:'Lilian',role:'dispatch',hash:passwordHash('payroll-test-password')}]);
(async()=>{
 const db=new PGlite();
 await db.exec(`CREATE TABLE employees(id integer PRIMARY KEY,name text,active boolean,order_index integer);INSERT INTO employees VALUES(1,'Nancy Rentería',true,1),(2,'Petra Estrada',true,2),(3,'Maricruz Jiménez',true,3),(4,'Eliseo Barreto',true,4),(5,'Julissa Mendoza',true,5);CREATE TABLE locations(id integer PRIMARY KEY,code text);CREATE TABLE attendance_checks(employee_id integer,location_id integer,check_date date,entrada timestamptz);`);
 const handler=require('../api/payroll').createHandler(async(s,p)=>(await db.query(s,p)).rows),auth=require('../lib/inventory-auth');
 http.createServer(async(req,res)=>{const u=new URL(req.url,'http://localhost');res.status=c=>{res.statusCode=c;return res;};res.json=d=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(d));};
 try{
 if(u.pathname.startsWith('/api/')){let raw='';for await(const c of req)raw+=c;req.body=raw?JSON.parse(raw):{};req.query=Object.fromEntries(u.searchParams);
 if(u.pathname==='/api/payroll'){
  if(fs.existsSync(path.join(root,'.local','payroll-fail-'+req.method.toLowerCase())))return res.status(503).json({error:'Fallo de prueba de conexión.'});
  return handler(req,res);
 }
 if(u.pathname==='/api/inventory'&&req.query.action==='people')return res.json({people:auth.people()});
 if(u.pathname==='/api/inventory'&&req.query.action==='session')return res.json({user:auth.authenticate(req)});
 if(u.pathname==='/api/inventory'&&req.query.action==='login'){const r=await auth.login(req);res.setHeader('Set-Cookie',auth.cookie(r.token,req));return res.json({user:r.user});}
 return res.status(404).json({error:'No disponible en esta prueba.'});}
 const relative=u.pathname.slice(1)||'index.html';if(!/^(?:[a-z-]+\.html|(?:js|css|icons)\/[a-z0-9_.-]+)$/.test(relative))return res.status(404).end();const file=path.join(root,relative);if(!fs.existsSync(file))return res.status(404).end();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 }catch(e){res.status(500).json({error:e.message});}
 }).listen(8945,'127.0.0.1',()=>console.log('Nómina de prueba: http://127.0.0.1:8945/nomina.html'));
})();
