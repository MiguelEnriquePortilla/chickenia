// api/areas.js — áreas + actividades para un tipo de ubicación (tienda | moto)
const { ensureTables } = require('./lib/db');

module.exports = async (req, res) => {
  try {
    const sql = await ensureTables();
    const date = req.query.date || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
    const locationType = req.query.location_type || 'tienda';

    const areas = await sql`
      SELECT id, code, name, order_index FROM areas
      WHERE location_type = ${locationType} AND active = true
      ORDER BY order_index
    `;
    const activities = await sql`
      SELECT a.id, a.area_id, a.name, a.criticality, a.weight, a.requires_quantity, a.unit,
        a.indicator_type, a.target, a.routine_block, a.order_index
      FROM activities a
      JOIN areas ar ON ar.id = a.area_id
      WHERE ar.location_type = ${locationType} AND a.active = true
        AND (a.valid_from IS NULL OR a.valid_from <= ${date}::date)
        AND (a.valid_until IS NULL OR a.valid_until > ${date}::date)
      ORDER BY a.area_id, a.order_index
    `;

    const byArea = {};
    for (const act of activities) {
      if (!byArea[act.area_id]) byArea[act.area_id] = [];
      byArea[act.area_id].push(act);
    }
    const result = areas.map((a) => ({ ...a, activities: byArea[a.id] || [] }));
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
