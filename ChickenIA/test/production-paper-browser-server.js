'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 process.env.INVENTORY_SESSION_SECRET='name-access-browser-local-only-secret-long-enough';process.env.INVENTORY_USERS_JSON='[]';
 const {PGlite}=require('@electric-sql/pglite'),db=new PGlite(),query=async(s,p)=>(await db.query(s,p)).rows;
 const handler=require('../api/inventory').createHandler(()=>require('../lib/inventory-store').repository(query),query);
 if(process.env.CHICKENIA_TEST_CEDIS==='1'){
  await require('../lib/inventory-store').repository(query).migrate();
  await db.exec(`
  CREATE TABLE locations(id serial PRIMARY KEY,code text,active boolean);
  INSERT INTO locations(code,active) VALUES('rastro',true);
  CREATE TABLE inventory_items(id serial PRIMARY KEY,sku text,name text,unit text,active boolean);
  CREATE TABLE inventory_movements(id serial PRIMARY KEY,item_id int,location_id int,movement_type text,quantity numeric,movement_date date,notes text,recorded_by text,recorded_at timestamptz DEFAULT now());
  UPDATE inv_state SET data=data || '{"initialized":{"sucursal:rosti-marinado":true},"balances":{"sucursal:rosti-marinado":10000}}'::jsonb;
  `);
 }
 const root=path.resolve(__dirname,'../public');
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');req.query=Object.fromEntries(url.searchParams);
  res.status=n=>{res.statusCode=n;return res;};res.json=d=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(d));};
  try{
   if(url.pathname==='/api/inventory'){let raw='';for await(const c of req)raw+=c;req.body=raw?JSON.parse(raw):{};return handler(req,res);}
   const relative=url.pathname.slice(1)||'index.html';if(!/^(?:[a-z-]+\.html|manifest\.json|sw\.js|(?:css|js|icons|daily)\/[a-z0-9_.-]+)$/.test(relative))return res.status(404).end();
   const file=path.join(root,relative);if(!fs.existsSync(file))return res.status(404).end();
   res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.json':'application/json'})[path.extname(file)]||'image/png');res.end(fs.readFileSync(file));
  }catch(e){res.status(500).json({error:e.message});}
 });
 server.listen(0,'127.0.0.1',()=>console.log('http://127.0.0.1:'+server.address().port));
})();
