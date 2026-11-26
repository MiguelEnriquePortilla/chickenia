'use strict';
const {sign}=require('node:crypto');

const tokenUrl='https://oauth2.googleapis.com/token';
const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
let cached;

async function googleToken(){
 if(cached?.expires>Date.now())return cached.value;
 const {client_email,private_key}=JSON.parse(process.env.SUPERVISION_GOOGLE_SERVICE_ACCOUNT_JSON);
 const now=Math.floor(Date.now()/1000);
 const assertion=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:tokenUrl,iat:now,exp:now+3600});
 const body=new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:assertion+'.'+sign('RSA-SHA256',Buffer.from(assertion),private_key).toString('base64url')});
 const response=await fetch(tokenUrl,{method:'POST',body,signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error('Google token HTTP '+response.status);
 const data=await response.json();
 cached={value:data.access_token,expires:Date.now()+(data.expires_in-60)*1000};
 return cached.value;
}

async function sheets(spreadsheetId,path,body){
 const response=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+spreadsheetId+path,{
  headers:{Authorization:'Bearer '+await googleToken(),...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{method:'POST',body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)
 });
 if(!response.ok){
  const error=new Error('Sheets HTTP '+response.status);
  error.http=response.status;
  throw error;
 }
 return response.json();
}
module.exports=sheets;
