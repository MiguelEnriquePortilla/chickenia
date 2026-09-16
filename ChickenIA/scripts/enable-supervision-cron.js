'use strict';
// Run only after upgrading the existing Vercel team to Pro.
// Keep SUPERVISION_NOTIFY_ENABLED=false until credentials and preview are verified.
const fs=require('node:fs');
const path=require('node:path');
if (!process.argv.includes('--pro-confirmed')) {
  console.error('Primero confirma Vercel Pro; después ejecuta con --pro-confirmed.');
  process.exitCode=1;
} else {
  const file=path.join(__dirname,'..','vercel.json');
  const config=JSON.parse(fs.readFileSync(file,'utf8'));
  const endpoint='/api/supervision-telegram?action=cron';
  config.crons=[...(config.crons||[]).filter(c=>c.path!==endpoint),
    ...['30 15 * * *','0 18 * * *','0 23 * * *','0 1 * * *'].map(schedule=>({path:endpoint,schedule}))];
  fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n');
  console.log('Cuatro horarios preparados en vercel.json. Configura CRON_SECRET, activa los avisos y publica el cambio.');
}
