// api/attendance.js — asistencia diaria por empleado: entrada, comida-salida,
// comida-regreso, salida. Cada evento se marca en el momento (hora del servidor,
// nunca escrita a mano) — decisión de Miguel, misma filosofía que activity_checks.
const { ensureTables } = require('./lib/db');

const EVENT_COLUMNS = ['entrada', 'comida_salida', 'comida_regreso', 'salida'];

module.exports = async (req, res) => {
  try {
    const sql = await ensureTables();

    if (req.method === 'GET') {
      const { location_id, date } = req.query;
      if (!location_id || !date) {
        return res.status(400).json({ error: 'location_id y date son requeridos' });
      }
      const rows = await sql`
        SELECT employee_id, entrada, comida_salida, comida_regreso, salida, recorded_by
        FROM attendance_checks
        WHERE location_id = ${location_id} AND check_date = ${date}
      `;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { employee_id, location_id, check_date, event, checked_by } = req.body || {};
      if (!employee_id || !location_id || !check_date || !event || !checked_by) {
        return res.status(400).json({ error: 'employee_id, location_id, check_date, event y checked_by son requeridos' });
      }
      if (!EVENT_COLUMNS.includes(event)) {
        return res.status(400).json({ error: 'event inválido' });
      }

      const RETURNING = 'employee_id, entrada, comida_salida, comida_regreso, salida, recorded_by';
      let rows;
      if (event === 'entrada') {
        rows = await sql`
          INSERT INTO attendance_checks (employee_id, location_id, check_date, entrada, recorded_by)
          VALUES (${employee_id}, ${location_id}, ${check_date}, now(), ${checked_by})
          ON CONFLICT (employee_id, location_id, check_date)
          DO UPDATE SET entrada = now(), recorded_by = EXCLUDED.recorded_by
          RETURNING employee_id, entrada, comida_salida, comida_regreso, salida, recorded_by
        `;
      } else if (event === 'comida_salida') {
        rows = await sql`
          INSERT INTO attendance_checks (employee_id, location_id, check_date, comida_salida, recorded_by)
          VALUES (${employee_id}, ${location_id}, ${check_date}, now(), ${checked_by})
          ON CONFLICT (employee_id, location_id, check_date)
          DO UPDATE SET comida_salida = now(), recorded_by = EXCLUDED.recorded_by
          RETURNING employee_id, entrada, comida_salida, comida_regreso, salida, recorded_by
        `;
      } else if (event === 'comida_regreso') {
        rows = await sql`
          INSERT INTO attendance_checks (employee_id, location_id, check_date, comida_regreso, recorded_by)
          VALUES (${employee_id}, ${location_id}, ${check_date}, now(), ${checked_by})
          ON CONFLICT (employee_id, location_id, check_date)
          DO UPDATE SET comida_regreso = now(), recorded_by = EXCLUDED.recorded_by
          RETURNING employee_id, entrada, comida_salida, comida_regreso, salida, recorded_by
        `;
      } else {
        rows = await sql`
          INSERT INTO attendance_checks (employee_id, location_id, check_date, salida, recorded_by)
          VALUES (${employee_id}, ${location_id}, ${check_date}, now(), ${checked_by})
          ON CONFLICT (employee_id, location_id, check_date)
          DO UPDATE SET salida = now(), recorded_by = EXCLUDED.recorded_by
          RETURNING employee_id, entrada, comida_salida, comida_regreso, salida, recorded_by
        `;
      }
      return res.status(200).json(rows[0]);
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
