// api/employees.js — catálogo de empleados para Asistencia
const { ensureTables } = require('./lib/db');

module.exports = async (req, res) => {
  try {
    const sql = await ensureTables();
    const rows = await sql`SELECT id, name, order_index FROM employees WHERE active = true ORDER BY order_index`;
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
