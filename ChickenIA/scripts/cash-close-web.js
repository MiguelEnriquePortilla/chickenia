'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{randomBytes}=require('node:crypto');
async function start({run,cash,production}){
  const token=randomBytes(24).toString('hex'),root=path.join(__dirname,'../lib/cash-ui');
  const server=http.createServer(async(req,res)=>{
    const origin=`http://127.0.0.1:${server.address().port}`;
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    if(req.headers.host!==`127.0.0.1:${server.address().port}`){res.writeHead(403);return res.end();}
    const url=new URL(req.url,origin);
    const json=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
    try{
      if(req.method==='GET'&&url.pathname==='/'){
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'"});
        return res.end(fs.readFileSync(path.join(root,'index.html'),'utf8').replace('CSRF_TOKEN',token));
      }
      if(req.method==='GET'&&['/app.js','/style.css'].includes(url.pathname)){
        res.writeHead(200,{'Content-Type':url.pathname.endsWith('.js')?'application/javascript':'text/css'});return res.end(fs.readFileSync(path.join(root,url.pathname.slice(1))));
      }
      if(req.method==='GET'&&['/js/theme-init.js','/js/refined.js','/css/refined.css','/css/reports.css'].includes(url.pathname)){
        res.writeHead(200,{'Content-Type':url.pathname.endsWith('.js')?'application/javascript':'text/css'});return res.end(fs.readFileSync(path.join(__dirname,'..',url.pathname.slice(1))));
      }
      if(req.method==='GET'&&url.pathname==='/icons/icon-192.jpg'){res.writeHead(200,{'Content-Type':'image/jpeg'});return res.end(fs.readFileSync(path.join(__dirname,'../icons/icon-192.jpg')));}
      if(req.method==='GET'&&url.pathname==='/api/close')return json(200,await run(()=>cash.get(url.searchParams.get('date'))));
      if(req.method==='GET'&&url.pathname==='/api/production')return json(200,await run(()=>production.get(url.searchParams.get('date'))));
      if(req.method==='POST'&&['/api/close','/api/production','/api/calculate'].includes(url.pathname)){
        if(req.headers.origin!==origin||req.headers['x-csrf-token']!==token)return json(403,{error:'Origen no permitido'});
        let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>100000)return json(413,{error:'Captura demasiado grande'});}
        const data=JSON.parse(raw);
        if(url.pathname==='/api/calculate')return json(200,{totals:require(data.mode==='production'?'../lib/production-daily':'../lib/cash-close').calculate(data.data)});
        return json(200,await run(()=>(url.pathname==='/api/production'?production:cash).save(data)));
      }
      return json(404,{error:'No encontrado'});
    }catch(e){return json(e.status||400,{error:e.status?e.message:e.name==='ZodError'?'Revisa los importes: máximo dos decimales y sin negativos.':'No se pudo guardar. Conserva los datos y reintenta.'});}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  console.log(`Cierre local de pruebas: http://127.0.0.1:${server.address().port}`);
  return server;
}
module.exports={start};
