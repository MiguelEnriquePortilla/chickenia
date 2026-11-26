const {test}=require('node:test');
const assert=require('node:assert/strict');
const auth=require('../lib/inventory-auth');
const {createHandler}=require('../api/payroll');
test('hoja persistente, asistencia, bloqueo por pendientes y autorización de Lilian',async()=>{
 process.env.INVENTORY_SESSION_SECRET='payroll-isolated-test-secret-32-chars';
 const password='payroll-test-password';
 process.env.INVENTORY_USERS_JSON=JSON.stringify([{id:'lilian',name:'Lilian',role:'dispatch',hash:auth.passwordHash(password)}]);
 const people=[{id:1,name:'Nancy Renter\u00eda'},{id:2,name:'Petra Estrada'}];
 const weeks=new Map();
 const marks=[{employee_id:1,day:0}];
 const handler=createHandler({
  async load(week){return {existing:weeks.get(week),people,marks};},
  async save(record){
   if(record.revision!==(weeks.get(record.week)?.revision||0)+1)return false;
   weeks.set(record.week,record);
   return true;
  }
 });
 async function call(name,method='GET',body,extra={}){
  const req={method,query:{week:'2026-11-09'},headers:{host:'localhost','content-type':'application/json'},body,...extra};
  req.query.test='1';
  if(name){const login=await auth.login({body:{username:name}});req.headers.cookie=auth.cookie(login.token,req)[1].split(';')[0];if(name==='lilian'&&body?.action!=='unlock')req.headers.cookie+='; '+auth.unlockPayroll({...req,body:{password}},login.user).split(';')[0];}
  let code=200,data;const headers={};const res={setHeader(k,v){headers[k]=v;},status(c){code=c;return this;},json(d){data=d;}};await handler(req,res);return {code,data,headers};
 }
 assert.equal((await call(null)).code,401);
 assert.equal((await call('lilian','POST',{action:'unlock',password:'incorrect-password'})).code,401);
 const unlock=await call('lilian','POST',{action:'unlock',password});
 assert.equal(unlock.code,200);
 assert.match(unlock.headers['Set-Cookie'],/^chickenia_payroll=.*; HttpOnly; SameSite=Strict; Path=\/api\/payroll;/);
 let result=await call('lilian');assert.equal(result.code,200);assert.equal(result.data.rows[0].days[0],'A');assert.equal(result.data.rows[0].bonus,1000);
 const rows=result.data.rows;
 const attendance=await call('nancy','GET',undefined,{query:{week:'2026-11-09',view:'attendance'}});
 assert.equal(attendance.data.rows[0].salary,undefined);
 assert.equal(attendance.data.rows[0].bonus,undefined);
 result=await call('lilian','POST',{rows,revision:0});assert.equal(result.code,200);
 marks.push({employee_id:1,day:1});
 result=await call('lilian');assert.equal(result.data.rows[0].days[1],'A');assert.equal(result.data.suggested,true);
 assert.equal((await call('nancy','POST',{action:'approve',revision:1})).code,403);
 assert.equal((await call('lilian','POST',{action:'approve',revision:1})).code,400);
 for(const r of rows)r.days=['A','A','A','A','A','A','D'];
 rows[1].fullTime=true;rows[1].discount=100;rows[1].reason='Anticipo';
 assert.equal((await call('lilian','POST',{rows,revision:0})).code,409);
 assert.equal((await call('lilian','POST',{rows,revision:1})).code,200);
 assert.equal((await call('lilian','POST',{action:'approve',revision:2})).code,400);
 assert.equal((await call('lilian','POST',{action:'ready',revision:2})).code,200);
 assert.equal((await call('lilian','POST',{action:'approve',revision:3})).code,200);
 result=await call('lilian');assert.equal(result.data.approvedBy,'LILIAN');assert.equal(result.data.rows[1].discount,100);
 assert.equal((await call('lilian','POST',{rows,revision:4})).code,409);
 assert.equal((await call('nancy','POST',{action:'reopen',revision:4})).code,403);
 assert.equal((await call('lilian','POST',{action:'reopen',revision:4})).code,200);
 const malicious=structuredClone(rows);malicious[0].id=2;
 assert.equal((await call('lilian','POST',{rows:malicious,revision:5})).code,400);
 assert.equal((await call('lilian','POST',{rows,revision:5},{headers:{host:'localhost',origin:'https://example.com','content-type':'application/json'}})).code,403);
 assert.equal((await call('nancy','POST',{action:'attendance',revision:5,employeeId:1,day:0,status:'F'})).code,200);
 result=await call('lilian');assert.equal(result.data.rows[0].days[0],'F');assert.equal(result.data.rows[1].discount,100);
 assert.equal((await call('nancy','POST',{action:'attendance',revision:6,employeeId:2,fullTime:true})).code,200);
 assert.equal((await call('lilian','POST',{action:'adjustment',revision:7,employeeId:1,bonus:900,discount:50,reason:'Anticipo'})).code,200);
 assert.equal((await call('lilian','POST',{action:'ready',revision:8})).code,200);
 assert.equal((await call('lilian')).data.readyBy,'LILIAN');
 assert.equal((await call('lilian','POST',{action:'approve',revision:9})).code,200);
 marks.splice(0,marks.length,...people.flatMap(({id})=>Array.from({length:6},(_,day)=>({employee_id:id,day}))));
 const query={query:{week:'2026-11-16'}};
 assert.equal((await call('nancy','POST',{action:'attendance',revision:0,employeeId:2,day:6,status:'D',fullTime:true},query)).code,200);
 assert.equal((await call('nancy','POST',{action:'attendance',revision:1,employeeId:1,day:6,status:'D'},query)).code,200);
 assert.equal((await call('lilian','POST',{action:'ready',revision:2},query)).code,200);
 result=await call('lilian','GET',undefined,query);assert.equal(result.data.rows[0].days.filter(d=>d==='A').length,6);
});
