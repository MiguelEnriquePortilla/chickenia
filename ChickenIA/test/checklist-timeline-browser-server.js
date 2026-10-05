'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const {db,sql}=await require('./checklist-timeline-fixture').fixture();
 require('../lib/supervision/db').ensureTables=async()=>sql;
 require('../lib/inventory-auth').authenticate=()=>({id:'local',name:'Nancy (prueba)',role:'manager'});
 const store=require('../lib/supervision/checklist-timeline-store'),core=require('../lib/supervision/checklist-timeline');
 const today=core.day();await store.ensureDay(sql,1,today);
 const [day]=await sql`SELECT catalog FROM checklist_timeline_days WHERE location_id=1 AND date=${today}::date`;
 const sample='2026-10-06';
 await sql`INSERT INTO checklist_timeline_days(location_id,date,catalog) VALUES(1,${sample}::date,${JSON.stringify(day.catalog)}::jsonb) ON CONFLICT DO NOTHING`;
 for(const [id,time,quality] of [[1,'09:50',null],[3,'11:45',75],[4,'11:00',null],[3,'15:15',100]])await sql`INSERT INTO checklist_check_events(activity_id,location_id,check_date,done,quality_score,checked_by,verified_at,recorded_at) VALUES(${id},1,${sample}::date,true,${quality},'Prueba local',${sample+'T'+time+':00-06:00'}::timestamptz,${sample+'T'+time+':00-06:00'}::timestamptz)`;
 const timeline=require('../lib/supervision/checklist-timeline-handler').createHandler(req=>req.query.date===sample?new Date(sample+'T16:30:00-06:00'):new Date());
 const root=path.resolve(__dirname,'../public');
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');req.query=Object.fromEntries(url.searchParams);
  res.status=n=>{res.statusCode=n;return res;};res.json=d=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(d));};
  try{
   if(url.pathname.startsWith('/api/')){
    let raw='';for await(const c of req)raw+=c;req.body=raw?JSON.parse(raw):{};
    if(url.pathname==='/api/summary'&&req.query.timeline==='1')return timeline(req,res);
    if(url.pathname==='/api/summary')return require('../api/summary')(req,res);
    if(url.pathname==='/api/checks')return require('../api/checks')(req,res);
    if(url.pathname==='/api/areas')return require('../api/areas')(req,res);
    if(url.pathname==='/api/locations')return res.json([{id:1,name:'Jojutla (prueba)',type:'tienda'}]);
    if(['/api/attendance','/api/employees'].includes(url.pathname))return res.json([]);
    if(url.pathname==='/api/inventory'&&req.query.action==='session')return res.json({user:{id:'local',name:'Nancy (prueba)',role:'manager'}});
    return res.status(404).json({error:'Fuera de esta prueba'});
   }
   const relative=decodeURIComponent(url.pathname).replace(/^\//,'')||'supervision.html';
   if(!/^(?:[a-z-]+\.html|manifest\.json|sw\.js|(?:css|js|icons|daily)\/[a-z0-9_.-]+)$/.test(relative))return res.status(404).end();
   const file=path.join(root,relative);if(!fs.existsSync(file))return res.status(404).end();
   res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json','.png':'image/png'})[path.extname(file)]||'image/svg+xml');res.end(fs.readFileSync(file));
  }catch(e){res.status(500).json({error:e.message});}
 });
 server.listen(0,'127.0.0.1',()=>console.log('http://127.0.0.1:'+server.address().port));
 process.on('SIGTERM',()=>server.close(async()=>{await db.close();process.exit();}));
})();
