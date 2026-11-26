'use strict';
const sheets=require('./google-sheets');
const {SEED_EMPLOYEES}=require('./supervision/db');

const workbook='1YdwszFfzWVH5N_Tp6g4jkBc-y4pguoJfOzPfz0AVFQo';
const live={name:'Semanas',id:1686503279};
const sandbox={name:'Pruebas',id:2602};
const people=SEED_EMPLOYEES.map((name,index)=>({id:index+1,name}));

function createStore(call=sheets.bind(null,workbook)){
 async function load(week,test){
  const tab=test?sandbox:live;
  const result=await call('/values/'+encodeURIComponent(tab.name+'!A2:F'));
  let existing;
  for(const [date,revision,,,,json] of result.values||[]){
   if(date!==week||!json||Number(revision)<=(existing?.revision||0))continue;
   existing=JSON.parse(json);
  }
  return {existing,people};
 }

 async function save(record,test){
  const tab=test?sandbox:live;
  const name='chicania_payroll_'+tab.id+'_'+record.week.replaceAll('-','_')+'_v'+record.revision;
  const range={sheetId:tab.id,startRowIndex:0,endRowIndex:1,startColumnIndex:0,endColumnIndex:1};
  const values=[record.week,record.revision,record.action,record.updated_by,record.updated_at,JSON.stringify(record)]
   .map(value=>({userEnteredValue:{stringValue:String(value)}}));
  try{
   await call(':batchUpdate',{requests:[
    {addNamedRange:{namedRange:{name,range}}},
    {appendCells:{sheetId:tab.id,rows:[{values}],fields:'userEnteredValue'}}
   ]});
   return true;
  }catch(error){
   if(error.http===400){
    const {existing}=await load(record.week,test);
    if(existing?.revision>=record.revision)return false;
   }
   throw error;
  }
 }

 return {load,save};
}
module.exports={createStore};
