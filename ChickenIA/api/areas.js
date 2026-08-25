// api/areas.js — áreas + actividades para un tipo de ubicación (tienda | moto)
const { ensureTables } = require('./lib/db');

module.exports = async (req, res) => {
  try {
    const sql = await ensureTables();
    const locationType = req.query.location_type || 'tienda';

    const areas = await sql`
      SELECT id, code, name, order_index FROM areas
      WHERE location_type = ${locationType} AND active = true
      ORDER BY order_index
    `;
    const activities = await sql`
      SELECT a.id, a.area_id, a.name, a.criticality, a.weight, a.requires_quantity, a.unit, a.order_index
      FROM activities a
      JOIN areas ar ON ar.id = a.area_id
      WHERE ar.location_type = ${locationType} AND a.active = true
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
