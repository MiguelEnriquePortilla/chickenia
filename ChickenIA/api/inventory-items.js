// api/inventory-items.js — catálogo de inventario (~30 SKUs)
const { ensureTables } = require('./lib/db');

module.exports = async (req, res) => {
  try {
    const sql = await ensureTables();
    const rows = await sql`SELECT id, sku, name, category, unit FROM inventory_items WHERE active = true ORDER BY category, name`;
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
