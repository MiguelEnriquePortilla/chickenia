'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const domain=require('../lib/protein-inventory'),summary=require('../lib/protein-summary'),view=require('../js/protein-summary');
const {proteinCaption,sendReport,report,CUTS,message}=require('../lib/supervision/telegram');
const {renderReport}=require('../lib/supervision/report-image');
const schema=`CREATE TABLE locations(id serial PRIMARY KEY,code text,active boolean DEFAULT true);INSERT INTO locations(code) VALUES('rastro');CREATE TABLE inventory_items(id serial PRIMARY KEY,sku text UNIQUE,name text,category text,unit text,active boolean DEFAULT true);CREATE TABLE inventory_movements(id serial PRIMARY KEY,item_id int REFERENCES inventory_items(id),location_id int REFERENCES locations(id),movement_type text,quantity numeric,movement_date date,notes text,recorded_by text,recorded_at timestamptz DEFAULT now());`;
test('both ledgers match API, carry old pending deliveries, preserve decimals and never mutate stock',async()=>{
 const db=new PGlite();const query=async(s,p)=>(await db.query(s,p)).rows;
 const sql=async(parts,...values)=>query(parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,''),values);
 try{
  await db.exec(schema);await require('./protein-dashboard-fixture').seed(query);
  const before=await query('SELECT * FROM inventory_movements ORDER BY id');
  const snap=await summary.snapshot(sql,'2026-09-26');
  for(const g of snap.groups){
   const expected=await domain.forInventory(g.inventory).read(query,'2026-09-26');
   assert.equal(g.pendingQuantity,10);assert.equal(g.rows[0].pendingCount,1);
   assert.equal(g.rows[0].raw.current,expected.rows[0].raw.current);
   assert.equal(g.rows[0].marinated.current,expected.rows[0].marinated.current);
   assert.deepEqual(g.lastRecordedAt,expected.lastRecordedAt);
  }
  assert.equal(snap.groups[0].sent,60);assert.equal(snap.groups[1].sent,25);
  assert.ok(snap.groups[0].alerts.some(a=>a.includes('diferencia')));
  assert.ok(!snap.groups[1].alerts.some(a=>a.includes('diferencia')));
  assert.equal(snap.groups[1].rows.length,1);
  const next=await summary.snapshot(sql,'2026-09-27');
  assert.equal(next.groups[0].sent,0);assert.equal(next.groups[0].pendingQuantity,10);
  assert.ok(!next.groups[0].alerts.some(a=>a.includes('diferencia')));
  assert.deepEqual(await query('SELECT * FROM inventory_movements ORDER BY id'),before);
  const snapshot=report([],CUTS[2],'2026-09-26','Jojutla','2026-09-26T20:00:00Z');snapshot.proteins=snap;
  snapshot.daily={lines:Array(100).fill('Detalle extenso de caja y producción.')};
  assert.ok(message(snapshot).length<4000);
  assert.ok(proteinCaption(snapshot).length<=1024);
  let calls=0;
  await sendReport(snapshot,Buffer.from('png'),{TELEGRAM_BOT_TOKEN:'test',TELEGRAM_CHAT_ID:'-1'},async(url,opts)=>{
   calls++;const caption=opts.body.get('caption');
   assert.match(caption,/SUCURSAL/);assert.match(caption,/MÓVIL/);assert.match(caption,/Por confirmar: 10/);assert.ok(caption.length<=1024);
   return {ok:true,json:async()=>({ok:true,result:{message_id:1}})};
  });assert.equal(calls,1);
  snapshot.daily={lines:[]};await renderReport(snapshot);
 }finally{await db.close();}
});
test('missing capture, real zero, unavailable data and historical dates remain distinct',()=>{
 const empty=['sucursal','movil'].map(k=>domain.forInventory(k).report({events:[],revision:0},'2026-09-26'));
 let groups=view.summarize(empty);assert.equal(groups[0].rows[0].total,null);assert.match(view.lines(groups).join('\n'),/Sin captura/);
 empty[0].rows[0].raw.current=0;empty[0].rows[0].marinated.current=0;empty[0].rows[0].total=0;
 groups=view.summarize(empty);assert.match(view.lines(groups).join('\n'),/Rostizado: 0 \/ 0/);
 assert.match(view.lines(view.summarize([])).join('\n'),/Datos no disponibles/);
 const event={id:1,sku:'PRO-MOVIL-ROSTI-RAW',movement_type:'initial',quantity:10,day:'2026-09-26',recorded_at:'2026-09-26T12:00:00Z',notes:JSON.stringify({action:'initial'})};
 assert.equal(domain.forInventory('movil').reportMovements([event],'2026-09-25').lastRecordedAt,null);
});
