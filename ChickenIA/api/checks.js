// api/checks.js — lectura/escritura de checks de actividad (verificados por el supervisor)
const { ensureTables } = require('../lib/supervision/db');
const chicken=require('../lib/chicken-units');

module.exports = async (req, res) => {
  try {
    const sql = await ensureTables();

    if (req.method === 'GET') {
      const { location_id, date } = req.query;
      if (!location_id || !date) {
        return res.status(400).json({ error: 'location_id y date son requeridos' });
      }
      const rows = await sql`
        SELECT activity_id, done, quantity, quality_score, notes, checked_by, checked_at,closure,a.name,a.unit
        FROM activity_checks JOIN activities a ON a.id=activity_id
        WHERE location_id = ${location_id} AND check_date = ${date}
      `;
      return res.status(200).json(rows.map(r=>chicken.check(r,r)));
    }

    if (req.method === 'POST') {
      const { activity_id, location_id, check_date, done, quantity, quality_score, notes, checked_by } = req.body || {};
      if (!activity_id || !location_id || !check_date || !checked_by) {
        return res.status(400).json({ error: 'activity_id, location_id, check_date y checked_by son requeridos' });
      }
      const valid = await sql`SELECT id,name,requires_quantity,unit,measurement,(SELECT code FROM areas WHERE areas.id=activities.area_id) AS area_code FROM activities WHERE id = ${activity_id} AND active = true
        AND (frequency <> 'weekly' OR EXISTS (SELECT 1 FROM kitchen_plans kp WHERE kp.activity_id=activities.id AND kp.plan_date=${check_date}::date))
        AND (valid_from IS NULL OR valid_from <= ${check_date}::date)
        AND (valid_until IS NULL OR valid_until > ${check_date}::date)`;
      if (!valid.length) return res.status(409).json({ error: 'El catálogo cambió para esta fecha. Recarga las actividades antes de capturar.' });
      let closure=null;
      try {
        let authorizer;
        if(valid[0].measurement==='bar-close'){
          authorizer=require('../lib/inventory-auth').authenticate(req);
          let origin;try{origin=new URL(req.headers.origin);}catch{}
          if(!origin||origin.host!==req.headers.host||req.headers['sec-fetch-site']==='cross-site')return res.status(403).json({error:'Origen no permitido.'});
        }
        closure=require('../lib/supervision/measurement').validate(valid[0],req.body,authorizer);
      }catch(e){return res.status(e.status||400).json({error:e.message});}
      let storedQuantity=quantity;
      if(chicken.isChicken(valid[0])){
        if(req.body.quantity_unit!=='pollos')return res.status(409).json({error:'La captura de pollo cambió a pollos. Recarga la pantalla antes de guardar.'});
        if(quantity!=null){try{const pieces=chicken.toPieces(quantity);storedQuantity=chicken.legacyActivity(valid[0])?pieces:quantity;}catch(e){return res.status(400).json({error:e.message});}}
        else if(done&&valid[0].requires_quantity)return res.status(400).json({error:'Captura cuántos pollos hay antes de marcar la actividad.'});
      }
      if(['cocina','freidoras'].includes(valid[0].area_code)&&valid[0].requires_quantity&&done&&(typeof quantity!=='number'||!Number.isFinite(quantity)||quantity<0))return res.status(400).json({error:'Captura los kg obtenidos antes de marcar la preparación.'});
      const rows = await sql`
        INSERT INTO activity_checks (activity_id, location_id, check_date, done, quantity, quality_score, notes, checked_by, checked_at, closure)
        VALUES (${activity_id}, ${location_id}, ${check_date}, ${!!done}, ${storedQuantity ?? null}, ${quality_score ?? null}, ${notes ?? null}, ${checked_by}, now(), ${closure?JSON.stringify(closure):null}::jsonb)
        ON CONFLICT (activity_id, location_id, check_date)
        DO UPDATE SET done = EXCLUDED.done, quantity = EXCLUDED.quantity, quality_score = EXCLUDED.quality_score,
          notes = EXCLUDED.notes, checked_by = EXCLUDED.checked_by, checked_at = now(), closure=EXCLUDED.closure
        RETURNING activity_id, done, quantity, quality_score, notes, checked_by, checked_at, closure
      `;
      return res.status(200).json(chicken.check(rows[0],valid[0]));
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
