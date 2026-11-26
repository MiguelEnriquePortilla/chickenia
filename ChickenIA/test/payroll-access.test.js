const {test}=require('node:test');
const assert=require('node:assert/strict');
const auth=require('../lib/inventory-auth');
const {createHandler}=require('../api/payroll');

test('la nómina rechaza sesiones sin verificar antes de consultar datos',async()=>{
 process.env.INVENTORY_SESSION_SECRET='payroll-isolated-test-secret-32-chars';
 process.env.INVENTORY_USERS_JSON='[]';
 const handler=createHandler({load:async()=>assert.fail('La solicitud no debe consultar datos')});
 for(const name of ['nancy','miguel','ana','lilian']){
  const {token}=await auth.login({body:{username:name}});
  for(const [method,query,body] of [
   ['GET',{week:'2026-11-09'}],
   ['POST',{week:'2026-11-09',view:'attendance'},{action:'adjustment'}]
  ]){
   const req={method,query,body,headers:{cookie:'chickenia_inventory='+token,'content-type':'application/json'}};
   let code;
   await handler(req,{setHeader(){},status(value){code=value;return this;},json(){}});
   assert.equal(code,name==='lilian'?401:403);
  }
 }
});
