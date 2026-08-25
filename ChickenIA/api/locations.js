// api/locations.js — lista de ubicaciones activas (sucursal + unidades móviles)
const { ensureTables } = require('./lib/db');

module.exports = async (req, res) => {
  try {
    const sql = await ensureTables();
    const rows = await sql`SELECT id, code, name, type FROM locations WHERE active = true ORDER BY type, code`;
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
