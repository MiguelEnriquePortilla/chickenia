// api/inventory-movements.js — movimientos de inventario (recepción, venta, merma, conteo)
const { ensureTables } = require('./lib/db');

module.exports = async (req, res) => {
  try {
    const sql = await ensureTables();

    if (req.method === 'GET') {
      const { location_id, date } = req.query;
      let rows;
      if (location_id && date) {
        rows = await sql`
          SELECT m.id, m.item_id, i.name AS item_name, i.unit, m.location_id, m.movement_type, m.quantity, m.movement_date, m.notes, m.recorded_by, m.recorded_at
          FROM inventory_movements m JOIN inventory_items i ON i.id = m.item_id
          WHERE m.location_id = ${location_id} AND m.movement_date = ${date}
          ORDER BY m.recorded_at DESC
        `;
      } else {
        rows = await sql`
          SELECT m.id, m.item_id, i.name AS item_name, i.unit, m.location_id, m.movement_type, m.quantity, m.movement_date, m.notes, m.recorded_by, m.recorded_at
          FROM inventory_movements m JOIN inventory_items i ON i.id = m.item_id
          ORDER BY m.recorded_at DESC LIMIT 200
        `;
      }
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { item_id, location_id, movement_type, quantity, movement_date, notes, recorded_by } = req.body || {};
      if (!item_id || !location_id || !movement_type || quantity == null || !movement_date || !recorded_by) {
        return res.status(400).json({ error: 'item_id, location_id, movement_type, quantity, movement_date y recorded_by son requeridos' });
      }
      const rows = await sql`
        INSERT INTO inventory_movements (item_id, location_id, movement_type, quantity, movement_date, notes, recorded_by)
        VALUES (${item_id}, ${location_id}, ${movement_type}, ${quantity}, ${movement_date}, ${notes ?? null}, ${recorded_by})
        RETURNING *
      `;
      return res.status(200).json(rows[0]);
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
