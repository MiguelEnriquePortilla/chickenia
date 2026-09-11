'use strict';
const auth = require('../lib/inventory-auth');
const { today, InventoryError } = require('../lib/inventory-domain');
function createHandler(getSql = require('./lib/db').ensureTables) {
  return async (req,res) => {
    res.setHeader('Cache-Control','no-store');
    try {
      const user = auth.authenticate(req);
      if (!['GET','POST'].includes(req.method)) throw new InventoryError('Método no permitido.',405);
      if (req.method==='POST') {
        if (!['manager','kitchen'].includes(user.role)) throw new InventoryError('Sin permiso para programar cocina.',403);
        if (!String(req.headers['content-type']||'').startsWith('application/json') || req.headers['sec-fetch-site']==='cross-site' || (req.headers.origin && new URL(req.headers.origin).host!==req.headers.host)) throw new InventoryError('Origen o formato no permitido.',403);
      }
      const date = req.method==='GET' ? req.query.date || today(new Date()) : req.body?.date;
      if (typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date) throw new InventoryError('Fecha inválida.');
      const sql=await getSql();
      if(req.method==='POST') {
        const {activity_id,kg}=req.body;
        if(date<today(new Date()))throw new InventoryError('No se modifica la programación de días anteriores.');
        if(!Number.isInteger(activity_id)||typeof kg!=='number'||!Number.isFinite(kg)||kg<0||kg>1000000||Math.abs(kg*1000-Math.round(kg*1000))>1e-6)throw new InventoryError('Captura kg válidos, hasta tres decimales.');
        const acts=await sql`SELECT a.id FROM activities a JOIN areas ar ON ar.id=a.area_id WHERE a.id=${activity_id} AND ar.code='cocina' AND a.active=true AND a.requires_quantity=true AND (a.valid_from IS NULL OR a.valid_from<=${date}::date) AND (a.valid_until IS NULL OR a.valid_until>${date}::date)`;
        if(!acts.length)throw new InventoryError('Actividad no disponible para esta fecha.');
        const checked=await sql`SELECT 1 FROM activity_checks WHERE activity_id=${activity_id} AND check_date=${date}::date LIMIT 1`;
        if(checked.length)throw new InventoryError('Esta actividad ya tiene captura; conserva la programación registrada.',409);
        if(kg===0)await sql`DELETE FROM kitchen_plans WHERE activity_id=${activity_id} AND plan_date=${date}::date`;
        else await sql`INSERT INTO kitchen_plans(activity_id,plan_date,kg,scheduled_by) VALUES(${activity_id},${date}::date,${kg},${user.name}) ON CONFLICT(activity_id,plan_date) DO UPDATE SET kg=EXCLUDED.kg,scheduled_by=EXCLUDED.scheduled_by,updated_at=now()`;
        return res.status(200).json({ok:true});
      }
      const rows=await sql`SELECT a.id,a.name,a.frequency,a.unit,kp.kg,kp.scheduled_by FROM activities a JOIN areas ar ON ar.id=a.area_id LEFT JOIN kitchen_plans kp ON kp.activity_id=a.id AND kp.plan_date=${date}::date WHERE ar.code='cocina' AND a.active=true AND a.requires_quantity=true AND (a.valid_from IS NULL OR a.valid_from<=${date}::date) AND (a.valid_until IS NULL OR a.valid_until>${date}::date) ORDER BY a.order_index`;
      res.status(200).json({date,activities:rows});
    }catch(e){res.status(e.status||500).json({error:e.status?e.message:'No se pudo consultar o guardar la programación.'});}
  };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
