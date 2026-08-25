// api/checks.js — lectura/escritura de checks de actividad (verificados por el supervisor)
const { ensureTables } = require('./lib/db');

module.exports = async (req, res) => {
  try {
    const sql = await ensureTables();

    if (req.method === 'GET') {
      const { location_id, date } = req.query;
      if (!location_id || !date) {
        return res.status(400).json({ error: 'location_id y date son requeridos' });
      }
      const rows = await sql`
        SELECT activity_id, done, quantity, quality_score, notes, checked_by, checked_at
        FROM activity_checks
        WHERE location_id = ${location_id} AND check_date = ${date}
      `;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { activity_id, location_id, check_date, done, quantity, quality_score, notes, checked_by } = req.body || {};
      if (!activity_id || !location_id || !check_date || !checked_by) {
        return res.status(400).json({ error: 'activity_id, location_id, check_date y checked_by son requeridos' });
      }
      const rows = await sql`
        INSERT INTO activity_checks (activity_id, location_id, check_date, done, quantity, quality_score, notes, checked_by, checked_at)
        VALUES (${activity_id}, ${location_id}, ${check_date}, ${!!done}, ${quantity ?? null}, ${quality_score ?? null}, ${notes ?? null}, ${checked_by}, now())
        ON CONFLICT (activity_id, location_id, check_date)
        DO UPDATE SET done = EXCLUDED.done, quantity = EXCLUDED.quantity, quality_score = EXCLUDED.quality_score,
          notes = EXCLUDED.notes, checked_by = EXCLUDED.checked_by, checked_at = now()
        RETURNING activity_id, done, quantity, quality_score, notes, checked_by, checked_at
      `;
      return res.status(200).json(rows[0]);
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
