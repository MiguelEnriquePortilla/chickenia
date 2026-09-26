'use strict';
// Offline review artifact. All records exist only in this disposable database.
const fs=require('node:fs'),path=require('node:path'),{PGlite}=require('@electric-sql/pglite');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.local/dashboard-preview');
(async()=>{
 const db=new PGlite();
 try{
  await db.exec(`CREATE TABLE locations(id serial PRIMARY KEY,code text,active boolean DEFAULT true);INSERT INTO locations(code) VALUES('rastro');CREATE TABLE inventory_items(id serial PRIMARY KEY,sku text UNIQUE,name text,category text,unit text,active boolean DEFAULT true);CREATE TABLE inventory_movements(id serial PRIMARY KEY,item_id int REFERENCES inventory_items(id),location_id int REFERENCES locations(id),movement_type text,quantity numeric,movement_date date,notes text,recorded_by text,recorded_at timestamptz DEFAULT now());`);
  const q=async(s,p)=>(await db.query(s,p)).rows;
  await require('../test/protein-dashboard-fixture').seed(q);
  await q("UPDATE inventory_movements SET recorded_at=movement_date::timestamp + interval '19 hours'");
  const sql=(parts,...values)=>q(parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,''),values);
  const proteins=await require('../lib/protein-summary').snapshot(sql,'2026-09-26');
  const domain=require('../lib/protein-inventory');
  const reports=await Promise.all(['sucursal','movil'].map(k=>domain.forInventory(k).read(q,'2026-09-26')));
  const telegram=require('../lib/supervision/telegram');
  const snapshot=telegram.report([],telegram.CUTS[2],'2026-09-26','DATOS FICTICIOS','2026-09-26T20:00:00Z');
  snapshot.proteins=proteins;
  const caption=telegram.proteinCaption(snapshot);
  const escape=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'telegram.txt'),'VISTA PREVIA · DATOS FICTICIOS · NO ENVIADO\n\n'+caption);
  fs.writeFileSync(path.join(out,'telegram.png'),await require('../lib/supervision/report-image').renderReport(snapshot));
  const read=p=>fs.readFileSync(path.join(root,p),'utf8');
  fs.writeFileSync(path.join(out,'preview.html'),`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChickenIA · Vista previa</title><style>
  :root{--text:#17213e;--surface:#fff;--border:#d4d6dc}*{box-sizing:border-box}body{margin:0;background:#f8f9fc;color:var(--text);font-family:Arial,sans-serif}main{max-width:1100px;margin:auto;padding:22px}header{padding:18px 22px;background:#17213e;color:white;display:flex;justify-content:space-between;align-items:center;gap:20px}header strong{display:block}header p{font-size:12px;margin:6px 0}button,select{font-family:inherit}header button{padding:10px;border-radius:8px;border:0;cursor:pointer}pre{white-space:pre-wrap;line-height:1.55;font-family:inherit;font-size:14px;background:var(--surface);padding:24px;border:1px solid var(--border);border-radius:12px}[data-theme=dark]{--text:#e5e8ef;--surface:#242c3b;--border:#445063}[data-theme=dark] body{background:#19202d}a{color:inherit}
  ${read('css/protein-dashboard.css')}</style><header><div><strong>CHICKEN·IA / VISTA PREVIA</strong><p>Datos ficticios · No modifica inventarios ni envía mensajes</p></div><button id="theme">Cambiar claro / oscuro</button></header><main><section id="protein-overview"></section><h2>Así llega a Telegram</h2><pre>${escape(caption)}</pre></main><script>${read('js/protein-summary.js')}</script><script>${read('js/protein-dashboard.js')}</script><script>
  ChickenProteinDashboard.mount(document.getElementById('protein-overview'),${JSON.stringify(reports).replace(/</g,'\\u003c')},'2026-09-26');
  document.getElementById('theme').onclick=()=>{const el=document.documentElement;el.setAttribute('data-theme',el.getAttribute('data-theme')==='dark'?'light':'dark');};
  document.addEventListener('click',e=>{const a=e.target.closest('a');if(a){e.preventDefault();alert('En ChickenIA este enlace abre el inventario y su historial. Esta vista usa datos ficticios.');}});
  </script></html>`);
  console.log(out);
 }finally{await db.close();}
})();
