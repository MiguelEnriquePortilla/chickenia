'use strict';
const { authorized, currentCut, CUTS, report, message, sendTelegram } = require('./telegram');
const { ensureTables } = require('./db');

// No browser-facing credentials. Scheduler calls this with Authorization: Bearer.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const cron = req.query?.action === 'cron';
  if (!authorized(req.headers?.authorization, cron ? process.env.CRON_SECRET : process.env.SUPERVISION_NOTIFY_SECRET)) return res.status(401).json({ error: 'No autorizado' });
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Método no permitido' });
  const action = cron ? 'dispatch' : req.query?.action || 'preview';
  if (!['preview', 'test', 'dispatch'].includes(action)) return res.status(400).json({ error: 'Acción inválida' });
  if (cron && req.method !== 'GET') return res.status(405).json({ error: 'El programador usa GET' });
  if (!cron && action !== 'preview' && req.method !== 'POST') return res.status(405).json({ error: 'Usa POST para enviar' });
  try {
    if (action === 'test') {
      const id = await sendTelegram('ChickenIA: conexión de prueba con Supervisión diaria. Los avisos programados todavía requieren activación.');
      return res.status(200).json({ ok: true, message_id: id });
    }
    const now = new Date();
    const { date, cut: due } = currentCut(now);
    const cut = action === 'preview' ? CUTS.find(c => c.id === req.query?.cut) || due || CUTS[0] : due;
    if (!cut) return res.status(200).json({ skipped: 'Fuera de la ventana de cinco minutos del corte' });
    if (action === 'dispatch' && process.env.SUPERVISION_NOTIFY_ENABLED !== 'true') return res.status(503).json({ error: 'Avisos desactivados' });
    if (action === 'dispatch' && (!process.env.TELEGRAM_BOT_TOKEN || !/^-\d+$/.test(process.env.TELEGRAM_CHAT_ID || ''))) return res.status(503).json({ error: 'Telegram sin configurar' });
    const locationId = Number(process.env.SUPERVISION_LOCATION_ID);
    if (!Number.isSafeInteger(locationId) || locationId < 1) return res.status(503).json({ error: 'Falta configurar la sucursal' });
    const sql = await ensureTables();
    const [location] = await sql`SELECT id, name, type FROM locations WHERE id=${locationId}`;
    if (!location || location.type !== 'tienda') return res.status(503).json({ error: 'Sucursal no válida' });
    // One statement provides a consistent catalogue/check snapshot.
    const rows = await sql`
      SELECT a.id, ar.name AS area_name, a.weight, a.criticality, a.routine_block, COALESCE(c.done,false) AS done
      FROM activities a JOIN areas ar ON ar.id=a.area_id
      LEFT JOIN activity_checks c ON c.activity_id=a.id AND c.location_id=${locationId} AND c.check_date=${date}::date
      WHERE ar.location_type=${location.type} AND ar.active=true AND a.active=true
        AND (a.frequency <> 'weekly' OR EXISTS (SELECT 1 FROM kitchen_plans kp WHERE kp.activity_id=a.id AND kp.plan_date=${date}::date))
        AND (a.valid_from IS NULL OR a.valid_from <= ${date}::date)
        AND (a.valid_until IS NULL OR a.valid_until > ${date}::date)
      ORDER BY ar.order_index, a.order_index`;
    const snapshot = report(rows, cut, date, location.name, now.toISOString());
    const text = message(snapshot);
    if (action === 'preview') return res.status(200).json({ preview: true, snapshot, text });
    await sql`CREATE TABLE IF NOT EXISTS supervision_telegram_deliveries (
      id BIGSERIAL PRIMARY KEY, location_id INT NOT NULL REFERENCES locations(id), report_date DATE NOT NULL,
      checkpoint TEXT NOT NULL, snapshot JSONB NOT NULL, chat_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'sending', message_id BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(location_id,report_date,checkpoint))`;
    const claimed = await sql`INSERT INTO supervision_telegram_deliveries(location_id,report_date,checkpoint,snapshot,chat_id)
      VALUES(${locationId},${date}::date,${cut.id},${JSON.stringify(snapshot)}::jsonb,${process.env.TELEGRAM_CHAT_ID})
      ON CONFLICT(location_id,report_date,checkpoint) DO NOTHING RETURNING id`;
    if (!claimed.length) return res.status(200).json({ skipped: 'Corte ya registrado; no se repite el envío' });
    try {
      const id = await sendTelegram(text);
      await sql`UPDATE supervision_telegram_deliveries SET status='sent',message_id=${id} WHERE id=${claimed[0].id}`;
      return res.status(200).json({ ok: true, checkpoint: cut.id, message_id: id });
    } catch {
      // Telegram has no idempotency key: never blindly resend an ambiguous result.
      await sql`UPDATE supervision_telegram_deliveries SET status='unknown' WHERE id=${claimed[0].id}`;
      return res.status(502).json({ error: 'Envío sin confirmar. Revisar el grupo y el registro antes de reintentar.' });
    }
  } catch {
    return res.status(500).json({ error: 'No se pudo preparar o completar el reporte de supervisión' });
  }
};
