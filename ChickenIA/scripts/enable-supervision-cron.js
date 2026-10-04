'use strict';
// Four daily controls, America/Mexico_City (UTC-6).
// Keep SUPERVISION_NOTIFY_ENABLED=false until credentials and preview are verified.
const fs=require('node:fs');
const path=require('node:path');
if (!process.argv.includes('--pro-confirmed') && !process.argv.includes('--allow-hobby-delay')) {
  console.error('Confirma Pro con --pro-confirmed o acepta el retraso de Hobby con --allow-hobby-delay.');
  process.exitCode=1;
} else {
  const file=path.join(__dirname,'..','vercel.json');
  const config=JSON.parse(fs.readFileSync(file,'utf8'));
  const endpoint='/api/supervision-telegram?action=cron';
  config.crons=[...(config.crons||[]).filter(c=>!c.path.startsWith(endpoint)),
    ...[['apertura','30 15 * * *'],['comida','0 18 * * *'],['ajuste','0 22 * * *'],['cierre','0 1 * * *']].map(([cut,schedule])=>({path:endpoint+'&cut='+cut,schedule}))];
  fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n');
  console.log('Cuatro horarios preparados en vercel.json: 09:30, 12:00, 16:00 y 19:00 CDMX.');
}
