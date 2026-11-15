const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const auth=require('../lib/inventory-auth');
const {createHandler}=require('../api/payroll');
test('hoja persistente, asistencia, bloqueo por pendientes y autorización de Lilian',async()=>{
 process.env.INVENTORY_SESSION_SECRET='payroll-isolated-test-secret-32-chars';
 process.env.INVENTORY_USERS_JSON='[]';
 const db=new PGlite();
 try{
 await db.exec(`CREATE TABLE employees(id integer PRIMARY KEY,name text,active boolean,order_index integer);INSERT INTO employees VALUES(1,'Nancy Rentería',true,1),(2,'Petra Estrada',true,2);CREATE TABLE locations(id integer PRIMARY KEY,code text);INSERT INTO locations VALUES(1,'jojutla');CREATE TABLE attendance_checks(employee_id integer,location_id integer,check_date date,entrada timestamptz);INSERT INTO attendance_checks VALUES(1,1,'2026-11-09',now());`);
 const handler=createHandler(async(s,p)=>(await db.query(s,p)).rows);
 async function call(name,method='GET',body,extra={}){
  const req={method,query:{week:'2026-11-09'},headers:{host:'localhost','content-type':'application/json'},body,...extra};
  if(name){const login=await auth.login({body:{username:name}});req.headers.cookie=auth.cookie(login.token,req)[1].split(';')[0];}
  let code=200,data;const res={setHeader(){},status(c){code=c;return this;},json(d){data=d;}};await handler(req,res);return {code,data};
 }
 assert.equal((await call(null)).code,401);
 let result=await call('nancy');assert.equal(result.code,200);assert.equal(result.data.rows[0].days[0],'A');assert.equal(result.data.rows[0].bonus,1000);
 const rows=result.data.rows;
 result=await call('nancy','POST',{rows,revision:0});assert.equal(result.code,200);
 await db.exec(`INSERT INTO attendance_checks VALUES(1,1,'2026-11-10',now());`);
 result=await call('nancy');assert.equal(result.data.rows[0].days[1],'A');assert.equal(result.data.suggested,true);
 assert.equal((await call('nancy','POST',{action:'approve',revision:1})).code,403);
 assert.equal((await call('lilian','POST',{action:'approve',revision:1})).code,400);
 for(const r of rows)r.days=['A','A','A','A','A','A','D'];
 rows[1].fullTime=true;rows[1].discount=100;rows[1].reason='Anticipo';
 assert.equal((await call('nancy','POST',{rows,revision:0})).code,409);
 assert.equal((await call('nancy','POST',{rows,revision:1})).code,200);
 assert.equal((await call('lilian','POST',{action:'approve',revision:2})).code,200);
 result=await call('nancy');assert.equal(result.data.approvedBy,'LILIAN');assert.equal(result.data.rows[1].discount,100);
 assert.equal((await call('nancy','POST',{rows,revision:3})).code,409);
 assert.equal((await call('nancy','POST',{action:'reopen',revision:3})).code,403);
 assert.equal((await call('lilian','POST',{action:'reopen',revision:3})).code,200);
 const malicious=structuredClone(rows);malicious[0].id=2;
 assert.equal((await call('nancy','POST',{rows:malicious,revision:4})).code,400);
 assert.equal((await call('nancy','POST',{rows,revision:4},{headers:{host:'localhost',origin:'https://example.com','content-type':'application/json'}})).code,403);
 }finally{await db.close();}
});
