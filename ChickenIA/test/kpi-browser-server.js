'use strict';
// Real KPI handler, signed test session and disposable PostgreSQL. Other dashboard modules use empty fixtures.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PGlite}=require('@electric-sql/pglite'),auth=require('../lib/inventory-auth'),kpi=require('../lib/supervision/kpi');
process.env.CHICKENIA_PILOT_ACCESS='0';process.env.INVENTORY_SESSION_SECRET=crypto.randomBytes(48).toString('hex');
const user={id:'test-manager',name:'Nancy (prueba local)',role:'manager',hash:auth.passwordHash(crypto.randomBytes(20).toString('hex'))};
process.env.INVENTORY_USERS_JSON=JSON.stringify([user]);
const payload=Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,v:crypto.createHash('sha256').update(user.hash+user.role).digest('hex')})).toString('base64url');
const token=payload+'.'+crypto.createHmac('sha256',process.env.INVENTORY_SESSION_SECRET).update(payload).digest('base64url');
(async()=>{
 const db=new PGlite(),query=async(s,p)=>(await db.query(s,p)).rows,date=kpi.day(new Date());
 await db.exec("CREATE TABLE locations(id int,code text,name text,type text); INSERT INTO locations VALUES(1,'jojutla','Jojutla','tienda')");
 const actor={id:user.id,name:user.name,role:user.role,environment:'production',business:'chicanito',canWrite:true};
 const prod=require('../lib/production-daily'),production=prod.service(query,actor);await production.get(date);
 const data=prod.blank();data.responsible=user.name;
 for(const row of data.lines){row.active=['rosti','freidoras-4','cocina-0'].includes(row.id);row.unit=row.unit||'kg';row.previousCooked=0;row.plan1=20;row.done1=20;}
 await production.save({date,revision:0,data});
 const cash=require('../lib/cash-close').cashService(query,actor);
 const handler=require('../lib/supervision/kpi-handler').createHandler(query,()=>new Date(date+'T22:30:00Z'));
 const root=path.resolve(__dirname,'../public');
 http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost');req.query=Object.fromEntries(u.searchParams);
  res.status=n=>{res.statusCode=n;return res;};res.json=d=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(d));};
  try{
   if(u.pathname.startsWith('/api/')){
    let raw='';for await(const c of req)raw+=c;req.body=raw?JSON.parse(raw):{};
    if(u.pathname==='/api/summary'&&req.query.kpi==='1')return handler(req,res);
    if(u.pathname==='/api/inventory'&&req.query.action==='session')return res.json({user:auth.authenticate(req)});
    if(u.pathname==='/api/inventory'&&String(req.query.action).startsWith('daily-'))return require('../lib/daily-handler')(req,res,query);
    if(u.pathname==='/api/inventory'&&req.query.action==='daily-overview')return res.json({production:await production.get(date),cash:await cash.get(date)});
    if(u.pathname==='/api/locations')return res.json([{id:1,name:'Jojutla',type:'tienda'}]);
    if(u.pathname==='/api/summary')return res.json({areas:[],overall_score:0,critical_pending:[],checkpoints:[],date,location:{id:1}});
    if(['/api/employees','/api/attendance','/api/areas','/api/checks'].includes(u.pathname))return res.json([]);
    return res.status(404).json({error:'Módulo fuera de esta prueba'});
   }
   const relative=decodeURIComponent(u.pathname).replace(/^\//,'')||'supervision.html';
   if(!/^(?:[a-z-]+\.html|manifest\.json|sw\.js|(?:css|js|icons|daily)\/[a-z0-9_.-]+)$/.test(relative))return res.status(404).end();
   const file=path.join(root,relative);if(!fs.existsSync(file))return res.status(404).end();
   if(relative.endsWith('.html'))res.setHeader('Set-Cookie',auth.cookie(token,req));
   res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json'})[path.extname(file)]||'image/svg+xml');res.end(fs.readFileSync(file));
  }catch(e){res.status(500).json({error:e.message});}
 }).listen(0,'127.0.0.1',function(){console.log('http://127.0.0.1:'+this.address().port);});
})();
