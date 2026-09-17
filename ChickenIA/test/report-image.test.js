'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const {report,message,sendReport,CUTS} = require('../lib/supervision/telegram');
const {renderReport} = require('../lib/supervision/report-image');
const {areaSummary} = require('../lib/supervision/report-guidance');
const snapshot = () => report([
  {area_name:'Caja',name:'Hoja de cierre <cobros & tarjetas>',weight:10,done:false,criticality:'critica',routine_block:'cierre'},
  {area_name:'Cocina',name:'Verificar cocina',weight:10,done:true,routine_block:'operacion'},
  {area_name:'Supervisión',name:'7:30pm — Envío del reporte',weight:10,done:false,criticality:'critica',routine_block:'cierre'},
],CUTS[4],'2026-09-17','Jojutla Mercado','2026-09-18T01:00:28Z');

test('area explanations distinguish complete, due, unknown and later tasks',()=>{
  const s=snapshot();
  assert.equal(s.areas[0].status,'critical');
  assert.equal(s.areas[0].next_task,'Hoja de cierre <cobros & tarjetas>');
  assert.equal(s.areas[1].status,'complete');
  assert.equal(s.areas[2].status,'later');
  assert.match(areaSummary([{done:false,routine_block:null}],CUTS[0]).summary,/horario/);
  assert.match(message(s),/dashboard.html\?date=2026-09-17/);
});

test('renderer produces nonblank PNG, handles accents and escapes markup',async()=>{
  const png=await renderReport(snapshot());
  const metadata=await sharp(png).metadata();
  assert.equal(metadata.format,'png');
  assert.equal(metadata.width,960);
  assert.ok(metadata.height>700 && metadata.height<5000);
  const stats=await sharp(png).stats();
  assert.ok(stats.channels[0].stdev>15);
  assert.ok(png.length<10000000);
});

test('single photo upload carries bounded caption and dated dashboard button',async()=>{
  const s=snapshot();
  s.areas=Array.from({length:9},(_,i)=>({...s.areas[0],name:'Área de supervisión '+i}));
  const env={TELEGRAM_BOT_TOKEN:'private-token',TELEGRAM_CHAT_ID:'-123'};
  let calls=0;
  const id=await sendReport(s,Buffer.from('png'),env,async(url,opts)=>{
    calls++;
    assert.ok(url.endsWith('/sendPhoto'));
    assert.equal(opts.body.get('chat_id'),'-123');
    assert.equal(opts.body.get('photo').type,'image/png');
    assert.ok(opts.body.get('caption').length<=1024);
    assert.match(opts.body.get('caption'),/Captura 19:00:28/);
    const markup=JSON.parse(opts.body.get('reply_markup'));
    assert.equal(markup.inline_keyboard[0][0].url,'https://chickenia.chicanito.app/dashboard.html?date=2026-09-17');
    return {ok:true,json:async()=>({ok:true,result:{message_id:7}})};
  });
  assert.equal(id,7);assert.equal(calls,1);
  await assert.rejects(sendReport(s,Buffer.from('png'),env,async()=>{throw Error('private-token');}),e=>!e.message.includes('private-token'));
});
