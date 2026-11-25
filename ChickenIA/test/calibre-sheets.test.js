'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {store}=require('../lib/supervision/calibre-sheets');

test('Drive supervision writes assignments, activities and comments and reopens history',async()=>{
 const rows=[],locks=new Set();
 const call=async(path,body)=>{
  if(!body)return {values:rows};
  const requested=body.requests.flatMap(r=>r.addNamedRange?[r.addNamedRange.namedRange.name]:[]);
  if(requested.some(k=>locks.has(k)))throw Object.assign(new Error('duplicate'),{http:400});
  requested.forEach(k=>locks.add(k));
  rows.push(body.requests.at(-1).appendCells.rows[0].values.map(cell=>cell.userEnteredValue.stringValue));
 };
 const run=store(call), date='2026-11-25', now=new Date('2026-11-25T18:00Z'), user={name:'MIGUEL'};
 const post=body=>run({method:'POST',body:{area:'freidoras',test:'1',...body}},date,user,now);
 const get=(test='1',day=date)=>run({method:'GET',query:{test}},day,user,now);
 await assert.rejects(post({revision:0,command:{action:'simple-point',point:'1.1',done:true,note:''}}),/responsable/);
 await post({action:'assign',employeeId:1});
 const command={action:'simple-point',point:'1.1',done:true,note:'=PRUEBA, excluir del incentivo'};
 const attempts=await Promise.allSettled([post({revision:0,command}),post({revision:0,command})]);
 assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
 const history=await get();
 assert.equal(rows.length,2);
 assert.deepEqual(rows[1].slice(2,8),['PRUEBA - Jojutla','freidoras',history.version,'1.1','Verificada',command.note]);
 assert.equal(history.checklistHistory[0].points['1.1'].note,command.note);
 assert.equal((await get('1','2026-11-26')).checklistHistory[0].date,date);
 assert.equal((await get('0')).checklistHistory.length,0);
 assert.equal(history.weekly.areas.find(a=>a.code==='freidoras').days.find(d=>d.date===date).done,1);
});
